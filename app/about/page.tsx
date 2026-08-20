import Link from "next/link";

/*
==================================================
HOW TO USE THIS FILE
==================================================

1. Apne project mein ek naya folder banao: app/about
2. Is file ko us folder ke andar "page.tsx" naam se save karo.
   Final path: app/about/page.tsx
3. Save karke deploy karo (jaise pehle kiya tha - commit + push).
4. Ye page yahan open hoga: yoursite.com/about

Jahan bhi CHANGE THIS likha hai, apni details daal do.
*/

const MODULES = [
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

const FEATURES = [
  {
    title: "Step-by-Step Answers",
    description:
      "Every question gets a clear, numbered, beginner-friendly answer with the exact SAP T-code or Fiori app to use.",
  },
  {
    title: "Real SAP Screenshots",
    description:
      "Answers come with actual SAP GUI screenshots matched to each step, so you can see exactly what to click before you touch a real SAP system.",
  },
  {
    title: "All Major Modules",
    description:
      "SAP MM, FICO, SD, PP, ABAP, Basis, HANA, EWM, TM, Concur, and Automation - all covered in one place.",
  },
  {
    title: "No SAP Access Needed",
    description:
      "You don't need an expensive SAP license or system access to learn. Ask a question and see the process end to end.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Pick your module",
    description: "Choose SAP MM, FICO, ABAP, or any other module you're working with.",
  },
  {
    step: "2",
    title: "Ask your question",
    description:
      "Type your question in plain English, or click one of the ready-made sample questions.",
  },
  {
    step: "3",
    title: "Follow the guide",
    description:
      "Get a simple step-by-step answer with the T-code and real screenshots for every important step.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      {/* ============ NAV ============ */}
      <header className="border-b border-cyan-900/40 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <span className="text-xl font-bold text-cyan-400">HireSAP AI</span>
            <p className="text-xs text-slate-500">by SAP Learner</p>
          </div>

          <Link
            href="/Agent"
            className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-black hover:bg-cyan-400"
          >
            Try it now
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          Learn SAP the easy way,
          <br />
          <span className="text-cyan-400">step by step, with real screenshots</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          HireSAP AI is a free SAP how-to assistant. Ask any question about
          SAP MM, FICO, SD, ABAP, or other modules, and get a simple,
          beginner-friendly answer with the exact steps and real SAP
          screens - no SAP system access required.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/Agent"
            className="rounded-xl bg-cyan-500 px-8 py-4 font-bold text-black hover:bg-cyan-400"
          >
            Start Asking Questions
          </Link>
        </div>
      </section>

      {/* ============ PROBLEM / WHY IT EXISTS ============ */}
      <section className="border-t border-cyan-900/40 bg-[#0b1326] px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Why we built this
          </h2>

          <p className="mt-4 text-slate-400">
            {/* CHANGE THIS: apni asli story/reason likho */}
            Learning SAP is usually expensive and confusing. Real SAP
            systems cost thousands of rupees to access, tutorials assume
            you already know the jargon, and it's hard to know what a
            screen actually looks like before an interview or your first
            day on the job. HireSAP AI exists to close that gap - a free,
            instant guide that explains any SAP process in plain language
            and shows you the real screen for every step.
          </p>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
            What you get
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-700 bg-[#0b1326] p-6"
              >
                <h3 className="text-lg font-bold text-cyan-400">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-t border-cyan-900/40 bg-[#0b1326] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
            How it works
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 font-bold text-black">
                  {item.step}
                </div>
                <h3 className="font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MODULES COVERED ============ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Modules we cover
          </h2>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {MODULES.map((mod) => (
              <span
                key={mod}
                className="rounded-full border border-cyan-700 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ABOUT / COMPANY ============ */}
      <section className="border-t border-cyan-900/40 bg-[#0b1326] px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            About HireSAP AI
          </h2>

          <p className="mt-4 text-slate-400">
            HireSAP AI is built by SAP Learner, founded by Anurag Tiwari,
            with the goal of making SAP education accessible to everyone,
            not just people who can afford expensive corporate training.
            We believe anyone preparing for an SAP career or an SAP
            interview should be able to see exactly what the software
            looks like and how a process works - for free.
          </p>

          <p className="mt-4 text-sm text-slate-500">
            {/* CHANGE THIS: apna contact email daalo */}
            Questions or feedback? Reach out at your-email@example.com
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-cyan-900/40 px-6 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} HireSAP AI by SAP Learner (Anurag Tiwari). All rights reserved.
      </footer>
    </main>
  );
}