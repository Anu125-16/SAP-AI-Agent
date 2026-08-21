"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HistoryEntry = {
  question: string;
  answer: string;
  module: string;
  language: "en" | "hi";
  timestamp: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem("hiresap_history") || "[]"
      );
      setHistory(Array.isArray(saved) ? saved : []);
    } catch {
      setHistory([]);
    }
    setLoaded(true);
  }, []);

  function clearHistory() {
    window.localStorage.removeItem("hiresap_history");
    setHistory([]);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <Link href="/Agent" className="text-xl font-bold text-cyan-600">
            ERP Tutor AI
          </Link>

          <div className="flex gap-3">
            <Link
              href="/Agent"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-500 hover:text-cyan-600"
            >
              Back to Assistant
            </Link>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-500"
              >
                Clear History
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">
          My Question History
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This history is saved only in this browser. It will not appear on
          another device.
        </p>

        {!loaded ? (
          <p className="mt-8 text-slate-400">Loading...</p>
        ) : history.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">
              You haven't asked any questions yet.
            </p>
            <Link
              href="/Agent"
              className="mt-4 inline-block rounded-lg bg-cyan-600 px-6 py-3 font-bold text-white hover:bg-cyan-500"
            >
              Ask your first question
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {history.map((entry, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-cyan-50 px-3 py-1 font-semibold text-cyan-700">
                    {entry.module}
                  </span>
                  <span>{entry.language === "hi" ? "हिंदी" : "English"}</span>
                  <span>{new Date(entry.timestamp).toLocaleString()}</span>
                </div>

                <p className="font-semibold text-slate-900">
                  {entry.question}
                </p>

                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                  {entry.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}