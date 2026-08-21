"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Visual = {
  step: number;
  title: string;
  query: string;
  image: string;
  fallbackImage?: string;
  thumbnail?: string;
  source?: string;
  sourceUrl?: string;
  transaction?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  visuals?: Visual[];
};

/*
==================================================
MODULE LIST
==================================================
"Automation" add kiya gaya hai jo pehle nahi tha.
*/

const MODULE_OPTIONS = [
  "SAP MM",
  "SAP FICO",
  "SAP SD",
  "SAP PP",
  "SAP ABAP",
  "SAP Basis",
  "SAP HANA",
  "SAP EWM",
  "SAP TM",
  "SAP Concur",
  "Automation",
];

/*
==================================================
SAMPLE QUESTIONS PER MODULE
==================================================
Pehle sirf MM ke liye fixed questions the.
Ab har module ke apne alag questions hain, jo
module badalte hi sidebar mein change ho jayenge.
Jitne chahiye utne add kar sakte ho.
*/

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  "SAP MM": [
    "How do I create a Material in SAP MM?",
    "How do I create a Purchase Order in SAP MM?",
    "How do I create a Purchase Requisition in SAP MM?",
    "How do I post a Goods Receipt in SAP MM?",
    "How do I post a Vendor Invoice in SAP MM?",
  ],
  "SAP FICO": [
    "How do I pass a Journal Entry in SAP?",
    "How do I do Bank Reconciliation in SAP?",
    "How do I create a Vendor Invoice in SAP FI?",
    "How do I post a Customer Invoice in SAP?",
    "What is the difference between FI and CO?",
  ],
  "SAP SD": [
    "How do I create a Sales Order in SAP SD?",
    "How do I create a Delivery Document in SAP SD?",
    "How do I create a Billing Document in SAP SD?",
  ],
  "SAP PP": [
    "How do I create a Production Order in SAP PP?",
    "What is MRP in SAP PP?",
  ],
  "SAP ABAP": [
    "How do I write a simple ABAP report?",
    "What is a BAPI in SAP?",
    "How do I debug an ABAP program?",
  ],
  "SAP Basis": [
    "How do I check system logs in SAP Basis?",
    "How do I create a new client in SAP?",
  ],
  "SAP HANA": [
    "What is SAP HANA?",
    "How do I create a calculation view in HANA?",
  ],
  "SAP EWM": [
    "How do I create a warehouse task in SAP EWM?",
  ],
  "SAP TM": [
    "How do I create a freight order in SAP TM?",
  ],
  "SAP Concur": [
    "How do I submit an expense report in Concur?",
  ],
  Automation: [
    "How can I automate SAP data entry?",
    "What tools automate SAP testing?",
    "How does RPA work with SAP?",
  ],
};

