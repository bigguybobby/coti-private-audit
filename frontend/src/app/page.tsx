const features = [
  {
    icon: "🔒",
    title: "Encrypted Audit Reports",
    desc: "Full audit details are encrypted on-chain using COTI's MPC encryption. Only the project and auditor can see vulnerability specifics.",
  },
  {
    icon: "📊",
    title: "Public Trust Score",
    desc: "Everyone can see a 0-100 trust score and severity breakdown — without exposing actual vulnerabilities.",
  },
  {
    icon: "🔓",
    title: "Selective Disclosure",
    desc: "After fixing issues, projects can selectively reveal individual findings to build transparency.",
  },
  {
    icon: "🛡️",
    title: "Auditor Reputation",
    desc: "On-chain reputation tracking for auditors. Verified track record across all completed audits.",
  },
  {
    icon: "📋",
    title: "Immutable Audit Trail",
    desc: "Every audit request, finding, resolution, and disclosure is permanently recorded on-chain.",
  },
  {
    icon: "🔗",
    title: "COTI Privacy Layer",
    desc: "Built on COTI V2's confidential smart contracts — the fastest privacy layer in Web3.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-950 to-blue-900/20" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-400">
            🔒 Built for the COTI Builders Program
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            <span className="bg-gradient-to-r from-purple-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
              PrivateAudit
            </span>
          </h1>
          <p className="mx-auto mb-4 max-w-2xl text-lg text-gray-400">
            Privacy-preserving smart contract audits on COTI. Submit contracts for analysis,
            get encrypted results — only you and the auditor see the details.
          </p>
          <p className="mx-auto mb-10 max-w-xl text-sm text-gray-500">
            Public users see a trust score. Vulnerabilities stay private until you fix them.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/dashboard" className="rounded-lg bg-purple-500 px-8 py-3 font-semibold text-white transition hover:bg-purple-400">
              Launch Dashboard
            </a>
            <a href="https://github.com/bigguybobby/coti-private-audit" target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-gray-700 px-8 py-3 font-semibold text-gray-300 transition hover:border-gray-500">
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h3 className="mb-3 text-lg font-semibold text-red-400">❌ The Problem</h3>
            <p className="text-gray-400">
              Current audit reports are either fully public (exposing vulnerabilities before fixes)
              or fully private (no transparency for users). Projects must choose between security and trust.
            </p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6">
            <h3 className="mb-3 text-lg font-semibold text-green-400">✅ The Solution</h3>
            <p className="text-gray-400">
              Using COTI&apos;s confidential smart contracts, audit results are encrypted on-chain.
              Projects get privacy during remediation, users get a verifiable trust score.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition hover:border-purple-500/40">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Audit Flow</h2>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8">
          <div className="grid gap-4 text-center md:grid-cols-5">
            {[
              { step: "1", label: "Submit", desc: "Project submits contract" },
              { step: "2", label: "Audit", desc: "Auditor analyzes code" },
              { step: "3", label: "Encrypt", desc: "Results encrypted on COTI" },
              { step: "4", label: "Fix", desc: "Project fixes privately" },
              { step: "5", label: "Disclose", desc: "Selective public reveal" },
            ].map((s) => (
              <div key={s.step} className="rounded-lg border border-gray-700 p-4">
                <div className="mb-1 text-2xl font-bold text-purple-400">{s.step}</div>
                <div className="font-semibold">{s.label}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Tech Stack</h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {["COTI V2", "Solidity", "Foundry", "Next.js", "TypeScript", "Tailwind CSS", "MPC Encryption"].map((t) => (
            <span key={t} className="rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm">{t}</span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        Built by{" "}
        <a href="https://github.com/bigguybobby" className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer">
          bigguybobby
        </a>{" "}
        for the COTI Builders Program
      </footer>
    </main>
  );
}
