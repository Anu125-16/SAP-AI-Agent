import OpenAI from "openai";
import { NextResponse } from "next/server";

const hf = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

type VisualStep = {
  step: number;
  title: string;
};

type ImageResult = {
  title?: string;
  thumbnail?: string;
  original?: string;
  serpapi_thumbnail?: string;
  source?: string;
  link?: string;
};

function extractTransaction(answer: string): string {
  const transactionList = [
    "MM01",
    "MM02",
    "MM03",
    "ME21N",
    "ME22N",
    "ME23N",
    "ME51N",
    "ME52N",
    "ME53N",
    "MIGO",
    "MIRO",
    "FB50",
    "FB60",
    "VA01",
    "VA02",
    "VA03",
    "VL01N",
    "VL02N",
    "VL03N",
    "VF01",
    "VF02",
    "VF03",
  ];

  for (const transaction of transactionList) {
    const regex = new RegExp("\\b" + transaction + "\\b", "i");

    if (regex.test(answer)) {
      return transaction;
    }
  }

  return "";
}

function cleanJson(text: string): string {
  let result = text.trim();

  if (result.startsWith("```json")) {
    result = result.substring(7);
  }

  if (result.startsWith("```")) {
    result = result.substring(3);
  }

  if (result.endsWith("```")) {
    result = result.substring(0, result.length - 3);
  }

  const firstBrace = result.indexOf("{");
  const lastBrace = result.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    result = result.substring(firstBrace, lastBrace + 1);
  }

  return result.trim();
}

/*
==================================================
REMOVE MARKDOWN / SPECIAL FORMATTING
==================================================
*/

function cleanAnswer(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/*
==================================================
CREATE EXACT GOOGLE IMAGE SEARCH QUERY
==================================================
*/

function detectEffectiveModule(
  message: string,
  selectedModule: string
): string {
  const q = message.toLowerCase();

  if (
    /\b(journal entry|journal entries|g\/l|general ledger|gl posting|g\/l posting|debit and credit|debit.*credit|credit.*debit)\b/.test(q)
  ) {
    return "FI";
  }

  if (
    /\b(vendor invoice|customer invoice|accounts payable|accounts receivable|bank posting|payment run|automatic payment|fb50|fb60|f-02)\b/.test(q)
  ) {
    return "FI";
  }

  if (
    /\b(purchase requisition|purchase request|purchase order|po\b|goods receipt|material master|vendor master|invoice verification|migo|miro|me21n|me51n|mm01)\b/.test(q)
  ) {
    return "MM";
  }

  if (
    /\b(sales order|delivery|picking|packing|post goods issue|billing document|va01|vl01n|vf01)\b/.test(q)
  ) {
    return "SD";
  }

  if (
    /\b(production order|mrp|material requirements planning|capacity planning|production planning)\b/.test(q)
  ) {
    return "PP";
  }

  if (
    /\b(cost center|internal order|profit center|controlling|co\b)\b/.test(q)
  ) {
    return "CO";
  }

  return selectedModule.replace(/^SAP\s+/i, "").trim();
}

function createImageSearchQuery(
  effectiveModule: string,
  transaction: string,
  title: string
): string {
  const cleanTitle = title
    .replace(/[^\w\s&-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = [
    "SAP",
    effectiveModule,
    transaction,
    cleanTitle,
    "SAP GUI",
    "screen",
    "screenshot",
  ].filter(Boolean);

  return parts.join(" ");
}

/*
==================================================
SEARCH GOOGLE IMAGES USING SERPAPI
==================================================
*/

async function searchGoogleImages(
  query: string
): Promise<ImageResult[]> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.error("SERPAPI_KEY is missing.");
    return [];
  }

  try {
    const params = new URLSearchParams();

    params.set("engine", "google_images");
    params.set("q", query);
    params.set("api_key", apiKey);
    params.set("google_domain", "google.com");
    params.set("hl", "en");
    params.set("gl", "us");
    params.set("device", "desktop");

    const url =
      "https://serpapi.com/search.json?" + params.toString();

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("SerpApi HTTP error:", response.status);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error("SerpApi returned error:", data.error);
      return [];
    }

    const images = data.images_results || [];

    if (!Array.isArray(images)) {
      return [];
    }

    return images;
  } catch (error) {
    console.error("Google image search failed:", error);
    return [];
  }
}

