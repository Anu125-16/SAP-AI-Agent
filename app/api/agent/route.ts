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

/*
==================================================
NON-SAP SYSTEMS LIST (shared everywhere)
==================================================
*/

const NON_SAP_SYSTEMS = [
  "Tally",
  "Zoho Books",
  "Odoo",
  "Oracle ERP",
  "Microsoft Dynamics 365",
];

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
    "FB01",
    "FB03",
    "FB08",
    "F-02",
    "F-03",
    "F-27",
    "F-28",
    "F-30",
    "F-32",
    "F-44",
    "F.13",
    "F.80",
    "F110",
    "FBRA",
    "FBL1N",
    "FBL3N",
    "FBL5N",
    "FS10N",
    "XK01",
    "FK01",
    "FD01",
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
DETECT EFFECTIVE MODULE / SYSTEM
==================================================
*/

function detectEffectiveModule(
  message: string,
  selectedModule: string
): string {
  // FIX: agar user ne SAP ke alawa koi doosra ERP system select
  // kiya hai (Tally, Zoho Books, Odoo, waghera), to keyword-based
  // SAP routing bilkul skip karo - warna "journal entry" jaisa
  // keyword hamesha "FI" (SAP) return kar deta tha, chahe user ne
  // Tally select kiya ho.
  if (NON_SAP_SYSTEMS.includes(selectedModule)) {
    return selectedModule;
  }

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

/*
==================================================
CREATE EXACT GOOGLE IMAGE SEARCH QUERY
(now ERP-aware, not hardcoded to SAP)
==================================================
*/

function createImageSearchQuery(
  effectiveModule: string,
  transaction: string,
  title: string,
  isNonSap: boolean
): string {
  const cleanTitle = title
    .replace(/[^\w\s&-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (isNonSap) {
    // effectiveModule here IS the system name itself, e.g. "Tally",
    // "Zoho Books", "Odoo", "Oracle ERP", "Microsoft Dynamics 365".
    const parts = [effectiveModule, cleanTitle, "screenshot"].filter(
      Boolean
    );

    return parts.join(" ");
  }

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
TRUSTED DOMAINS PER SYSTEM

Real, reliable sources per ERP system. We try these
FIRST so we get genuine product screenshots instead of
random blogs, Pinterest boards, or decorative images.
If nothing is found there, we fall back to a normal
search (still filtered by selectBestImage).
==================================================
*/

const TRUSTED_DOMAINS: Record<string, string[]> = {
  SAP: ["blogs.sap.com", "help.sap.com", "community.sap.com"],
  Tally: ["tallysolutions.com"],
  "Zoho Books": ["zoho.com"],
  Odoo: ["odoo.com"],
  "Oracle ERP": ["docs.oracle.com"],
  "Microsoft Dynamics 365": ["learn.microsoft.com"],
};

function buildSiteRestrictedQuery(
  baseQuery: string,
  systemKey: string
): string {
  const domains = TRUSTED_DOMAINS[systemKey] || [];

  if (domains.length === 0) {
    return baseQuery;
  }

  const siteFilter = domains.map((d) => `site:${d}`).join(" OR ");

  return `${baseQuery} (${siteFilter})`;
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
SELECT BEST IMAGE  (ERP-AWARE VERSION)
==================================================

CHANGES:

1. NEGATIVE_KEYWORDS_COMMON - agar image title/source/link mein
   "debugger", "abap editor" jaise words milte hain, us image
   ko turant reject kar do, chahe uska score kuch bhi ho.

2. CROSS-SYSTEM REJECTION - agar user ne SAP select kiya hai,
   to Tally/Zoho/Odoo/Oracle/Dynamics wali images reject hongi,
   aur agar user ne (jaise) Tally select kiya hai, to SAP/Fiori
   wali images reject hongi. Isse galat-system-ki-image ka
   chance khatam ho jata hai.

3. MIN_ACCEPTABLE_SCORE - agar best image ka score bhi is
   threshold se kam hai (matlab koi achha match nahi mila),
   to NULL return karo, taaki koi unrelated image kabhi na dikhe.
*/

const MIN_ACCEPTABLE_SCORE_SAP = 8;
const MIN_ACCEPTABLE_SCORE_NON_SAP = 5;

const NEGATIVE_KEYWORDS_COMMON = [
  "debugger",
  "abap editor",
  "abap program",
  "source code",
  "class builder",
  "breakpoint",
  "watchpoint",
  "workbench",
  "developer",
  "cheat sheet",
  "cheatsheet",
  "infographic",
  "reference chart",
  "reference guide",
  "poster",
  "wallpaper",
  "clip art",
  "clipart",
  "cartoon",
  "meme",
  "stock photo",
  "banner image",
  "cover image",
  "t-code list",
  "tcode list",
  "night sky",
  "landscape photo",
];

const DOMAIN_BLOCKLIST = [
  "pinterest.",
  "slideshare.net",
  "shutterstock.com",
  "istockphoto.com",
  "gettyimages.com",
  "alamy.com",
  "freepik.com",
  "unsplash.com",
  "pexels.com",
  "dreamstime.com",
  "123rf.com",
  "vecteezy.com",
  "stock.adobe.com",
  "canva.com",
];

const OTHER_SYSTEM_KEYWORDS: Record<string, string[]> = {
  SAP: ["sap", "fiori", "s/4hana", "sap gui"],
  Tally: ["tally", "tallyprime", "gateway of tally"],
  "Zoho Books": ["zoho books", "zoho"],
  Odoo: ["odoo"],
  "Oracle ERP": ["oracle erp", "oracle fusion", "oracle cloud"],
  "Microsoft Dynamics 365": ["dynamics 365", "microsoft dynamics"],
};

function selectBestImage(
  images: ImageResult[],
  transaction: string,
  title: string,
  systemName: string,
  isNonSap: boolean
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

  // Build the list of "other system" keywords that should NOT
  // appear in the image (to avoid cross-system mismatches).
  const currentSystemKey = isNonSap ? systemName : "SAP";

  const rejectKeywords: string[] = [];

  for (const key of Object.keys(OTHER_SYSTEM_KEYWORDS)) {
    if (key !== currentSystemKey) {
      rejectKeywords.push(...OTHER_SYSTEM_KEYWORDS[key]);
    }
  }

  const ownSystemKeywords = OTHER_SYSTEM_KEYWORDS[currentSystemKey] || [];

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
    if (NEGATIVE_KEYWORDS_COMMON.some((kw) => combined.includes(kw))) {
      continue;
    }

    // FIX 2: Stock photo / infographic / slide sites ko reject karo
    if (DOMAIN_BLOCKLIST.some((domain) => combined.includes(domain))) {
      continue;
    }

    // FIX 3: Doosre ERP system ki image reject karo
    if (rejectKeywords.some((kw) => combined.includes(kw))) {
      continue;
    }

    // FIX 4: Agar image mein apne system ka naam (SAP/Tally/etc.)
    // kahin bhi mention nahi hai, to ye image bilkul unrelated ho
    // sakti hai - isse turant reject kar do, chahe koi aur keyword
    // match ho jaye.
    if (
      ownSystemKeywords.length > 0 &&
      !ownSystemKeywords.some((kw) => combined.includes(kw))
    ) {
      continue;
    }

    let score = 0;

    for (const keyword of keywords) {
      if (keyword && combined.includes(keyword)) {
        score += 2;
      }
    }

    if (ownSystemKeywords.some((kw) => combined.includes(kw))) {
      score += 3;
    }

    if (transaction && combined.includes(transaction.toLowerCase())) {
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

  const threshold = isNonSap
    ? MIN_ACCEPTABLE_SCORE_NON_SAP
    : MIN_ACCEPTABLE_SCORE_SAP;

  // FIX 3: Agar best score bhi threshold se kam hai to image mat do
  if (bestScore < threshold) {
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

  const isNonSap = NON_SAP_SYSTEMS.includes(sapModule);

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
UNIVERSAL ACCOUNTING RULES (ALL ERPs)
==================================================

Double-entry accounting works the same way in every ERP system,
because it follows universal accounting principles, not
software-specific rules. Apply these rules regardless of which
ERP the user selected (SAP, Tally, Zoho Books, Odoo, Oracle ERP,
or Microsoft Dynamics 365).

Five account types and their normal behavior:
- Assets (cash, bank, inventory, debtors/receivables) - increase with Debit, decrease with Credit.
- Liabilities (loans, creditors/payables) - increase with Credit, decrease with Debit.
- Equity/Capital - increases with Credit, decreases with Debit.
- Income/Revenue - increases with Credit.
- Expenses - increase with Debit.

Golden rule check for every transaction:
1. Identify which accounts are affected by the transaction.
2. Identify the type of each account (Asset, Liability, Equity, Income, Expense).
3. Decide Debit or Credit for each account using the rules above.
4. Confirm that total Debit amount equals total Credit amount. If they do not match, the entry is incorrect - state this clearly and give the exact mismatch amount.

EXPLAIN WITH A SMALL EXAMPLE FIRST:
Before giving the full rule-based explanation, start with one short,
concrete example using real numbers relevant to the user's question
(for example: "Say a customer paid Rs 5,000 into the bank - here,
Bank account is debited and Customer account is credited, because
Bank is an Asset increasing and the Customer's due amount is going
down."). Keep this opening example to 2-3 sentences. After the
example, then expand into the fuller explanation, the golden rule
check, and (if relevant) the ERP-specific posting steps. Do not skip
straight to abstract rules without this example first.

When the user describes a real transaction or scenario (for example,
recording a bank statement line, matching a payment, fixing a
reconciliation difference, or asking "is this entry correct"):

- Do NOT jump straight into ERP navigation steps.
- First explain the accounting logic in plain words: which account
  is debited, which is credited, and why - using the rules above.
- If the user has already made an entry, clearly state whether it
  is correct or incorrect. If incorrect, explain exactly what is
  wrong (wrong side, wrong account, or amount mismatch) and give
  the corrected entry.
- If the user mentions being stuck in a suspense, reserve, or
  clearing account due to a mismatch, explain in simple words why
  that happens (the difference between debit and credit could not
  be matched automatically) and how to find and correct the
  mismatched amount.
- Only after the accounting logic is confirmed correct, explain how
  to actually enter or post it in the selected ERP system (T-code,
  Fiori app, or menu path as usual).
- If the user's question is purely about verifying or correcting an
  entry and does not ask how to post it, it is acceptable to give a
  short, direct answer focused only on the accounting correctness,
  without a full navigation walkthrough.

==================================================
RELATED TRANSACTIONS AND BULK/MASS ENTRY
==================================================

Real SAP FI work rarely uses just one T-code in isolation. When
the user's question is about journal entries, postings, or
clearing, mention the closely related transactions they will
likely need next, briefly and only if genuinely relevant:

- FB50 / F-02 - post a manual G/L journal entry.
- FB03 - display an already-posted accounting document.
- FB08 - reverse a posted document.
- F-03 - clear open items on a G/L account (e.g. clearing a
  suspense/reconciliation difference once it is resolved).
- F.13 - automatic clearing of open items across accounts.
- FBL3N - display G/L account line items (useful to check what
  is sitting open/unmatched, such as during bank reconciliation).
- F110 - automatic payment run, for batches of vendor payments.

If the user's question implies they need to post MANY entries at
once (bulk/mass entries), rather than one at a time, mention that
this is normally NOT done one-by-one through FB50. Instead:
- Fiori apps such as "Manage Journal Entries" or "Upload Journal
  Entries" allow uploading a spreadsheet of multiple lines at
  once, in S/4HANA.
- In classic SAP GUI, tools like LSMW (Legacy System Migration
  Workbench) or a Batch Input session are typically used by SAP
  Basis/consultants to upload many entries from a file.
- F.80 allows mass reversal of multiple documents at once.
State plainly that setting these bulk tools up usually needs
support from the SAP Basis/functional team the first time, and
that this is different from the manual single-entry process.

Only include the transactions/tools that are actually relevant to
what the user asked - do not list all of them in every answer.

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
PRACTICAL REFERENCE CODES (POSTING KEYS, DOCUMENT TYPES, ETC.)
==================================================

A real answer must be execution-ready, not just conceptual.
Whenever the selected system/module has standard reference codes
that a user must actually type or select on screen, include them
explicitly next to the relevant line - do not just say "Debit"
or "Credit" in words alone.

For SAP FI (G/L, Customer, Vendor postings):
- Always show the SAP posting key next to each Debit/Credit
  line, in this format: "Debit: 40 - Bank G/L Account 5,000" or
  "Credit: 31 - Vendor Payable Account 5,000".
- Whenever a posting key is used, briefly explain WHY that key
  applies (which account type it is, and whether that type
  increases or decreases here) - not just the number. Use the
  reasoning patterns below.

STANDARD POSTING KEY REFERENCE (use this exact logic):

G/L to G/L (e.g. Bank, Rent, Salary - no vendor/customer involved):
- 40 = Debit (used when a G/L account increases as an Asset/Expense,
  e.g. an expense account being booked).
- 50 = Credit (used when a G/L account decreases as an Asset, e.g.
  Bank going down because money was paid out).
- Document type: SA (G/L account document).
Example: Rent paid from bank.
Debit: 40 - Rent Expense Account 10,000
Credit: 50 - Bank Account 10,000
Reasoning: Rent is an Expense, which increases with Debit. Bank is
an Asset, which decreases with Credit.

Vendor keys (vendor = liability, since the company owes them):
- 31 = Credit - used when a new vendor invoice/bill is booked
  (the company's liability to the vendor increases). Document
  type: KR (Vendor invoice).
- 25 = Debit - used when the company actually pays the vendor
  (the liability decreases, since it is now settled). Document
  type: KZ (Vendor payment).
- 21 = Debit - used when the vendor issues a credit memo/refund
  (the liability decreases because less is owed).
Reasoning pattern: Vendor is a Liability. Liabilities increase
with Credit (new bill = 31) and decrease with Debit (payment made
or refund received = 25 or 21).

Customer keys (customer = asset/receivable, since they owe the
company):
- 01 = Debit - used when a new customer invoice is raised (the
  amount the customer owes increases). Document type: DR
  (Customer invoice).
- 15 = Credit - used when the customer actually pays (the
  receivable decreases, since it is now settled). Document type:
  DZ (Customer payment).
- 11 = Credit - used when the company issues a credit
  memo/refund to the customer (the receivable decreases).
Reasoning pattern: Customer is an Asset/Receivable. Assets
increase with Debit (new invoice = 01) and decrease with Credit
(payment received or refund given = 15 or 11).

Quick memory table to apply when answering:
| Situation | Key | Why |
| New vendor bill received | 31 (Credit) | Company's liability (what it owes) goes up |
| Payment made to vendor | 25 (Debit) | Company's liability goes down |
| New customer invoice raised | 01 (Debit) | What the customer owes (asset) goes up |
| Payment received from customer | 15 (Credit) | What the customer owes (asset) goes down |
| G/L to G/L (Bank, Rent, Salary) | 40 Debit / 50 Credit | Standard Asset/Expense rule |

When explaining any Debit/Credit posting key, use this exact
"why" style - state the account type (Asset/Liability/Expense/
Income) and whether it is increasing or decreasing - so the
reasoning is always visible, not just the final key number.

==================================================
APPLY THE SAME DEPTH TO ALL OTHER ERP SYSTEMS
==================================================

The reasoning depth above (account type, increase/decrease
logic, and the exact system code/voucher/transaction type to
use) is NOT SAP-only. Apply the exact same standard whenever the
selected system is Tally, Zoho Books, Odoo, Oracle ERP, or
Microsoft Dynamics 365. Never give a bare "Debit: X, Credit: Y"
in any system without (a) the account-type reasoning and (b) the
correct system-specific code/voucher/transaction type the user
would actually select on screen.

Tally:
- Use the same Debit/Credit reasoning (Asset/Liability/Expense/
  Income increasing or decreasing) as described above.
- Always name the correct voucher type: F7 = Journal,
  F5 = Payment, F6 = Receipt, F8 = Sales, F9 = Purchase.
Example - paid a vendor Rs 10,000 from bank:
Voucher type: F5 (Payment)
Debit: Vendor Account 10,000 (Liability decreasing, since the
amount owed is now settled)
Credit: Bank Account 10,000 (Asset decreasing, since cash went
out)

Zoho Books, Odoo, Oracle ERP, Microsoft Dynamics 365:
- These systems do not use numeric posting keys like SAP.
  Instead, the user selects a named transaction type on screen.
  Always name the exact one:
  Zoho Books: Bill, Vendor Credit, Payment Made (vendor side);
  Invoice, Credit Note, Payment Received (customer side).
  Odoo: Vendor Bill, Payment (vendor side); Customer Invoice,
  Payment (customer side).
  Oracle ERP / Microsoft Dynamics 365: Invoice, Payment, Credit
  Memo (naming the vendor or customer side clearly).
- Always pair the transaction type with the same account-type
  reasoning used above (which account is an Asset, Liability,
  Expense, or Income, and whether it is increasing or
  decreasing).

For SAP MM: mention the relevant movement type when applicable
(e.g., 101 = Goods receipt for purchase order, 601 = Goods issue
for delivery, 311 = Stock transfer), alongside the T-code.

For SAP SD: mention the relevant sales document type when
applicable (e.g., OR = Standard order, LF = Delivery,
F2 = Invoice).

For Tally: mention the relevant voucher type (e.g., F7 = Journal,
F5 = Payment, F6 = Receipt, F8 = Sales, F9 = Purchase).

For Zoho Books, Odoo, Oracle ERP, and Microsoft Dynamics 365:
mention the equivalent reference field the system requires (for
example, the transaction/voucher type dropdown, or document
category), using the correct terminology for that system, so the
user knows exactly what to select on screen - not just a generic
description.

This level of practical, execution-ready detail applies across
every module this assistant covers - SAP MM, FICO, SD, PP, ABAP,
Basis, HANA, EWM, Tally, Odoo, Zoho Books, Oracle ERP, and
Microsoft Dynamics 365. A generic, code-free description is not
acceptable when a real system field or code exists for that step.

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
Debit: 40 - Expense G/L Account 10,000
Credit: 50 - Bank G/L Account 10,000
Document type: SA (G/L account document)

Important:
The exact fields and available posting options depend on the SAP release, configuration, document type and user authorization.

==================================================
VISUAL GUIDE
==================================================

Create visualSteps for the most important screens of the
selected system (${sapModule}).

IMPORTANT:
Use EXACTLY the same step title as the procedure.

The visual step title must describe the actual screen the user
would see in ${sapModule} for that step.

Prefer 4 to 5 important visual steps.

Do not create visual steps for unrelated screens.
Do not invent a screen.

==================================================
END-OF-ANSWER FOLLOW-UP
==================================================

After giving the full answer, end with one short, specific
follow-up sentence, not a generic sign-off. Prefer offering to
check the user's own entry or screen directly - for example,
inviting them to share the numbers they entered, or a screenshot
of their screen, so you can confirm whether it is correct or spot
the mistake. Keep it to one sentence, friendly and direct, in the
same language as the rest of the answer (English or Hindi,
matching the LANGUAGE instruction above). Do not repeat this
offer more than once.

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

The application will create the image search query automatically
from the exact step title and the selected system.

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

    const isNonSap = NON_SAP_SYSTEMS.includes(effectiveModule);

    console.log(
      "SELECTED MODULE:",
      sapModule,
      "EFFECTIVE MODULE:",
      effectiveModule,
      "IS NON-SAP:",
      isNonSap
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
    FIND TRANSACTION (SAP only - other systems don't
    have T-codes, so this stays empty for them)
    ================================================
    */

    const transaction = isNonSap ? "" : extractTransaction(answer);

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
    IMAGE SEARCH (ERP-aware)

    For SAP: only search when a real T-code has been
    identified, same as before (avoids random images).

    For non-SAP systems: no T-code exists, so we search
    directly using the system name + step title.
    ================================================
    */

    const visualResults = await Promise.all(
      visualSteps.map(async (step) => {
        if (!isNonSap && !transaction) {
          return null;
        }

        const searchQuery = createImageSearchQuery(
          effectiveModule,
          transaction,
          step.title,
          isNonSap
        );

        const systemKey = isNonSap ? effectiveModule : "SAP";

        const restrictedQuery = buildSiteRestrictedQuery(
          searchQuery,
          systemKey
        );

        console.log("IMAGE SEARCH (trusted sites, full query):", restrictedQuery);

        let images = await searchGoogleImages(restrictedQuery);

        // If nothing found with the full step title, try a broader
        // trusted-domain search (system + transaction only). We do
        // NOT fall back to the open web - a missing image is better
        // than a wrong/unrelated one.
        if (images.length === 0) {
          const broaderQuery = [
            isNonSap ? effectiveModule : "SAP",
            transaction,
            "screenshot",
          ]
            .filter(Boolean)
            .join(" ");

          const broaderRestrictedQuery = buildSiteRestrictedQuery(
            broaderQuery,
            systemKey
          );

          console.log(
            "IMAGE SEARCH (trusted sites, broader query):",
            broaderRestrictedQuery
          );

          images = await searchGoogleImages(broaderRestrictedQuery);
        }

        const image = selectBestImage(
          images,
          transaction,
          step.title,
          effectiveModule,
          isNonSap
        );

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