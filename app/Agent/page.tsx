"use client";

import { useState } from "react";

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

const suggestedQuestions = [
  "How do I create a Material in SAP MM?",
  "How do I create a Purchase Order in SAP MM?",
  "How do I create a Purchase Requisition in SAP MM?",
  "How do I post a Goods Receipt in SAP MM?",
  "How do I post a Vendor Invoice in SAP MM?",
];

export default function AgentPage() {
  const [sapModule, setSapModule] =
    useState("SAP MM");

  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "assistant",
        content:
          "Hello! I am HireSAP AI. Ask me how to perform an SAP activity.",
      },
    ]);

  async function askSAP(
    customQuestion?: string
  ) {
    const finalQuestion =
      customQuestion !== undefined
        ? customQuestion
        : question;

    if (!finalQuestion.trim()) {
      return;
    }

    if (loading) {
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
      const response =
        await fetch("/api/agent", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message:
              finalQuestion,

            sapModule,
          }),
        });

      /*
        Check HTTP status before parsing JSON.
      */

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          `Server error ${response.status}: ${text}`
        );
      }

      const data =
        await response.json();

      console.log(
        "AGENT RESPONSE:",
        data
      );

      if (!data.success) {
        throw new Error(
          data.error ||
            "AI request failed."
        );
      }

      /*
        Add AI answer + visual guide.
      */

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",

          content:
            data.answer ||
            "No answer was returned.",

          visuals:
            Array.isArray(
              data.visuals
            )
              ? data.visuals
              : [],
        },
      ]);
    } catch (error) {
      console.error(
        "ASK SAP ERROR:",
        error
      );

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

  function handleSubmit(
    event: React.FormEvent
  ) {
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
            <h1 className="text-2xl font-bold text-cyan-400">
              HireSAP AI
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              SAP Visual Assistant
            </p>
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-300">
            SAP Module
          </label>

          <select
            value={sapModule}
            onChange={(event) =>
              setSapModule(
                event.target.value
              )
            }
            className="mb-7 w-full rounded-lg border border-slate-600 bg-[#080f20] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option>SAP MM</option>
            <option>SAP FICO</option>
            <option>SAP SD</option>
            <option>SAP PP</option>
            <option>SAP ABAP</option>
            <option>SAP Basis</option>
            <option>SAP HANA</option>
            <option>SAP EWM</option>
            <option>SAP TM</option>
            <option>SAP Concur</option>
          </select>

          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Try Asking
          </p>

          <div className="space-y-3">
            {suggestedQuestions.map(
              (item) => (
                <button
                  key={item}
                  onClick={() =>
                    askSAP(item)
                  }
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-700 bg-[#0b1428] p-3 text-left text-sm text-slate-300 transition hover:border-cyan-500 hover:text-white disabled:opacity-50"
                >
                  {item}
                </button>
              )
            )}
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
                  Selected module:
                  {" "}
                  <span className="text-cyan-400">
                    {sapModule}
                  </span>
                </p>
              </div>

              <div className="rounded-lg bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-400">
                Visual SAP Guide
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

              {messages.map(
                (message, index) => {

                  const isUser =
                    message.role ===
                    "user";

                  return (
                    <div
                      key={index}
                      className={
                        isUser
                          ? "flex justify-end"
                          : "flex justify-start"
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
                          {isUser
                            ? "YOU"
                            : "SAP AI AGENT"}
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
                        ================================= */}

                        {!isUser &&
                          message.visuals &&
                          message.visuals.length >
                            0 && (
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

                              <div className="space-y-8">

                                {message.visuals.map(
                                  (
                                    visual,
                                    visualIndex
                                  ) => (

                                    <div
                                      key={`${visual.step}-${visualIndex}`}
                                      className="overflow-hidden rounded-2xl border border-cyan-800/50 bg-[#081020]"
                                    >

                                      {/* STEP HEADER */}

                                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-[#0c172b] px-5 py-4">

                                        <div className="flex items-center gap-3">

                                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 font-bold text-black">
                                            {visual.step}
                                          </div>

                                          <div>
                                            <h4 className="font-bold text-white">
                                              {visual.title}
                                            </h4>

                                            <p className="text-xs text-slate-500">
                                              Visual step {visual.step}
                                            </p>
                                          </div>

                                        </div>

                                        <span className="rounded-md bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">
                                          SAP SCREEN
                                        </span>

                                      </div>

                                      {/* IMAGE */}

                                      <div className="bg-[#020617] p-4">

                                        <div className="overflow-hidden rounded-xl border border-slate-700 bg-black">

                                          <img
                                            src={
                                              visual.image
                                            }

                                            alt={
                                              `SAP ${visual.title} screenshot`
                                            }

                                            className="block h-auto max-h-[650px] w-full object-contain"

                                            loading="lazy"

                                            onError={(
                                              event
                                            ) => {
                                              const img =
                                                event.currentTarget;

                                              /*
                                                If the original image
                                                refuses to load,
                                                automatically use the
                                                SerpApi thumbnail.
                                              */

                                              if (
                                                visual.fallbackImage &&
                                                img.src !==
                                                  visual.fallbackImage
                                              ) {
                                                img.src =
                                                  visual.fallbackImage;
                                              }
                                            }}
                                          />

                                        </div>

                                      </div>

                                      {/* IMAGE INFORMATION */}

                                      <div className="border-t border-slate-700 px-5 py-4">

                                        <p className="text-xs text-slate-500">
                                          Image search:
                                        </p>

                                        <p className="mt-1 text-xs text-slate-300">
                                          {visual.query}
                                        </p>

                                        {visual.sourceUrl && (
                                          <a
                                            href={
                                              visual.sourceUrl
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-3 inline-block text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                                          >
                                            View Source
                                          </a>
                                        )}

                                      </div>

                                    </div>

                                  )
                                )}

                              </div>

                            </div>
                          )}

                        {/* SPEAK BUTTON */}

                        {!isUser && (
                          <button
                            onClick={() => {
                              if (
                                "speechSynthesis" in
                                window
                              ) {
                                const speech =
                                  new SpeechSynthesisUtterance(
                                    message.content
                                  );

                                window.speechSynthesis.speak(
                                  speech
                                );
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
                }
              )}

              {/* LOADING */}

              {loading && (
                <div className="flex justify-start">

                  <div className="rounded-2xl border border-slate-700 bg-[#10182c] px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />

                      <p className="text-sm text-slate-400">
                        HireSAP AI is creating the SAP guide and searching Google Images...
                      </p>

                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* =========================================
              FIXED QUESTION AREA

              This stays at the bottom.
          ========================================= */}

          <div className="shrink-0 border-t border-cyan-900/40 bg-[#070d1c] p-4 md:p-6">

            <form
              onSubmit={
                handleSubmit
              }
              className="mx-auto flex max-w-[1100px] gap-3"
            >

              <input
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="Ask your SAP question..."
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#020617] px-5 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !question.trim()
                }
                className="rounded-xl bg-cyan-500 px-7 py-4 font-bold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? "..."
                  : "Send"}
              </button>

            </form>

          </div>

        </section>

      </div>
    </main>
  );
}