/*
==================================================
SELECT BEST IMAGE  (FIXED VERSION)
==================================================

CHANGES FROM ORIGINAL CODE:

1. NEGATIVE_KEYWORDS - agar image title/source/link mein
   "debugger", "abap editor" jaise words milte hain, us image
   ko turant reject kar do, chahe uska score kuch bhi ho.

2. MIN_ACCEPTABLE_SCORE - agar best image ka score bhi is
   threshold se kam hai (matlab koi achha match nahi mila),
   to NULL return karo. Purani code hamesha ek image return
   kar deta tha (chahe wo poori tarah unrelated ho) - yahi
   root cause tha wrong images (jaise ABAP debugger) ka.
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

function selectBestImage(
  images: ImageResult[],
  transaction: string,
  title: string
): ImageResult | null {
  if (!images.length) {
    return null;
  }

  const keywords = [
    transaction.toLowerCase(),
    ...title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3),
  ];

  let bestImage: ImageResult | null = null;
  let bestScore = -1;

  for (const image of images) {
    const combined = [
      image.title || "",
      image.source || "",
      image.link || "",
    ]
      .join(" ")
      .toLowerCase();

    // FIX 1: Known-bad matches ko turant reject karo
    if (NEGATIVE_KEYWORDS.some((kw) => combined.includes(kw))) {
      continue;
    }

    let score = 0;

    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        score += 2;
      }
    }

    if (combined.includes("sap")) {
      score += 3;
    }

    if (combined.includes(transaction.toLowerCase())) {
      score += 5;
    }

    if (image.original || image.thumbnail || image.serpapi_thumbnail) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestImage = image;
    }
  }

  // FIX 2: Agar best score bhi threshold se kam hai to image mat do
  if (bestScore < MIN_ACCEPTABLE_SCORE) {
    console.log(
      "IMAGE REJECTED - score too low:",
      bestScore,
      "for query:",
      title
    );
    return null;
  }

  return bestImage;
}

/*
==================================================
AI INSTRUCTIONS
==================================================
*/