export default function AgentPage() {
  const [sapModule, setSapModule] = useState("SAP MM");

  /*
    ==================================================
    LANGUAGE TOGGLE (English / Hindi)
    ==================================================
  */
  const [language, setLanguage] = useState<"en" | "hi">("en");

  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);

  /*
    ==================================================
    FREE QUESTION LIMIT
    ==================================================
    5 free questions ke baad naam+email maanga jayega.
    localStorage mein save hota hai, isliye browser band
    karke wapas aane par bhi count yaad rehta hai.
  */

  const FREE_QUESTION_LIMIT = 5;

  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [checkedStorage, setCheckedStorage] = useState(false);

  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState("");

  useEffect(() => {
    const savedCount = Number(
      window.localStorage.getItem("hiresap_questions_asked") || "0"
    );
    const unlocked =
      window.localStorage.getItem("hiresap_unlocked") === "true";

    setQuestionsAsked(savedCount);
    setHasUnlocked(unlocked);
    setCheckedStorage(true);
  }, []);

  const limitReached =
    checkedStorage && !hasUnlocked && questionsAsked >= FREE_QUESTION_LIMIT;

  async function submitLead(event: React.FormEvent) {
    event.preventDefault();
    setLeadError("");

    if (!leadName.trim() || !leadEmail.trim()) {
      setLeadError("Please enter both your name and email.");
      return;
    }

    setLeadSubmitting(true);

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: leadName, email: leadEmail }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      window.localStorage.setItem("hiresap_unlocked", "true");
      setHasUnlocked(true);
    } catch (error) {
      setLeadError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLeadSubmitting(false);
    }
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am HireSAP AI. Ask me how to perform an SAP activity.",
    },
  ]);

  const suggestedQuestions =
    SUGGESTED_QUESTIONS[sapModule] || [];

  async function askSAP(customQuestion?: string) {
    const finalQuestion =
      customQuestion !== undefined ? customQuestion : question;

    if (!finalQuestion.trim()) {
      return;
    }

    if (loading) {
      return;
    }

    // Free limit check - agar limit khatam ho gayi to yahin rok do
    if (limitReached) {
      return;
    }

    /*
      Add the user's question immediately.
    */

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: finalQuestion,
      },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: finalQuestion,

          sapModule,

          language,
        }),
      });

      /*
        Check HTTP status before parsing JSON.
      */

      if (!response.ok) {
        const text = await response.text();

        throw new Error(`Server error ${response.status}: ${text}`);
      }

      const data = await response.json();

      console.log("AGENT RESPONSE:", data);

      if (!data.success) {
        throw new Error(data.error || "AI request failed.");
      }

      /*
        Add AI answer + visual guide.
      */

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",

          content: data.answer || "No answer was returned.",

          visuals: Array.isArray(data.visuals) ? data.visuals : [],
        },
      ]);

      // Question count badhao aur save karo (sirf agar unlock nahi hua)
      if (!hasUnlocked) {
        const newCount = questionsAsked + 1;
        setQuestionsAsked(newCount);
        window.localStorage.setItem(
          "hiresap_questions_asked",
          String(newCount)
        );
      }

      /*
        HISTORY SAVE
        Har question+answer ko localStorage mein save karo taaki
        'My History' page pe dikhaya ja sake. Sirf browser mein
        save hota hai (koi database nahi), isliye dusre device
        pe wahi history nahi dikhegi - sirf isi browser mein.
      */
      try {
        const existingHistory = JSON.parse(
          window.localStorage.getItem("hiresap_history") || "[]"
        );

        const newEntry = {
          question: finalQuestion,
          answer: data.answer || "",
          module: sapModule,
          language,
          timestamp: new Date().toISOString(),
        };

        const updatedHistory = [newEntry, ...existingHistory].slice(0, 100);

        window.localStorage.setItem(
          "hiresap_history",
          JSON.stringify(updatedHistory)
        );
      } catch (historyError) {
        console.error("HISTORY SAVE ERROR:", historyError);
      }
    } catch (error) {
      console.error("ASK SAP ERROR:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",

          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Unable to connect to HireSAP AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    askSAP();
  }

  return (
    <main className="h-screen overflow-hidden bg-[#050816] text-white">
      <div className="mx-auto flex h-full max-w-[1500px]">
        {/* =========================================
            LEFT SIDEBAR
        ========================================= */}

        <aside className="hidden h-full w-[270px] shrink-0 overflow-y-auto border-r border-cyan-900/40 bg-[#0b1326] p-5 lg:block">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-cyan-400">HireSAP AI</h1>

            <p className="mt-2 text-sm text-slate-400">
              SAP Visual Assistant
            </p>
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-300">
            SAP Module
          </label>

          {/*
            MODULE BUTTONS (replaces the old dropdown)
            Click any button to switch module - the sample
            questions below change automatically.
          */}

          <div className="mb-7 grid grid-cols-2 gap-2">
            {MODULE_OPTIONS.map((mod) => (
              <button
                key={mod}
                onClick={() => setSapModule(mod)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  sapModule === mod
                    ? "border-cyan-400 bg-cyan-500 text-black"
                    : "border-slate-700 bg-[#080f20] text-slate-300 hover:border-cyan-500"
                }`}
              >
                {mod.replace(/^SAP\s+/, "")}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Try Asking
          </p>

          <div className="space-y-3">
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                onClick={() => askSAP(item)}
                disabled={loading || limitReached}
                className="w-full rounded-lg border border-slate-700 bg-[#0b1428] p-3 text-left text-sm text-slate-300 transition hover:border-cyan-500 hover:text-white disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        {/* =========================================
            MAIN AREA
        ========================================= */}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* HEADER */}

          <header className="shrink-0 border-b border-cyan-900/40 bg-[#091123] px-5 py-5 md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  SAP AI Assistant
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Selected module:{" "}
                  <span className="text-cyan-400">{sapModule}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-400">
                  Visual SAP Guide
                </div>

                {/*
                  LANGUAGE TOGGLE
                  Click karke English/Hindi switch karo.
                */}
                <button
                  onClick={() =>
                    setLanguage((prev) => (prev === "en" ? "hi" : "en"))
                  }
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
                >
                  {language === "en" ? "हिंदी" : "English"}
                </button>

                <Link
                  href="/history"
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
                >
                  History
                </Link>

                <Link
                  href="/About"
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
                >
                  About
                </Link>
              </div>
            </div>
          </header>

          {/* =========================================
              CHAT AREA

              IMPORTANT:
              Only this section scrolls.
          ========================================= */}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-[1100px] space-y-6">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={index}
                    className={
                      isUser ? "flex justify-end" : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        isUser
                          ? "max-w-[85%] rounded-2xl bg-cyan-500 px-5 py-4 text-black shadow-lg"
                          : "w-full max-w-[1000px] rounded-2xl border border-slate-700 bg-[#10182c] px-5 py-5 text-white shadow-lg"
                      }
                    >
                      <div
                        className={
                          isUser
                            ? "mb-2 text-xs font-bold uppercase text-black/70"
                            : "mb-3 text-xs font-bold uppercase text-slate-500"
                        }
                      >
                        {isUser ? "YOU" : "SAP AI AGENT"}
                      </div>

                      {/* ANSWER */}

                      <div
                        className={
                          isUser
                            ? "whitespace-pre-wrap text-sm leading-7"
                            : "whitespace-pre-wrap text-sm leading-7 text-slate-200"
                        }
                      >
                        {message.content}
                      </div>

                      {/* =================================
                          VISUAL GUIDE
                          Images ab GRID mein aur CHHOTI size mein
                          dikhengi (pehle full-width, max-h-650px thi).
                      ================================= */}

                      {!isUser &&
                        message.visuals &&
                        message.visuals.length > 0 && (
                          <div className="mt-8 border-t border-slate-700 pt-7">
                            <div className="mb-6 flex items-center justify-between">
                              <div>
                                <h3 className="text-xl font-bold text-cyan-400">
                                  Visual SAP Guide
                                </h3>

                                <p className="mt-1 text-sm text-slate-400">
                                  Images matched to the actual SAP steps.
                                </p>
                              </div>

                              <div className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-400">
                                {message.visuals.length} VISUALS
                              </div>
                            </div>

                            {/*
                              GRID LAYOUT: 2 columns on medium screens,
                              3 on large screens - images sit side by
                              side instead of stacking full-width.
                            */}

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                              {message.visuals.map((visual, visualIndex) => (
                                <div
                                  key={`${visual.step}-${visualIndex}`}
                                  className="overflow-hidden rounded-2xl border border-cyan-800/50 bg-[#081020]"
                                >
                                  {/* STEP HEADER */}

                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-[#0c172b] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-black">
                                        {visual.step}
                                      </div>

                                      <h4 className="text-sm font-bold text-white">
                                        {visual.title}
                                      </h4>
                                    </div>
                                  </div>

                                  {/*
                                    IMAGE - size control.
                                    Change max-h-[180px] below to make
                                    images bigger or smaller (e.g.
                                    max-h-[220px] for slightly bigger).
                                  */}

                                  <div className="bg-[#020617] p-3">
                                    <div className="overflow-hidden rounded-xl border border-slate-700 bg-black">
                                      <img
                                        src={visual.image}
                                        alt={`SAP ${visual.title} screenshot`}
                                        className="block max-h-[180px] w-full object-cover"
                                        loading="lazy"
                                        onError={(event) => {
                                          const img = event.currentTarget;

                                          if (
                                            visual.fallbackImage &&
                                            img.src !== visual.fallbackImage
                                          ) {
                                            img.src = visual.fallbackImage;
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* IMAGE INFORMATION */}

                                  <div className="border-t border-slate-700 px-4 py-3">
                                    {visual.sourceUrl && (
                                      <a
                                        href={visual.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                                      >
                                        View Source
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* SPEAK BUTTON */}

                      {!isUser && (
                        <button
                          onClick={() => {
                            if ("speechSynthesis" in window) {
                              const speech = new SpeechSynthesisUtterance(
                                message.content
                              );

                              window.speechSynthesis.speak(speech);
                            }
                          }}
                          className="mt-5 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
                        >
                          Speak
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* LOADING */}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-700 bg-[#10182c] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />

                      <p className="text-sm text-slate-400">
                        HireSAP AI is creating the SAP guide and searching
                        Google Images...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================
              FIXED QUESTION AREA / SIGNUP GATE

              This stays at the bottom.
          ========================================= */}

          <div className="shrink-0 border-t border-cyan-900/40 bg-[#070d1c] p-4 md:p-6">
            {limitReached ? (
              /*
                LEAD CAPTURE FORM
                Jab 5 free questions khatam ho jaayein.
              */
              <form
                onSubmit={submitLead}
                className="mx-auto flex max-w-[600px] flex-col gap-3"
              >
                <p className="text-center text-sm text-slate-300">
                  You've used your {FREE_QUESTION_LIMIT} free questions.
                  Enter your name and email to keep asking for free.
                </p>

                <input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-xl border border-slate-700 bg-[#020617] px-5 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />

                <input
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  type="email"
                  placeholder="Your email"
                  className="rounded-xl border border-slate-700 bg-[#020617] px-5 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />

                {leadError && (
                  <p className="text-center text-xs text-red-400">
                    {leadError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="rounded-xl bg-cyan-500 px-7 py-3 font-bold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {leadSubmitting ? "..." : "Continue for Free"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mx-auto flex max-w-[1100px] gap-3"
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  disabled={loading}
                  placeholder="Ask your SAP question..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#020617] px-5 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="rounded-xl bg-cyan-500 px-7 py-4 font-bold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "..." : "Send"}
                </button>
              </form>
            )}

            {!limitReached && checkedStorage && !hasUnlocked && (
              <p className="mx-auto mt-2 max-w-[1100px] text-center text-xs text-slate-500">
                {FREE_QUESTION_LIMIT - questionsAsked} free question
                {FREE_QUESTION_LIMIT - questionsAsked === 1 ? "" : "s"}{" "}
                remaining
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}