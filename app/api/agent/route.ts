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

IMPORTANT:

The AI provides the exact step title.

The server creates the Google search query.

This prevents the AI from creating unrelated image searches.
*/

function createImageSearchQuery(
  sapModule: string,
  transaction: string,
  title: string
): string {
  const cleanTitle = title
    .replace(/[^\w\s&-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return [
    "SAP",
    sapModule,
    transaction,
    cleanTitle,
    "SAP GUI",
    "screen",
    "screenshot",
  ]
    .filter(Boolean)
    .join(" ");
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
      console.error(
        "SerpApi HTTP error:",
        response.status
      );

      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error(
        "SerpApi returned error:",
        data.error
      );

      return [];
    }

    const images = data.images_results || [];

    if (!Array.isArray(images)) {
      return [];
    }

    return images;
  } catch (error) {
    console.error(
      "Google image search failed:",
      error
    );

    return [];
  }
}

/*
==================================================
SELECT BEST IMAGE
==================================================

We prefer images whose title/source contains
SAP or the transaction code.
*/

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

    if (
      image.original ||
      image.thumbnail ||
      image.serpapi_thumbnail
    ) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestImage = image;
    }
  }

  return bestImage || images[0] || null;
}

/*
==================================================
AI INSTRUCTIONS
==================================================
*/

