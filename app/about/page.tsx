import Link from "next/link";

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
    description:
      "Choose SAP MM, FICO, ABAP, or any other module you're working with.",
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <span className="text-xl font-bold text-cyan-600">
              ERP Tutor AI
            </span>
            <p className="text-xs text-slate-500">by ERP Tutor Labs</p>
          </div>

          <Link
            href="/Agent"
            className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-500"
          >
            Try it now
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
          Learn SAP the easy way,
          <br />
          <span className="text-cyan-600">
            step by step, with real screenshots
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          ERP Tutor AI is a free SAP how-to assistant. Ask any question about
          SAP MM, FICO, SD, ABAP, or other modules, and get a simple,
          beginner-friendly answer with the exact steps and real SAP
          screens - no SAP system access required.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/Agent"
            className="rounded-xl bg-cyan-600 px-8 py-4 font-bold text-white hover:bg-cyan-500"
          >
            Start Asking Questions
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Why we built this
          </h2>

          <p className="mt-4 text-slate-600">
            Learning SAP is usually expensive and confusing. Real SAP
            systems cost thousands of rupees to access, tutorials assume
            you already know the jargon, and it's hard to know what a
            screen actually looks like before an interview or your first
            day on the job. ERP Tutor AI exists to close that gap - a free,
            instant guide that explains any SAP process in plain language
            and shows you the real screen for every step.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">
            What you get
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-cyan-700">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">
            How it works
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 font-bold text-white">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Modules we cover
          </h2>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {MODULES.map((mod) => (
              <span
                key={mod}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            About ERP Tutor AI
          </h2>

          <p className="mt-4 text-slate-600">
            ERP Tutor AI is built by ERP Tutor Labs, founded by Anurag
            Tiwari, with the goal of making SAP education accessible to
            everyone, not just people who can afford expensive corporate
            training. We believe anyone preparing for an SAP career or an
            SAP interview should be able to see exactly what the software
            looks like and how a process works - for free.
          </p>

          <p className="mt-4 text-sm text-slate-400">
            Questions or feedback? Reach out at your-email@example.com
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ERP Tutor AI by ERP Tutor Labs (Anurag
        Tiwari). All rights reserved.
      </footer>
    </main>
  );
}