"use client";

import { useState } from "react";

type Question = string;

const modules = [
  "SAP MM",
  "SAP FICO",
  "SAP ABAP",
  "SAP SD",
  "SAP PP",
  "SAP Basis",
  "SAP HANA",
  "SAP TM",
  "SAP EWM",
  "SAP GTS",
];

const fallbackQuestions: Record<string, Question[]> = {
  "SAP MM": [
    "Tell me about your latest SAP S/4HANA MM implementation project.",
    "Explain the complete Procure-to-Pay process in SAP MM.",
    "How do you configure the PR/PO release strategy?",
    "Explain the integration between MM and FI.",
    "Which T-codes do you commonly use for purchase orders and goods receipts?",
    "A PO is created but the expected price is incorrect. How would you troubleshoot it?",
    "How would you troubleshoot an invoice verification issue in MIRO?",
    "Explain your experience with MRP and material planning.",
  ],

  "SAP FICO": [
    "Tell me about your latest SAP S/4HANA FICO implementation project.",
    "Explain the Automatic Payment Program and its configuration.",
    "How do you configure Electronic Bank Statements?",
    "Explain FI-GL, AP and AR integration.",
    "Which important FICO T-codes have you used in your projects?",
    "A vendor invoice is posted but the accounting document is incorrect. How would you troubleshoot it?",
    "Explain your experience with bank reconciliation.",
    "Explain the integration between FICO and MM/SD.",
  ],

  "SAP ABAP": [
    "Tell me about your latest SAP S/4HANA ABAP development project.",
    "Explain your experience with RICEF objects.",
    "How have you used CDS Views in S/4HANA?",
    "Explain your experience with OData and RESTful APIs.",
    "What is the difference between BAPI, BAdI, User Exit and Enhancement?",
    "Which ABAP debugging techniques do you commonly use?",
    "A custom report is running very slowly in production. How would you troubleshoot it?",
    "Explain your experience with Adobe Forms and interfaces.",
  ],

  "SAP SD": [
    "Tell me about your latest SAP S/4HANA SD implementation project.",
    "Explain the complete Order-to-Cash process.",
    "How do you configure pricing procedures in SAP SD?",
    "Explain SD integration with FI and MM.",
    "Which T-codes do you commonly use in SAP SD?",
    "A sales order is not determining the expected price. How would you troubleshoot it?",
    "How would you troubleshoot a billing document posting issue?",
    "Explain your experience with delivery, picking, packing and PGI.",
  ],

  "SAP PP": [
    "Tell me about your latest SAP PP implementation project.",
    "Explain the complete production planning process.",
    "Explain MRP and its configuration.",
    "How do production orders work in SAP PP?",
    "Which T-codes do you commonly use in SAP PP?",
    "MRP is not generating the expected planned order. How would you troubleshoot it?",
    "Explain capacity planning in SAP PP.",
    "Explain your experience with shop floor control.",
  ],

  "SAP Basis": [
    "Tell me about your latest SAP Basis project.",
    "Explain SAP system architecture.",
    "How do you monitor an SAP production system?",
    "Explain SAP HANA database backup and recovery.",
    "Which Basis T-codes do you commonly use?",
    "A production SAP system is running slowly. How would you troubleshoot it?",
    "Explain system refresh and client copy.",
    "Explain your experience with SAP upgrades and patches.",
  ],

  "SAP HANA": [
    "Tell me about your latest SAP HANA project.",
    "Explain SAP HANA architecture.",
    "What is the difference between row store and column store?",
    "Explain HANA backup and recovery.",
    "Which HANA administration tools have you used?",
    "A HANA system is consuming excessive memory. How would you troubleshoot it?",
    "Explain HANA performance optimization.",
    "Explain your experience with HANA migration.",
  ],

  "SAP TM": [
    "Tell me about your latest SAP Transportation Management project.",
    "Explain the end-to-end transportation management process.",
    "Explain freight order and freight unit concepts.",
    "How does SAP TM integrate with SAP S/4HANA?",
    "Which SAP TM transactions or applications have you used?",
    "A freight order is not being created automatically. How would you troubleshoot it?",
    "Explain transportation planning and optimization.",
    "Explain your experience with carrier and freight settlement.",
  ],

  "SAP EWM": [
    "Tell me about your latest SAP EWM project.",
    "Explain the inbound and outbound EWM processes.",
    "Explain warehouse task and warehouse order concepts.",
    "How does EWM integrate with SAP S/4HANA?",
    "Which EWM transactions have you used?",
    "A warehouse task is not being created. How would you troubleshoot it?",
    "Explain picking, packing and goods issue in EWM.",
    "Explain your experience with RF framework.",
  ],

  "SAP GTS": [
    "Tell me about your latest SAP GTS project.",
    "Explain the SAP GTS compliance process.",
    "Explain legal control and export control.",
    "How does SAP GTS integrate with SAP S/4HANA?",
    "Which SAP GTS transactions or applications have you used?",
    "A business transaction is blocked by compliance screening. How would you troubleshoot it?",
    "Explain sanctioned party list screening.",
    "Explain your experience with customs management.",
  ],
};

