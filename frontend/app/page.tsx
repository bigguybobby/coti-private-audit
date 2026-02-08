"use client";

import { ConnectKitButton } from "connectkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { keccak256, toHex, encodePacked } from "viem";
import abi from "./abi.json";
import { PRIVATE_AUDIT_ADDRESS } from "./config";

const CONTRACT = PRIVATE_AUDIT_ADDRESS;
const SEVERITIES = ["None", "Info", "Low", "Medium", "High", "Critical"];
const SEV_COLORS: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Info: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-2xl font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function AuditCard({ auditId }: { auditId: number }) {
  const { data: info } = useReadContract({
    address: CONTRACT,
    abi,
    functionName: "getPublicAuditInfo",
    args: [BigInt(auditId)],
  }) as { data: [string, string, bigint, bigint, number, number, bigint, boolean] | undefined };

  const { data: breakdown } = useReadContract({
    address: CONTRACT,
    abi,
    functionName: "getSeverityBreakdown",
    args: [BigInt(auditId)],
  }) as { data: [bigint, bigint, bigint, bigint, bigint] | undefined };

  if (!info) return null;

  const [project, , submittedAt, completedAt, status, publicScore, findingCount, disclosed] = info;
  const statusLabels = ["⏳ Pending", "🔍 In Progress", "✅ Completed", "⚠️ Disputed"];
  const statusColors = [
    "text-yellow-400",
    "text-blue-400",
    "text-green-400",
    "text-red-400",
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur transition-all hover:border-zinc-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-zinc-500">Audit #{auditId}</span>
            <span className={`text-sm font-medium ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
            {disclosed && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/30">
                📖 Disclosed
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-mono mb-1">
            Project: {project.slice(0, 6)}...{project.slice(-4)}
          </p>
          <p className="text-xs text-zinc-600">
            Submitted: {submittedAt > 0n ? new Date(Number(submittedAt) * 1000).toLocaleDateString() : "—"}
            {completedAt > 0n && ` • Completed: ${new Date(Number(completedAt) * 1000).toLocaleDateString()}`}
          </p>
        </div>
        {status >= 2 && <ScoreRing score={publicScore} />}
      </div>

      {breakdown && status >= 2 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(["Critical", "High", "Medium", "Low", "Info"] as const).map((sev, i) => {
            const count = Number(breakdown[i]);
            if (count === 0) return null;
            return (
              <span
                key={sev}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${SEV_COLORS[sev]}`}
              >
                {count} {sev}
              </span>
            );
          })}
          <span className="ml-auto text-xs text-zinc-500">
            {Number(findingCount)} findings total
          </span>
        </div>
      )}
    </div>
  );
}

