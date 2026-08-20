import OpenAI from "openai";
import { NextResponse } from "next/server";

const hf = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

type VisualStep = {
  step: number;
  title: string;
  searchQuery: string;
};

type ImageResult = {
  position?: number;
  title?: string;
  thumbnail?: string;
  original?: string;
  serpapi_thumbnail?: string;
  source?: string;
  link?: string;
};

function cleanJson(text: string): string {
  let result = text.trim();

  result = result.replace(/^```json\s*/i, "");
  result = result.replace(/^```\s*/i, "");
  result = result.replace(/\s*```$/i, "");

  const firstBrace = result.indexOf("{");
  const lastBrace = result.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    result = result.substring(firstBrace, lastBrace + 1);
  }

  return result.trim();
}

function extractTransaction(answer: string): string {
  const match = answer.match(/T[-\s]?code\s*[:=-]\s*([A-Z0-9/]+)/i);

  if (match?.[1]) {
    return match[1].toUpperCase();
  }

  const fallback = answer.match(
    /\b(MM01|MM02|MM03|ME21N|ME22N|ME23N|MIGO|MIRO|ME51N|ME52N|ME53N|FB60|FB50|VA01|VA02|VA03|VL01N|VL02N|VL03N|VF01|VF02|VF03)\b/i
  );

  return fallback?.[1]?.toUpperCase() || "";
}

function fallbackSearchQuery(
  sapModule: string,
  transaction: string,
  title: string
): string {
  return ["SAP", sapModule, transaction, title, "SAP GUI", "screen", "screenshot"]
    .filter(Boolean)
    .join(" ");
}

/*
==================================================
IMAGE RELEVANCE FIX
==================================================

PURANI CODE (jo humne dekha) sirf pehli image le leta tha
jisme koi bhi image field (original/thumbnail) mojood ho -
bina ye check kiye ki image actually is SAP step se match
karti hai ya nahi. Isi wajah se galat images (jaise ABAP
debugger, unrelated tutorials) dikh rahi thi.

NAYA CODE:
1. Negative keywords wali images (debugger, source code,
   workbench, etc.) turant reject karta hai.
2. Har image ko score deta hai based on kitne keywords
   match hote hain query se.
3. Sirf tabhi image deta hai jab best score kam se kam
   MIN_ACCEPTABLE_SCORE ho, warna null return karta hai
   (matlab is step ke liye koi image nahi dikhegi - jo
   galat image dikhane se hamesha behtar hai).
*/

const MIN_ACCEPTABLE_SCORE = 5;

const NEGATIVE_KEYWORDS = [
  "debugger",
  "abap editor",
  "abap program",
  "source code",
  "class builder",
  "breakpoint",
  "watchpoint",
  "workbench",
  "developer",
];

function scoreImage(image: ImageResult, query: string): number {
  const combined = [image.title || "", image.source || "", image.link || ""]
    .join(" ")
    .toLowerCase();

  if (NEGATIVE_KEYWORDS.some((kw) => combined.includes(kw))) {
    return -100;
  }

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && w !== "screenshot" && w !== "screen");

  let score = 0;

  for (const word of queryWords) {
    if (combined.includes(word)) {
      score += 2;
    }
  }

  if (combined.includes("sap")) {
    score += 3;
  }

  if (image.original || image.thumbnail || image.serpapi_thumbnail) {
    score += 1;
  }

  return score;
}

async function searchGoogleImage(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.error("SERPAPI_KEY is missing from .env.local");
    return null;
  }

  try {
    const params = new URLSearchParams({
      engine: "google_images",
      q: query,
      api_key: apiKey,
      google_domain: "google.com",
      hl: "en",
      gl: "us",
      device: "desktop",
    });

    const url = "https://serpapi.com/search.json?" + params.toString();

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("SerpApi HTTP error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error("SerpApi error:", data.error);
      return null;
    }

    const images: ImageResult[] = data.images_results || [];

    if (!images.length) {
      console.log("No Google images found for:", query);
      return null;
    }

    // FIX: score every candidate image and reject bad matches,
    // instead of blindly taking the first one with an image field.
    let bestImage: ImageResult | null = null;
    let bestScore = -1;

    for (const image of images) {
      if (!(image.original || image.thumbnail || image.serpapi_thumbnail)) {
        continue;
      }

      const score = scoreImage(image, query);

      if (score > bestScore) {
        bestScore = score;
        bestImage = image;
      }
    }

    if (!bestImage || bestScore < MIN_ACCEPTABLE_SCORE) {
      console.log(
        "IMAGE REJECTED - best score too low:",
        bestScore,
        "for query:",
        query
      );
      return null;
    }

    return bestImage;
  } catch (error) {
    console.error("SerpApi image search error:", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.message || body.question || body.prompt || "";

    const sapModule = body.sapModule || "SAP";

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
    ==================================================
    AI ANSWER + EXACT VISUAL STEPS
    ==================================================
    */

    const response = await hf.responses.create({
      model: "openai/gpt-oss-120b:groq",

      instructions: `
You are HireSAP AI, a professional SAP How-To Assistant.

Selected SAP module:
${sapModule}

User question:
${message}

Your job is to create:

1. A simple and accurate SAP answer.
2. Exact visual steps for the important procedure steps.
3. A specific Google Images search query for every visual step.

==================================================
EXPLAIN LIKE A COMPLETE BEGINNER
==================================================

The reader has ZERO SAP background. Write so that even someone who
has never opened SAP GUI can follow along and do it themselves.

Rules:
- Use very short sentences. One idea per sentence.
- Before jumping into steps, add one line explaining WHAT this
  activity means in plain, everyday words (no SAP jargon).
- When you use a technical word for the first time (like "T-code",
  "G/L account", "posting"), explain it in 4-6 simple words right
  after it, in brackets.
- Avoid stacking multiple instructions in one sentence.
- Use everyday comparisons where it helps
  (example: "A journal entry is like writing in a diary that money
  moved from one account to another").
- Never assume the reader already knows what a screen, field, or
  button looks like - describe it.

==================================================
RETURN FORMAT
==================================================

Return ONLY valid JSON.

Do not return Markdown code fences.

Use exactly this structure:

{
  "answer": "T-code: MM01\\n\\n1. Enter Transaction - Open SAP GUI, type MM01 in the command field and press Enter.",
  "visualSteps": [
    {
      "step": 1,
      "title": "Enter Transaction",
      "searchQuery": "SAP MM01 Enter Transaction SAP GUI command field screen screenshot"
    }
  ]
}

==================================================
ANSWER FORMAT
==================================================

The answer MUST use simple plain text.

Do NOT use Markdown formatting.

Do NOT use:

**
*
backticks
Markdown bold
Markdown italic
Markdown code formatting
HTML

Do not use Markdown tables unless the user specifically asks for a table.

Do not write:

**T-code:** MM01

Write:

T-code: MM01

Do not write:

1. **Enter Transaction** - Open SAP GUI.

Write:

1. Enter Transaction - Open SAP GUI.

Use normal hyphens.

Use simple numbered steps.

==================================================
HOW-TO QUESTIONS
==================================================

When the user asks how to perform an SAP activity:

Start with:

T-code: XXXX

Then provide practical numbered steps.

Use approximately 6 to 10 steps when appropriate.

Every step must describe a real action.

Keep the answer simple and professional.

==================================================
EXAMPLE
==================================================

For:

How do I create a Material in SAP MM?

Use a structure similar to:

T-code: MM01

1. Enter Transaction - Open SAP GUI, type MM01 in the command field and press Enter.

2. Select Industry Sector, Material Type & Views - Choose the appropriate Industry Sector, Material Type and required Views such as Basic Data 1, Basic Data 2, Purchasing, Accounting and MRP. Click Enter.

3. Enter Basic Data 1 - Fill in the required fields:
   - Material Description
   - Base Unit of Measure
   - Material Group
   - Division

4. Enter Basic Data 2 - Enter additional information such as Gross Weight, Net Weight, Volume and Dimensions.

5. Maintain Purchasing View - Enter the required purchasing information:
   - Plant
   - Purchasing Group
   - Order Unit

6. Maintain Accounting View - Enter the required accounting information:
   - Valuation Class
   - Price Control
   - Standard Price

7. Maintain MRP Views - Enter the required MRP information:
   - MRP Type
   - Lot Size
   - MRP Controller
   - Safety Stock

8. Check the Data - Click Check and correct any errors displayed by SAP.

9. Save the Material - Click Save. SAP will create the material master record and display the material number.

==================================================
VISUAL STEP RULE
==================================================

This is very important.

The visual step title must closely match the exact step name used in the answer.

Example:

Answer:

1. Enter Transaction - Open SAP GUI and type MM01.

Visual step:

{
  "step": 1,
  "title": "Enter Transaction",
  "searchQuery": "SAP MM01 Enter Transaction SAP GUI command field screenshot"
}

Do not create generic titles such as:

MM01 Tutorial

SAP MM Tutorial

SAP Material Master

Instead use the actual step name.

==================================================
GOOGLE IMAGE SEARCH
==================================================

Every important procedure step should have its own image search.

The search query must be specific to the exact SAP screen.

Bad search:

SAP MM tutorial

Bad search:

SAP MM01 screenshot

Good search:

SAP MM01 Create Material initial screen Enter Transaction SAP GUI screenshot

Good search:

SAP MM01 Industry Sector Material Type Select Views SAP GUI screenshot

Good search:

SAP MM01 Basic Data 1 Material Description Base Unit Material Group SAP GUI screenshot

Good search:

SAP MM01 Basic Data 2 Gross Weight Net Weight Volume SAP GUI screenshot

Good search:

SAP MM01 Purchasing View Plant Purchasing Group Order Unit SAP GUI screenshot

Good search:

SAP MM01 Accounting View Valuation Class Price Control Standard Price SAP GUI screenshot

Good search:

SAP MM01 MRP View MRP Type Lot Size MRP Controller Safety Stock SAP GUI screenshot

Good search:

SAP MM01 Check Material Master SAP GUI screenshot

Good search:

SAP MM01 Save Material Master SAP GUI material number screenshot

==================================================
IMAGE ACCURACY
==================================================

The Google search query must contain the exact information needed to find the relevant SAP screen.

Include when applicable:

SAP
SAP module
Transaction code
Exact screen
Exact view
Important fields
SAP GUI
Screenshot

Do not search unrelated SAP transactions.

For example:

MM01 Accounting View should search for MM01 Accounting View.

Do not search for MIGO.

==================================================
NUMBER OF VISUALS
==================================================

Create visual steps for all important procedure steps.

If there are 6 important steps, create 6 visual steps.

If there are 7 important steps, create 7 visual steps.

If there are 8 important steps, create 8 visual steps.

If there are 9 important steps, create 9 visual steps.

Do not artificially limit the guide to 4 or 5 images.

==================================================
SIMPLE QUESTIONS
==================================================

For questions such as:

What is SAP MM?

Give a short definition.

Use:

"visualSteps": []

Do not search Google Images unless a visual is genuinely useful.

==================================================
T-CODE QUESTIONS
==================================================

If the user asks:

What is MM01?

Answer with the meaning of the transaction code.

Example:

T-code: MM01

MM01 is used to create a Material Master record in SAP.

Do not create unnecessary images.

==================================================
CONFIGURATION QUESTIONS
==================================================

For configuration questions:

Explain configuration separately from end-user processing.

Use simple numbered steps.

Do not invent an SPRO path.

If the exact configuration path depends on SAP version or customer configuration, clearly state that.

==================================================
TROUBLESHOOTING
==================================================

For troubleshooting questions:

1. Check the error.
2. Check master data.
3. Check configuration.
4. Check document data.
5. Apply the solution.

Keep it practical.

==================================================
SUPPORTED SAP MODULES
==================================================

SAP MM
SAP FICO
SAP SD
SAP PP
SAP ABAP
SAP HANA
SAP Basis
SAP EWM
SAP TM
SAP GTS
SAP WM
SAP SuccessFactors
SAP Concur
Other SAP modules when possible.

==================================================
ACCURACY
==================================================

Do not invent T-codes.

Do not invent SPRO paths.

Distinguish SAP ECC and SAP S/4HANA when relevant.

If a process depends on customer configuration, say so.

==================================================
FINAL CHECK
==================================================

Before returning JSON, verify:

1. The answer contains plain text.
2. No Markdown formatting is used.
3. No backticks are used.
4. T-code is written as plain text.
5. Numbered steps are clear.
6. Visual titles match the step names.
7. Google search queries match the exact SAP screens.
8. Every important visual step has a search query.
9. The JSON is valid.
`,

      input: message,
    });

    const rawOutput = response.output_text || "";

    /*
    ==================================================
    PARSE AI JSON
    ==================================================
    */

    let aiResult: {
      answer: string;
      visualSteps: VisualStep[];
    };

    try {
      const cleaned = cleanJson(rawOutput);

      aiResult = JSON.parse(cleaned);

      if (!aiResult.answer || typeof aiResult.answer !== "string") {
        throw new Error("AI did not return a valid answer.");
      }

      if (!Array.isArray(aiResult.visualSteps)) {
        aiResult.visualSteps = [];
      }
    } catch (error) {
      console.error("AI JSON PARSE ERROR:", error);

      console.error("RAW AI RESPONSE:", rawOutput);

      return NextResponse.json({
        success: true,

        answer: rawOutput || "Unable to generate an answer.",

        transaction: extractTransaction(rawOutput),

        visuals: [],

        visualSteps: [],

        visual: null,

        image: null,

        imageUrl: null,
      });
    }

    /*
    ==================================================
    TRANSACTION
    ==================================================
    */

    const transaction = extractTransaction(aiResult.answer);

    /*
    ==================================================
    CLEAN VISUAL STEPS
    ==================================================
    */

    const visualSteps = aiResult.visualSteps
      .filter(
        (item) =>
          item && typeof item.step === "number" && typeof item.title === "string"
      )
      .map((item) => ({
        step: item.step,

        title: item.title.trim(),

        searchQuery: (
          item.searchQuery || fallbackSearchQuery(sapModule, transaction, item.title)
        ).trim(),
      }));

    console.log("AI VISUAL STEPS:", visualSteps);

    /*
    ==================================================
    SEARCH GOOGLE IMAGES
    ==================================================
    */

    const visualResults = await Promise.all(
      visualSteps.map(async (step) => {
        const image = await searchGoogleImage(step.searchQuery);

        if (!image) {
          return null;
        }

        const imageUrl = image.original || image.thumbnail || image.serpapi_thumbnail || "";

        const fallbackImage = image.thumbnail || image.serpapi_thumbnail || image.original || "";

        if (!imageUrl) {
          return null;
        }

        return {
          step: step.step,

          title: step.title,

          query: step.searchQuery,

          image: imageUrl,

          fallbackImage,

          thumbnail: fallbackImage,

          source: image.source || "Google Images",

          sourceUrl: image.link || "",

          transaction,
        };
      })
    );

    const visuals = visualResults.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    console.log("FINAL VISUAL COUNT:", visuals.length);

    console.log("FINAL VISUALS:", visuals);

    /*
    ==================================================
    RETURN TO FRONTEND
    ==================================================
    */

    return NextResponse.json({
      success: true,

      answer: aiResult.answer,

      transaction,

      visualSteps,

      visuals,

      visual: visuals.length > 0 ? visuals[0] : null,

      image: visuals.length > 0 ? visuals[0].image : null,

      imageUrl: visuals.length > 0 ? visuals[0].image : null,
    });
  } catch (error) {
    console.error("HIRE SAP AI ERROR:", error);

    return NextResponse.json(
      {
        success: false,

        error: error instanceof Error ? error.message : "AI service could not process the request.",
      },
      {
        status: 500,
      }
    );
  }
}