function buildInstructions(
  sapModule: string
): string {
  return `
You are HireSAP AI, a professional SAP How-To Assistant.

Selected SAP module: ${sapModule}

Your task is to answer the user's SAP question and create
a visual guide with accurate SAP procedure step names.

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

Use normal numbered steps.

Use normal hyphens for field lists.

The answer must look like this:

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
VISUAL GUIDE
==================================================

Create visualSteps for the most important visual screens.

IMPORTANT:

Use EXACTLY the same step title as the procedure.

For example:

Procedure:

1. Enter Transaction - Open SAP GUI, type MM01 in the command field and press Enter.

Visual step:

{
  "step": 1,
  "title": "Enter Transaction"
}

Do not create a different title.

The visual step title must describe the actual SAP screen.

Prefer 4 to 5 important visual steps.

For a material creation process, good visual steps could be:

1. Enter Transaction

2. Select Industry Sector, Material Type & Views

3. Enter Basic Data 1

4. Maintain Purchasing View

5. Maintain Accounting View

OR:

1. Enter Transaction

2. Select Industry Sector, Material Type & Views

3. Enter Basic Data 1

4. Maintain MRP Views

5. Save the Material

Choose the most useful screens for the user's question.

==================================================
ACCURACY
==================================================

Do not invent transaction codes.

Do not invent SAP screens.

Do not invent configuration paths.

Use SAP terminology.

If the process depends on customer configuration,
clearly mention that.

==================================================
JSON FORMAT
==================================================

Return ONLY valid JSON.

Use this exact structure:

{
  "answer": "T-code: MM01\\n\\n1. Enter Transaction - Open SAP GUI, type MM01 in the command field and press Enter.",
  "visualSteps": [
    {
      "step": 1,
      "title": "Enter Transaction"
    },
    {
      "step": 2,
      "title": "Select Industry Sector, Material Type & Views"
    },
    {
      "step": 3,
      "title": "Enter Basic Data 1"
    },
    {
      "step": 4,
      "title": "Maintain Purchasing View"
    },
    {
      "step": 5,
      "title": "Maintain Accounting View"
    }
  ]
}

IMPORTANT:

Do NOT include searchQuery.

The application will create the Google image search query automatically
from the exact step title.

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

    const message =
      body.message ||
      body.question ||
      body.prompt ||
      "";

    const sapModule =
      body.sapModule || "SAP MM";

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
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

    console.log(
      "SAP QUESTION:",
      message
    );

    /*
    ================================================
    STEP 1
    AI CREATES ANSWER + EXACT STEP NAMES
    ================================================
    */

    const response =
      await hf.responses.create({
        model:
          "openai/gpt-oss-120b:groq",

        instructions:
          buildInstructions(
            sapModule
          ),

        input: message,
      });

    const rawOutput =
      response.output_text || "";

    console.log(
      "RAW AI RESPONSE:",
      rawOutput
    );

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
      const jsonText =
        cleanJson(rawOutput);

      result =
        JSON.parse(jsonText);

      if (
        typeof result.answer !==
        "string"
      ) {
        throw new Error(
          "AI answer is missing."
        );
      }

      if (
        !Array.isArray(
          result.visualSteps
        )
      ) {
        result.visualSteps = [];
      }
    } catch (error) {
      console.error(
        "JSON PARSE ERROR:",
        error
      );

      return NextResponse.json({
        success: true,

        answer:
          cleanAnswer(
            rawOutput
          ),

        transaction:
          extractTransaction(
            rawOutput
          ),

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

    const answer =
      cleanAnswer(
        result.answer
      );

    /*
    ================================================
    STEP 4
    FIND TRANSACTION
    ================================================
    */

    const transaction =
      extractTransaction(
        answer
      );

    /*
    ================================================
    STEP 5
    PREPARE EXACT VISUAL STEPS
    ================================================
    */

    let visualSteps =
      result.visualSteps
        .filter(
          (item) =>
            item &&
            typeof item.step ===
              "number" &&
            typeof item.title ===
              "string"
        )
        .map(
          (item) => ({
            step: item.step,
            title:
              item.title
                .trim()
                .replace(
                  /^[0-9]+[.)-]\s*/,
                  ""
                ),
          })
        )
        .filter(
          (item) =>
            item.title.length > 0
        );

    /*
    ================================================
    LIMIT TO MAXIMUM 5 VISUALS
    ================================================
    */

    visualSteps =
      visualSteps.slice(0, 5);

    console.log(
      "EXACT VISUAL STEPS:",
      visualSteps
    );

    /*
    ================================================
    STEP 6
    GOOGLE IMAGE SEARCH

    The important change is here.

    We DO NOT use an AI generated searchQuery.

    We create the query ourselves from the
    exact visual step title.
    ================================================
    */

    const visualResults =
      await Promise.all(
        visualSteps.map(
          async (step) => {
            const searchQuery =
              createImageSearchQuery(
                sapModule,
                transaction,
                step.title
              );

            console.log(
              "GOOGLE IMAGE SEARCH:",
              searchQuery
            );

            const images =
              await searchGoogleImages(
                searchQuery
              );

            const image =
              selectBestImage(
                images,
                transaction,
                step.title
              );

            if (!image) {
              console.log(
                "NO IMAGE FOUND:",
                searchQuery
              );

              return null;
            }

            const imageUrl =
              image.original ||
              image.thumbnail ||
              image.serpapi_thumbnail ||
              "";

            const fallbackImage =
              image.thumbnail ||
              image.serpapi_thumbnail ||
              image.original ||
              "";

            if (!imageUrl) {
              return null;
            }

            return {
              step:
                step.step,

              title:
                step.title,

              query:
                searchQuery,

              image:
                imageUrl,

              fallbackImage,

              thumbnail:
                fallbackImage,

              source:
                image.source ||
                "Google Images",

              sourceUrl:
                image.link ||
                "",

              transaction,
            };
          }
        )
      );

    /*
    ================================================
    STEP 7
    REMOVE FAILED IMAGES
    ================================================
    */

    const visuals =
      visualResults.filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          item !== null
      );

    console.log(
      "FINAL VISUAL COUNT:",
      visuals.length
    );

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

      visual:
        visuals.length > 0
          ? visuals[0]
          : null,

      image:
        visuals.length > 0
          ? visuals[0].image
          : null,

      imageUrl:
        visuals.length > 0
          ? visuals[0].image
          : null,
    });
  } catch (error) {
    console.error(
      "HIRE SAP AI ERROR:",
      error
    );

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