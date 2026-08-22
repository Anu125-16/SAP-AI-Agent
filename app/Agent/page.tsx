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
  detectedModule?: string;
};

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
  "Tally",
  "Zoho Books",
  "Odoo",
  "Oracle ERP",
  "Microsoft Dynamics 365",
];

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
  "SAP EWM": ["How do I create a warehouse task in SAP EWM?"],
  "SAP TM": ["How do I create a freight order in SAP TM?"],
  "SAP Concur": ["How do I submit an expense report in Concur?"],
  Automation: [
    "How can I automate SAP data entry?",
    "What tools automate SAP testing?",
    "How does RPA work with SAP?",
  ],
  Tally: [
    "How do I pass a Journal Entry in Tally?",
    "How do I create a new Company in Tally?",
    "How do I create a Sales Voucher in Tally?",
    "How do I check GST reports in Tally?",
    "How do I create a Ledger in Tally?",
  ],
  "Zoho Books": [
    "How do I create an Invoice in Zoho Books?",
    "How do I record an Expense in Zoho Books?",
    "How do I reconcile a Bank Account in Zoho Books?",
  ],
  Odoo: [
    "How do I create a Sales Order in Odoo?",
    "How do I manage Inventory in Odoo?",
    "How do I set up Accounting in Odoo?",
  ],
  "Oracle ERP": [
    "How do I create a Purchase Order in Oracle ERP?",
    "How do I post a Journal Entry in Oracle Fusion?",
  ],
  "Microsoft Dynamics 365": [
    "How do I create a Sales Order in Dynamics 365?",
    "How do I post a Journal Entry in Dynamics 365 Finance?",
  ],
};

