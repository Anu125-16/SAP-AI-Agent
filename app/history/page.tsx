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
    <main className="min-h-screen bg-[#050816] text-white">
      <header className="border-b border-cyan-900/40 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/Agent" className="text-xl font-bold text-cyan-400">
            HireSAP AI
          </Link>

          <div className="flex gap-3">
            <Link
              href="/Agent"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-400"
            >
              Back to Assistant
            </Link>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 hover:border-red-500"
              >
                Clear History
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white">My Question History</h1>
        <p className="mt-2 text-sm text-slate-400">
          This history is saved only in this browser. It will not appear on
          another device.
        </p>

        {!loaded ? (
          <p className="mt-8 text-slate-500">Loading...</p>
        ) : history.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-700 bg-[#0b1326] p-8 text-center">
            <p className="text-slate-400">
              You haven't asked any questions yet.
            </p>
            <Link
              href="/Agent"
              className="mt-4 inline-block rounded-lg bg-cyan-500 px-6 py-3 font-bold text-black hover:bg-cyan-400"
            >
              Ask your first question
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {history.map((entry, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-700 bg-[#0b1326] p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 font-semibold text-cyan-400">
                    {entry.module}
                  </span>
                  <span>{entry.language === "hi" ? "हिंदी" : "English"}</span>
                  <span>
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="font-semibold text-white">{entry.question}</p>

                <p className="mt-2 whitespace-pre-line text-sm text-slate-300">
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