function buildInstructions(sapModule: string, language: string): string {
  const languageInstruction =
    language === "hi"
      ? `
==================================================
LANGUAGE
==================================================

Respond ENTIRELY in Hindi using Devanagari script (हिंदी).

Keep T-code names, Fiori app names, and technical SAP field
names in English (e.g. "FB50", "G/L Account", "Purchase Order")
since these are fixed SAP terminology - but write every
explanation, instruction, and sentence around them in Hindi.

Example style:
"T-code: FB50

1. ट्रांजैक्शन खोलें - SAP GUI में FB50 टाइप करें और Enter दबाएं।"

Do not mix Hindi and English within the same sentence beyond
technical terms. The reader should be able to read this
comfortably in Hindi.
`
      : "";

  const nonSapSystems = [
    "Tally",
    "Zoho Books",
    "Odoo",
    "Oracle ERP",
    "Microsoft Dynamics 365",
  ];

  const isNonSap = nonSapSystems.includes(sapModule);

  const systemInstruction = isNonSap
    ? `
==================================================
SYSTEM CONTEXT: ${sapModule}
==================================================

The user is asking about ${sapModule}, NOT SAP. Do not use SAP
terminology like "T-code" or "SAP GUI" for this system.

Instead, use the correct navigation style for ${sapModule}:

- Tally: describe the menu path from the Gateway of Tally, and
  the keyboard shortcut if one exists (e.g. "Gateway of Tally >
  Accounting Vouchers > F7: Journal").
- Zoho Books: describe the left-hand module and menu item
  (e.g. "Sales > Invoices > New").
- Odoo: describe the app and menu (e.g. "Inventory app >
  Operations > Transfers").
- Oracle ERP / Oracle Fusion: describe the navigator path
  (e.g. "Navigator > Procurement > Purchase Orders").
- Microsoft Dynamics 365: describe the module and workspace
  (e.g. "Accounts payable > Invoices > Pending vendor invoices").

Start the answer with a line naming the correct menu/module path
instead of "T-code:", for example:

Path: Gateway of Tally > Accounting Vouchers > F7: Journal

Then give simple numbered steps, same style as before.

Do NOT invent a menu path, button, or field that does not exist
in ${sapModule}. If you are not fully certain of the exact path,
say so plainly rather than guessing.
`
    : "";

  return `
You are ERP Tutor AI, a professional ERP How-To Assistant covering
SAP as well as other ERP systems such as Tally, Zoho Books, Odoo,
Oracle ERP, and Microsoft Dynamics 365.

Selected system: ${sapModule}
${languageInstruction}
${systemInstruction}

IMPORTANT MODULE RULE:
The selected module/system is only the user's starting context. It is NOT a restriction.
Always identify what the user is actually asking before answering.
If the question belongs to another SAP module, answer for the correct module and explicitly say:
"This activity is primarily an SAP <MODULE> activity."
Do NOT force an MM answer just because SAP MM is selected.

==================================================
QUESTION UNDERSTANDING
==================================================

First determine:
1. The exact SAP business activity requested.
2. The correct SAP module.
3. The correct transaction code or S/4HANA Fiori app, when applicable.
4. Whether the question is about ECC, S/4HANA, or is version-dependent.

Common routing examples:
- Journal entry, G/L posting, general ledger, debit/credit posting -> SAP FI
- Vendor invoice / invoice verification / MIRO -> SAP MM / FI integration
- Purchase requisition / PR -> SAP MM
- Purchase order / PO -> SAP MM
- Goods receipt / GR / material document -> SAP MM
- Sales order -> SAP SD
- Delivery / picking / PGI -> SAP SD / LE
- Billing document -> SAP SD
- Production order / MRP -> SAP PP
- Cost center posting / internal order / controlling -> SAP CO

Do not confuse related processes.
For example:
"How can I pass a journal entry?" is an SAP FI question, not an SAP MM question.

==================================================
ACCURACY RULES
==================================================

Answer only what is relevant to the user's question.

Never invent a transaction code, Fiori app, configuration path, field, table, or SAP screen.

For a manual G/L journal entry:
- In SAP GUI, FB50 is commonly used for G/L account document posting.
- In SAP S/4HANA, the Fiori app "Post General Journal Entries" may be used.
- If the exact system/version is unknown, clearly state that availability depends on the customer's SAP release and authorization.
- Do not claim that one transaction is universally available in every SAP system.

When a T-code is relevant, put it at the beginning:
T-code: <code>

If a Fiori app is the more appropriate S/4HANA option, state:
Fiori app: <app name>

If multiple valid methods exist, give the primary method first and briefly mention the alternative.

Do not give unrelated information just to make the answer longer.

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
  button looks like — describe it.

==================================================
ANSWER FORMAT
==================================================

Use simple and clear plain text.

Do NOT use:
Markdown
Bold symbols
Italic symbols
Backticks
HTML
Special formatting symbols

Use normal numbered steps and normal hyphens.

For a procedure, use this structure:

T-code: <code>

1. Open the transaction or Fiori app and explain what to enter.
2. Enter the required organizational/document information.
3. Enter the relevant line items and amounts.
4. Check or simulate the document.
5. Post/save the document.
6. Explain the resulting document number or accounting impact when applicable.

Then include:

Example:
Debit: <account> <amount>
Credit: <account> <amount>

Important:
- Mention prerequisites or configuration only when relevant.
- Mention common errors only when useful.
- Clearly distinguish FI, MM, SD, PP and CO activities.

==================================================
JOURNAL ENTRY EXAMPLE
==================================================

If the user asks a general question such as "How can I pass a journal entry in SAP?", provide a relevant SAP FI answer such as:

T-code: FB50
Fiori app: Post General Journal Entries (SAP S/4HANA)

1. Open FB50 in SAP GUI, or open the Post General Journal Entries Fiori app in S/4HANA.
2. Enter the company code, document date, posting date and currency as required.
3. Enter the G/L line items with the appropriate debit and credit amounts.
4. Enter required assignments such as cost center, profit center, tax code or other fields when applicable.
5. Check or simulate the document and correct any validation errors.
6. Post the document. SAP creates an accounting document number.

Example:
Debit: Expense G/L Account 10,000
Credit: Bank G/L Account 10,000

Important:
The exact fields and available posting options depend on the SAP release, configuration, document type and user authorization.

==================================================
VISUAL GUIDE
==================================================

Create visualSteps for the most important SAP screens.

IMPORTANT:
Use EXACTLY the same step title as the procedure.

The visual step title must describe the actual SAP screen.

Prefer 4 to 5 important visual steps.

Do not create visual steps for unrelated screens.
Do not invent a screen.

==================================================
JSON FORMAT
==================================================

Return ONLY valid JSON.

Use this exact structure:

{
  "answer": "T-code: FB50\\nFiori app: Post General Journal Entries (SAP S/4HANA)\\n\\n1. Open the transaction or Fiori app...",
  "visualSteps": [
    {
      "step": 1,
      "title": "Open the Journal Entry Transaction or Fiori App"
    },
    {
      "step": 2,
      "title": "Enter Document Header Information"
    },
    {
      "step": 3,
      "title": "Enter G/L Line Items"
    },
    {
      "step": 4,
      "title": "Check or Simulate the Document"
    },
    {
      "step": 5,
      "title": "Post the Journal Entry"
    }
  ]
}

IMPORTANT:
Do NOT include searchQuery.

The application will create the Google image search query automatically from the exact step title.

Do not put JSON inside Markdown code fences.
`;
}