export default function AgentPage() {
  const [sapModule, setSapModule] = useState("SAP MM");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  // Mobile: sidebar collapsed by default, toggle to show
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        "Hello! I am ERP Tutor AI. Ask me how to perform an SAP activity.",
    },
  ]);

  const suggestedQuestions = SUGGESTED_QUESTIONS[sapModule] || [];

  async function askSAP(customQuestion?: string) {
    const finalQuestion =
      customQuestion !== undefined ? customQuestion : question;

    if (!finalQuestion.trim()) return;
    if (loading) return;
    if (limitReached) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: finalQuestion },
    ]);

    setQuestion("");
    setLoading(true);
    setMobileMenuOpen(false);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalQuestion,
          sapModule,
          language,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "AI request failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer || "No answer was returned.",
          visuals: Array.isArray(data.visuals) ? data.visuals : [],
          detectedModule:
            typeof data.detectedModule === "string"
              ? data.detectedModule
              : undefined,
        },
      ]);

      if (!hasUnlocked) {
        const newCount = questionsAsked + 1;
        setQuestionsAsked(newCount);
        window.localStorage.setItem(
          "hiresap_questions_asked",
          String(newCount)
        );
      }

      try {
        const existingHistory = JSON.parse(
          window.localStorage.getItem("hiresap_history") || "[]"
        );

        const newEntry = {
          question: finalQuestion,
          answer: data.answer || "",
          module: sapModule,
          detectedModule: data.detectedModule || "",
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
              : "Unable to connect to ERP Tutor AI.",
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
    <main className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 lg:flex-row">
      {/* =========================================
          MOBILE TOP BAR (only visible on small screens)
      ========================================= */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-lg font-bold text-cyan-600">ERP Tutor AI</span>
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {/* =========================================
          SIDEBAR
          Desktop: always visible, fixed width.
          Mobile: toggled open/closed, full width, same content.
      ========================================= */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } w-full shrink-0 flex-col overflow-y-auto border-b border-slate-200 bg-white p-5 lg:flex lg:w-72 lg:border-b-0 lg:border-r`}
      >
        <div className="mb-6 hidden lg:block">
          <h1 className="text-2xl font-bold text-cyan-600">ERP Tutor AI</h1>
          <p className="mt-1 text-sm text-slate-500">SAP Visual Assistant</p>
        </div>

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          SAP Module
        </label>

        <div className="mb-6 grid grid-cols-2 gap-2">
          {MODULE_OPTIONS.map((mod) => (
            <button
              key={mod}
              onClick={() => setSapModule(mod)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                sapModule === mod
                  ? "border-cyan-600 bg-cyan-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500"
              }`}
            >
              {mod.replace(/^SAP\s+/, "")}
            </button>
          ))}
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Try Asking
        </p>

        <div className="space-y-2">
          {suggestedQuestions.map((item) => (
            <button
              key={item}
              onClick={() => askSAP(item)}
              disabled={loading || limitReached}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-700 transition hover:border-cyan-500 hover:bg-white disabled:opacity-50"
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
        {/* HEADER - hidden on mobile since top bar already shows brand */}
        <header className="hidden shrink-0 border-b border-slate-200 bg-white px-5 py-5 lg:block lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                ERP Tutor AI Assistant
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Selected module:{" "}
                <span className="text-cyan-600">{sapModule}</span>
                <span className="ml-1 text-xs text-slate-400">
                  (the AI will auto-detect the correct module for your
                  question)
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">
                Visual SAP Guide
              </div>

              <button
                onClick={() =>
                  setLanguage((prev) => (prev === "en" ? "hi" : "en"))
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-600"
              >
                {language === "en" ? "हिंदी" : "English"}
              </button>

              <Link
                href="/history"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-600"
              >
                History
              </Link>

              <Link
                href="/about"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-600"
              >
                About
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile controls row (language/history/about) below top bar */}
        <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <button
            onClick={() =>
              setLanguage((prev) => (prev === "en" ? "hi" : "en"))
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {language === "en" ? "हिंदी" : "English"}
          </button>
          <Link
            href="/history"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            History
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            About
          </Link>
        </div>

        {/* CHAT AREA */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[1100px] space-y-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={index}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[90%] rounded-2xl bg-cyan-600 px-5 py-4 text-white shadow-sm sm:max-w-[85%]"
                        : "w-full max-w-[1000px] rounded-2xl border border-slate-200 bg-white px-5 py-5 text-slate-900 shadow-sm"
                    }
                  >
                    <div
                      className={
                        isUser
                          ? "mb-2 flex items-center gap-2 text-xs font-bold uppercase text-white/80"
                          : "mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-slate-400"
                      }
                    >
                      <span>{isUser ? "YOU" : "ERP TUTOR AI"}</span>

                      {!isUser && message.detectedModule && (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold normal-case tracking-normal text-cyan-700">
                          Answered for: {message.detectedModule}
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        isUser
                          ? "whitespace-pre-wrap text-sm leading-7"
                          : "whitespace-pre-wrap text-sm leading-7 text-slate-700"
                      }
                    >
                      {message.content}
                    </div>

                    {!isUser && message.visuals && message.visuals.length > 0 && (
                      <div className="mt-8 border-t border-slate-200 pt-7">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xl font-bold text-cyan-700">
                              Visual SAP Guide
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              Images matched to the actual SAP steps.
                            </p>
                          </div>
                          <div className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700">
                            {message.visuals.length} VISUALS
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                          {message.visuals.map((visual, visualIndex) => (
                            <div
                              key={`${visual.step}-${visualIndex}`}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                                    {visual.step}
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-800">
                                    {visual.title}
                                  </h4>
                                </div>
                              </div>

                              <div className="bg-white p-3">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
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

                              <div className="border-t border-slate-200 px-4 py-3">
                                {visual.sourceUrl && (
                                  <a
                                    href={visual.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
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
                        className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-cyan-500 hover:text-cyan-600"
                      >
                        Speak
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-600" />
                    <p className="text-sm text-slate-500">
                      ERP Tutor AI is creating the SAP guide and searching
                      Google Images...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QUESTION INPUT / SIGNUP GATE */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4 md:p-6">
          {limitReached ? (
            <form
              onSubmit={submitLead}
              className="mx-auto flex max-w-[600px] flex-col gap-3"
            >
              <p className="text-center text-sm text-slate-600">
                You've used your {FREE_QUESTION_LIMIT} free questions. Enter
                your name and email to keep asking for free.
              </p>

              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500"
              />

              <input
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                type="email"
                placeholder="Your email"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500"
              />

              {leadError && (
                <p className="text-center text-xs text-red-600">
                  {leadError}
                </p>
              )}

              <button
                type="submit"
                disabled={leadSubmitting}
                className="rounded-xl bg-cyan-600 px-7 py-3 font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-5 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-xl bg-cyan-600 px-7 py-4 font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "..." : "Send"}
              </button>
            </form>
          )}

          {!limitReached && checkedStorage && !hasUnlocked && (
            <p className="mx-auto mt-2 max-w-[1100px] text-center text-xs text-slate-400">
              {FREE_QUESTION_LIMIT - questionsAsked} free question
              {FREE_QUESTION_LIMIT - questionsAsked === 1 ? "" : "s"}{" "}
              remaining
            </p>
          )}
        </div>
      </section>
    </main>
  );
}