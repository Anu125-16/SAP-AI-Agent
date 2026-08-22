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
  "Zoho Books",
  "Odoo",
  "Oracle ERP",
  "Microsoft Dynamics 365",
  "Automation",
];

const FEATURES = [
  {
    title: "Step-by-Step Answers",
    description:
      "Every question gets a clear, numbered, beginner-friendly answer with the exact steps, T-codes, or menu paths to follow.",
  },
  {
    title: "Real Screenshots",
    description:
      "Answers come with actual screenshots matched to each step, so you can see exactly what to click before you touch a live system.",
  },
  {
    title: "All Major ERP Systems",
    description:
      "SAP MM, FICO, SD, PP, ABAP, Basis, HANA, EWM, TM, Concur, Zoho Books, Odoo, Oracle ERP, Microsoft Dynamics 365, and Automation - all covered in one place.",
  },
  {
    title: "No System Access Needed",
    description:
      "You don't need an expensive license or system access to learn. Ask a question and see the process end to end.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Pick your module",
    description:
      "Choose SAP MM, FICO, ABAP, Zoho Books, Odoo, or any other ERP module you're working with.",
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
      "Get a clear, step-by-step answer with the exact navigation and real screenshots for every important step.",
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
          Master ERP Systems the Smart Way,
          <br />
          <span className="text-cyan-600">
            Step by Step, with Real Screenshots
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          ERP Tutor AI is a free, AI-powered learning assistant for ERP
          software. Ask any question about SAP MM, FICO, SD, ABAP, Zoho
          Books, Odoo, Oracle ERP, Microsoft Dynamics 365, and more - get
          clear, beginner-friendly answers with exact steps and real
          screenshots. No system access required.
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
            Learning ERP software has traditionally been expensive and
            inaccessible. Enterprise systems cost thousands of rupees to
            access, most tutorials assume prior familiarity with technical
            jargon, and it's difficult to know what a real screen looks
            like before an interview or your first day on the job. ERP
            Tutor AI was built to close that gap - offering a free, instant
            guide that explains any ERP process in plain language, backed
            by real screenshots for every step.
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
            Tiwari, with a simple mission: make ERP education accessible to
            everyone, not just those who can afford expensive corporate
            training programs. We believe anyone preparing for an ERP
            career or interview - across SAP, Oracle, Zoho Books, Odoo, or
            Microsoft Dynamics 365 - deserves the opportunity to see
            exactly how the software works, free of cost.
          </p>

          <p className="mt-4 text-sm text-slate-400">
            For questions or feedback, reach out at anuragtiwarijob12@gmail.com
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