export default function Home() {
  const [candidateName, setCandidateName] = useState("");
  const [sapModule, setSapModule] = useState("SAP MM");
  const [resume, setResume] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  async function generateInterview() {
    setError("");
    setLoading(true);
    setInterviewStarted(false);
    setCurrentQuestion(0);

    try {
      const response = await fetch("/api/generate-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateName,
          sapModule,
          resume,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error || "Failed to generate interview questions."
        );
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No interview questions were returned.");
      }

      setQuestions(data.questions);
    } catch (err) {
      console.error(err);

      /*
       * If the Anthropic API has no credits, use the built-in
       * SAP question bank so the local application continues working.
       */
      setQuestions(fallbackQuestions[sapModule] || fallbackQuestions["SAP MM"]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate interview questions."
      );
    } finally {
      setLoading(false);
    }
  }

  function startInterview() {
    if (questions.length === 0) {
      setError("Please generate the interview first.");
      return;
    }

    setInterviewStarted(true);
    setCurrentQuestion(0);

    setTimeout(() => {
      document
        .getElementById("live-interview")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    }
  }

  function previousQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1);
    }
  }

  function exportQuestions() {
    if (questions.length === 0) {
      setError("Please generate interview questions first.");
      return;
    }

    const text = [
      `HIRE SAP AI - ${sapModule} Interview`,
      `Candidate: ${candidateName || "Candidate"}`,
      "",
      ...questions.map(
        (question, index) => `Question ${index + 1}: ${question}`
      ),
    ].join("\n");

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${sapModule.replace(/\s+/g, "_")}_Interview_Questions.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              Hire<span className="text-cyan-400">SAP</span> AI
            </h1>

            <p className="text-sm text-slate-400">
              AI-powered SAP interview platform
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="rounded-full border border-emerald-700 px-4 py-1 text-xs text-emerald-400">
              MVP
            </span>

            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Recruiter Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <p className="mb-3 text-sm font-medium text-cyan-400">
          SAP RECRUITING ASSISTANT
        </p>

        <h2 className="text-5xl font-bold leading-tight">
          Conduct better SAP interviews{" "}
          <span className="text-cyan-400">with AI.</span>
        </h2>

        <p className="mt-5 max-w-3xl text-lg text-slate-400">
          Upload a candidate profile, select the SAP skill area, and create a
          structured technical interview with project, T-code and
          scenario-based questions.
        </p>
      </section>

      {/* CANDIDATE FORM */}
      <section className="mx-auto grid max-w-7xl gap-7 px-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-700 bg-[#111827] p-7">
          <h3 className="text-2xl font-bold">Candidate Profile</h3>

          <p className="mt-2 text-sm text-slate-400">
            Enter candidate information to prepare the interview.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* NAME */}
            <div>
              <label className="mb-2 block text-sm text-slate-200">
                Candidate name
              </label>

              <input
                value={candidateName}
                onChange={(event) => setCandidateName(event.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-4 text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* MODULE */}
            <div>
              <label className="mb-2 block text-sm text-slate-200">
                SAP module
              </label>

              <select
                value={sapModule}
                onChange={(event) => setSapModule(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-4 text-white outline-none focus:border-cyan-400"
              >
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RESUME */}
          <div className="mt-6">
            <label className="mb-2 block text-sm text-slate-200">
              Resume / Project Experience
            </label>

            <textarea
              value={resume}
              onChange={(event) => setResume(event.target.value)}
              placeholder="Paste candidate resume, project experience, skills, T-codes, implementation experience, etc."
              rows={7}
              className="w-full resize-y rounded-xl border border-slate-700 bg-[#020617] px-4 py-4 text-white outline-none focus:border-cyan-400"
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-700 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* GENERATE */}
          <button
            onClick={generateInterview}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating Interview..." : "Generate SAP Interview"}
          </button>
        </div>

        {/* BLUEPRINT */}
        <aside className="rounded-2xl border border-slate-700 bg-[#111827] p-7">
          <h3 className="text-xl font-bold">Interview Blueprint</h3>

          <div className="mt-7 space-y-5">
            {[
              "Project Experience",
              "Technical Skills",
              "T-Codes",
              "Scenario Questions",
              "Follow-up Questions",
              "Candidate Evaluation",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm text-cyan-400">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="text-slate-200">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-cyan-700 bg-cyan-950/20 p-5">
            <p className="text-xs text-cyan-400">SELECTED MODULE</p>

            <p className="mt-2 text-xl font-bold">{sapModule}</p>

            <p className="mt-2 text-sm text-slate-400">
              Interview questions will be tailored to this SAP module.
            </p>
          </div>
        </aside>
      </section>

      {/* GENERATED QUESTIONS */}
      {questions.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-6">
          <div className="rounded-2xl border border-slate-700 bg-[#111827] p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-cyan-400">
                  INTERVIEW GENERATED
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  {sapModule} Interview Questions
                </h3>

                <p className="mt-1 text-slate-400">
                  Candidate: {candidateName || "Candidate"}
                </p>
              </div>

              <span className="rounded-full bg-slate-800 px-5 py-2 text-sm">
                {questions.length} questions
              </span>
            </div>

            {/* QUESTIONS */}
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {questions.map((question, index) => (
                <div
                  key={`${question}-${index}`}
                  className={`rounded-xl border p-6 transition ${
                    interviewStarted && currentQuestion === index
                      ? "border-cyan-400 bg-cyan-950/20"
                      : "border-slate-800 bg-[#020617]"
                  }`}
                >
                  <p className="text-xs font-bold text-cyan-400">
                    QUESTION {index + 1}
                  </p>

                  <p className="mt-4 text-lg leading-7 text-slate-100">
                    {question}
                  </p>
                </div>
              ))}
            </div>

            {/* BUTTONS */}
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={startInterview}
                className="rounded-xl bg-white px-7 py-4 font-bold text-slate-950 hover:bg-slate-200"
              >
                Start Interview
              </button>

              <button
                onClick={exportQuestions}
                className="rounded-xl border border-slate-600 px-7 py-4 text-white hover:bg-slate-800"
              >
                Export Questions
              </button>
            </div>
          </div>
        </section>
      )}

      {/* LIVE INTERVIEW */}
      {interviewStarted && questions.length > 0 && (
        <section
          id="live-interview"
          className="mx-auto mt-10 max-w-7xl px-6 pb-16"
        >
          <div className="rounded-2xl border border-cyan-700 bg-[#111827] p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-cyan-400">
                  LIVE INTERVIEW
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  Question {currentQuestion + 1} of {questions.length}
                </h3>
              </div>

              <div className="rounded-full bg-slate-800 px-5 py-2 text-sm">
                {Math.round(
                  ((currentQuestion + 1) / questions.length) * 100
                )}
                % complete
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-700 bg-[#020617] p-8">
              <p className="text-sm font-bold text-cyan-400">
                INTERVIEW QUESTION
              </p>

              <h4 className="mt-5 text-2xl font-semibold leading-relaxed">
                {questions[currentQuestion]}
              </h4>

              <div className="mt-10 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{
                    width: `${
                      ((currentQuestion + 1) / questions.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-4">
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
                className="rounded-xl border border-slate-600 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  onClick={() => setInterviewStarted(false)}
                  className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950"
                >
                  Finish Interview
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}