function RequestAuditForm() {
  const [contractURI, setContractURI] = useState("");
  const [bytecode, setBytecode] = useState("");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const submit = () => {
    if (!contractURI) return;
    const codeHash = bytecode
      ? keccak256(toHex(bytecode))
      : keccak256(encodePacked(["string"], [contractURI]));

    writeContract({
      address: CONTRACT,
      abi,
      functionName: "requestAudit",
      args: [contractURI, codeHash],
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-lg font-semibold mb-4">📋 Request Audit</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Contract Source URI</label>
          <input
            type="text"
            value={contractURI}
            onChange={(e) => setContractURI(e.target.value)}
            placeholder="ipfs://Qm... or https://github.com/..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Contract Bytecode <span className="text-zinc-600">(optional)</span>
          </label>
          <textarea
            value={bytecode}
            onChange={(e) => setBytecode(e.target.value)}
            placeholder="0x608060..."
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>
        <button
          onClick={submit}
          disabled={isPending || isConfirming || !contractURI}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Confirming..."
            : isSuccess
            ? "✅ Audit Requested!"
            : "Submit for Audit"}
        </button>
        {hash && (
          <p className="text-xs text-zinc-500 font-mono break-all">TX: {hash}</p>
        )}
      </div>
    </div>
  );
}

function AuditLookup() {
  const [lookupId, setLookupId] = useState("");
  const [showAudit, setShowAudit] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-lg font-semibold mb-4">🔍 Lookup Audit</h3>
      <div className="flex gap-2">
        <input
          type="number"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          placeholder="Audit ID"
          min="0"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={() => setShowAudit(parseInt(lookupId))}
          disabled={lookupId === ""}
          className="rounded-lg bg-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:opacity-50"
        >
          Search
        </button>
      </div>
      {showAudit !== null && !isNaN(showAudit) && (
        <div className="mt-4">
          <AuditCard auditId={showAudit} />
        </div>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: "📝",
      title: "Submit Contract",
      desc: "Upload your contract source code URI and bytecode hash for review.",
    },
    {
      icon: "🔐",
      title: "Private Analysis",
      desc: "Registered auditors review your code. All findings are encrypted on-chain via COTI.",
    },
    {
      icon: "📊",
      title: "Public Score",
      desc: "Everyone sees a trust score (0-100). Only you and the auditor see the details.",
    },
    {
      icon: "🔓",
      title: "Selective Disclosure",
      desc: "After fixing issues, choose which findings to make public. Full transparency on your terms.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {steps.map((step, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex items-start gap-4"
        >
          <span className="text-2xl">{step.icon}</span>
          <div>
            <h4 className="font-medium text-zinc-200 mb-1">{step.title}</h4>
            <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stats() {
  const { data: nextId } = useReadContract({
    address: CONTRACT,
    abi,
    functionName: "nextAuditId",
  }) as { data: bigint | undefined };

  const totalAudits = nextId ? Number(nextId) : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Total Audits", value: totalAudits.toString(), icon: "📋" },
        { label: "Privacy Layer", value: "COTI V2", icon: "🔐" },
        { label: "Network", value: "Sepolia", icon: "⛓️" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center"
        >
          <span className="text-2xl">{stat.icon}</span>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{stat.value}</p>
          <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">COTI Private Audit</h1>
              <p className="text-xs text-zinc-500">Privacy-Preserving Security Audits</p>
            </div>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4 py-8">
          <h2 className="text-4xl font-bold tracking-tight">
            Smart Contract Audits,{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Privacy Preserved
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            Get your contracts audited with encrypted findings on COTI V2. The public sees your
            trust score — only you see the vulnerabilities. Disclose on your terms, after fixes
            are deployed.
          </p>
        </section>

        {/* Stats */}
        <Stats />

        {/* How It Works */}
        <section>
          <h3 className="text-xl font-semibold mb-6 text-center">How It Works</h3>
          <HowItWorks />
        </section>

        {/* Actions */}
        {isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RequestAuditForm />
            <AuditLookup />
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400 text-lg mb-4">Connect your wallet to get started</p>
            <ConnectKitButton />
          </div>
        )}

        {/* Recent audits — show first few */}
        <section>
          <h3 className="text-xl font-semibold mb-4">Recent Audits</h3>
          <div className="space-y-3">
            {[0, 1, 2].map((id) => (
              <AuditCard key={id} auditId={id} />
            ))}
          </div>
          <p className="text-center text-sm text-zinc-600 mt-4">
            Use the lookup tool above to search for any audit by ID
          </p>
        </section>

        {/* COTI Privacy Explainer */}
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8">
          <h3 className="text-xl font-semibold text-emerald-400 mb-4">
            🔐 Why COTI V2 for Audits?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-400">
            <div>
              <h4 className="font-medium text-zinc-200 mb-2">Garbled Circuits</h4>
              <p>
                COTI V2 uses MPC-based garbled circuits for on-chain data privacy. Audit findings
                are encrypted so only authorized parties can read them.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-zinc-200 mb-2">Selective Disclosure</h4>
              <p>
                Projects choose when and what to reveal. Fix a critical bug first, then disclose
                the finding — proving transparency without exposing live vulnerabilities.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-zinc-200 mb-2">On-Chain Trust</h4>
              <p>
                Public trust scores computed from encrypted severity data. Users see if a protocol
                is safe without knowing the specific attack vectors.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between text-sm text-zinc-600">
          <p>Built for COTI Builders Program — Privacy-Preserving DeFi</p>
          <div className="flex gap-4">
            <a
              href="https://github.com/bigguybobby/coti-private-audit"
              className="hover:text-zinc-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://coti.io"
              className="hover:text-zinc-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              COTI
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