/*
==================================================
POST
==================================================
*/

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.message || body.question || body.prompt || "";

    const sapModule = body.sapModule || "SAP MM";

    const language = body.language === "hi" ? "hi" : "en";

    const effectiveModule = detectEffectiveModule(message, sapModule);

    console.log(
      "SELECTED MODULE:",
      sapModule,
      "EFFECTIVE MODULE:",
      effectiveModule
    );

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    console.log("SAP QUESTION:", message);

    /*
    ================================================
    STEP 1
    AI CREATES ANSWER + EXACT STEP NAMES
    ================================================
    */

    const response = await hf.responses.create({
      model: "openai/gpt-oss-120b:groq",

      instructions: buildInstructions(effectiveModule, language),

      input: message,
    });

    const rawOutput = response.output_text || "";

    console.log("RAW AI RESPONSE:", rawOutput);

    /*
    ================================================
    STEP 2
    PARSE JSON
    ================================================
    */

    let result: {
      answer: string;
      visualSteps: VisualStep[];
    };

    try {
      const jsonText = cleanJson(rawOutput);

      result = JSON.parse(jsonText);

      if (typeof result.answer !== "string") {
        throw new Error("AI answer is missing.");
      }

      if (!Array.isArray(result.visualSteps)) {
        result.visualSteps = [];
      }
    } catch (error) {
      console.error("JSON PARSE ERROR:", error);

      return NextResponse.json({
        success: true,

        answer: cleanAnswer(rawOutput),

        transaction: extractTransaction(rawOutput),

        visualSteps: [],

        visuals: [],

        visual: null,

        image: null,

        imageUrl: null,
      });
    }

    /*
    ================================================
    STEP 3
    CLEAN ANSWER
    ================================================
    */

    const answer = cleanAnswer(result.answer);

    /*
    ================================================
    STEP 4
    FIND TRANSACTION
    ================================================
    */

    const transaction = extractTransaction(answer);

    /*
    ================================================
    STEP 5
    PREPARE EXACT VISUAL STEPS
    ================================================
    */

    let visualSteps = result.visualSteps
      .filter(
        (item) =>
          item &&
          typeof item.step === "number" &&
          typeof item.title === "string"
      )
      .map((item) => ({
        step: item.step,
        title: item.title.trim().replace(/^[0-9]+[.)-]\s*/, ""),
      }))
      .filter((item) => item.title.length > 0);

    /*
    ================================================
    LIMIT TO MAXIMUM 5 VISUALS
    ================================================
    */

    visualSteps = visualSteps.slice(0, 5);

    console.log("EXACT VISUAL STEPS:", visualSteps);

    /*
    ================================================
    STEP 6
    GOOGLE IMAGE SEARCH

    We create the query ourselves from the
    exact visual step title (not AI generated).
    ================================================
    */

    const visualResults = await Promise.all(
      visualSteps.map(async (step) => {
        // Only search for a SAP screenshot when a real transaction
        // has been identified. This prevents unrelated images.
        if (!transaction) {
          return null;
        }

        const searchQuery = createImageSearchQuery(
          effectiveModule,
          transaction,
          step.title
        );

        console.log("GOOGLE IMAGE SEARCH:", searchQuery);

        const images = await searchGoogleImages(searchQuery);

        const image = selectBestImage(images, transaction, step.title);

        if (!image) {
          console.log("NO IMAGE FOUND:", searchQuery);
          return null;
        }

        const imageUrl =
          image.original ||
          image.thumbnail ||
          image.serpapi_thumbnail ||
          "";

        const fallbackImage =
          image.thumbnail || image.serpapi_thumbnail || image.original || "";

        if (!imageUrl) {
          return null;
        }

        return {
          step: step.step,
          title: step.title,
          image: imageUrl,
          fallbackImage,
          thumbnail: fallbackImage,
          transaction,
        };
      })
    );

    /*
    ================================================
    STEP 7
    REMOVE FAILED IMAGES
    ================================================
    */

    const visuals = visualResults.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    console.log("FINAL VISUAL COUNT:", visuals.length);

    /*
    ================================================
    STEP 8
    RETURN RESULT
    ================================================
    */

    return NextResponse.json({
      success: true,

      answer,

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

        error:
          error instanceof Error
            ? error.message
            : "AI service could not process the request.",
      },
      {
        status: 500,
      }
    );
  }
}