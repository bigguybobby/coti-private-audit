"use client";

import { useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toHex, toBytes } from "viem";
import { PRIVATE_AUDIT_ADDRESS, PRIVATE_AUDIT_ABI } from "@/config/contract";

const SEVERITY_LABELS = ["None", "Info", "Low", "Medium", "High", "Critical"];
const SEVERITY_COLORS = ["text-gray-400", "text-blue-400", "text-green-400", "text-yellow-400", "text-orange-400", "text-red-400"];
const STATUS_LABELS = ["Pending", "In Progress", "Completed", "Disputed"];
const STATUS_COLORS = ["bg-yellow-500/20 text-yellow-400", "bg-blue-500/20 text-blue-400", "bg-green-500/20 text-green-400", "bg-red-500/20 text-red-400"];

type Tab = "submit" | "browse" | "auditor" | "lookup";

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <div className="text-xs text-gray-500 mt-1">Trust Score</div>
    </div>
  );
}

function SubmitAudit() {
  const [uri, setUri] = useState("");
  const [bytecode, setBytecode] = useState("");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const submit = () => {
    const codeHash = keccak256(toBytes(bytecode || "0x00"));
    writeContract({
      address: PRIVATE_AUDIT_ADDRESS,
      abi: PRIVATE_AUDIT_ABI,
      functionName: "requestAudit",
      args: [uri, codeHash],
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Submit Contract for Audit</h2>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Contract Source (IPFS URI or URL)</label>
        <input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="ipfs://Qm... or https://github.com/..." className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-purple-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Contract Bytecode (for hash verification)</label>
        <textarea value={bytecode} onChange={(e) => setBytecode(e.target.value)} placeholder="0x6080604052..." rows={4} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white font-mono text-xs focus:border-purple-500 focus:outline-none" />
      </div>
      <button onClick={submit} disabled={isPending || isConfirming || !uri} className="rounded-lg bg-purple-500 px-6 py-3 font-semibold text-white transition hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed">
        {isPending ? "Confirm in wallet..." : isConfirming ? "Submitting..." : "Submit for Audit"}
      </button>
      {isSuccess && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-400">
          ✅ Audit request submitted! TX: <code className="text-xs">{hash}</code>
        </div>
      )}
    </div>
  );
}

function AuditLookup() {
  const [auditId, setAuditId] = useState("");
  const id = BigInt(auditId || "0");

  const { data: info } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "getPublicAuditInfo",
    args: [id],
    query: { enabled: auditId !== "" },
  });

  const { data: severity } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "getSeverityBreakdown",
    args: [id],
    query: { enabled: auditId !== "" && !!info },
  });

  const { data: findingsData } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "getFindings",
    args: [id],
    query: { enabled: auditId !== "" && !!info },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Lookup Audit</h2>
      <div className="flex gap-3">
        <input value={auditId} onChange={(e) => setAuditId(e.target.value)} placeholder="Enter Audit ID (0, 1, 2...)" className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-purple-500 focus:outline-none" />
      </div>

      {info && (
        <div className="space-y-4">
          {/* Status + Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="text-sm text-gray-500 mb-2">Status</div>
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[Number(info[4])]}`}>
                {STATUS_LABELS[Number(info[4])]}
              </span>
              <div className="mt-3 text-sm text-gray-500">
                Project: <code className="text-xs text-gray-400">{(info[0] as string).slice(0, 10)}...</code>
              </div>
              <div className="text-sm text-gray-500">
                Findings: <span className="text-white">{Number(info[6])}</span>
              </div>
              <div className="text-sm text-gray-500">
                Disclosed: <span className={info[7] ? "text-green-400" : "text-gray-400"}>{info[7] ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 flex items-center justify-center">
              <ScoreRing score={Number(info[5])} />
            </div>
          </div>

          {/* Severity Breakdown */}
          {severity && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="text-lg font-semibold mb-4">Severity Breakdown</h3>
              <div className="grid grid-cols-5 gap-3">
                {(["Critical", "High", "Medium", "Low", "Info"] as const).map((label, i) => (
                  <div key={label} className="text-center">
                    <div className={`text-2xl font-bold ${SEVERITY_COLORS[5 - i]}`}>{Number(severity[i])}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings List */}
          {findingsData && Number(info[6]) > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="text-lg font-semibold mb-4">Findings</h3>
              <div className="space-y-2">
                {(findingsData[0] as readonly number[]).map((sev: number, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${SEVERITY_COLORS[sev]}`}>
                        {SEVERITY_LABELS[sev]}
                      </span>
                      <span className="text-xs text-gray-600">Finding #{i}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${(findingsData[1] as readonly boolean[])[i] ? "text-green-400" : "text-gray-500"}`}>
                        {(findingsData[1] as readonly boolean[])[i] ? "✅ Resolved" : "⏳ Open"}
                      </span>
                      <span className={`text-xs ${(findingsData[2] as readonly boolean[])[i] ? "text-blue-400" : "text-gray-600"}`}>
                        {(findingsData[2] as readonly boolean[])[i] ? "📋 Disclosed" : "🔒 Private"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BrowseAudits() {
  const { address } = useAccount();

  const { data: auditIds } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "getProjectAudits",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: totalAudits } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "nextAuditId",
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Browse Audits</h2>
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="text-sm text-gray-500 mb-1">Total Audits on Contract</div>
        <div className="text-3xl font-bold">{totalAudits !== undefined ? Number(totalAudits) : "..."}</div>
      </div>
      {address && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="text-sm text-gray-500 mb-2">Your Audit IDs</div>
          {auditIds && (auditIds as readonly bigint[]).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(auditIds as readonly bigint[]).map((id) => (
                <span key={id.toString()} className="rounded-full bg-purple-500/20 text-purple-400 px-3 py-1 text-sm">
                  #{id.toString()}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No audits found for your address.</p>
          )}
        </div>
      )}
      <p className="text-sm text-gray-500">Use the Lookup tab to view details for any Audit ID.</p>
    </div>
  );
}

function AuditorPanel() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const { data: isAuditor } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "registeredAuditors",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: reputation } = useReadContract({
    address: PRIVATE_AUDIT_ADDRESS,
    abi: PRIVATE_AUDIT_ABI,
    functionName: "auditorReputation",
    args: [address!],
    query: { enabled: !!address },
  });

  const [auditId, setAuditId] = useState("");
  const [severity, setSeverity] = useState("4");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const addFinding = () => {
    writeContract({
      address: PRIVATE_AUDIT_ADDRESS,
      abi: PRIVATE_AUDIT_ABI,
      functionName: "addFinding",
      args: [
        BigInt(auditId),
        Number(severity),
        toHex(title),
        toHex(desc),
        keccak256(toBytes(title + desc)),
      ],
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Auditor Panel</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="text-sm text-gray-500 mb-1">Status</div>
          <div className={`text-lg font-semibold ${isAuditor ? "text-green-400" : "text-gray-400"}`}>
            {isAuditor ? "✅ Registered Auditor" : "❌ Not Registered"}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="text-sm text-gray-500 mb-1">Reputation</div>
          <div className="text-3xl font-bold text-purple-400">{reputation !== undefined ? Number(reputation) : "..."}</div>
        </div>
      </div>

      {isAuditor && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold">Add Finding</h3>
          <input value={auditId} onChange={(e) => setAuditId(e.target.value)} placeholder="Audit ID" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none" />
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none">
            {SEVERITY_LABELS.slice(1).map((s, i) => (
              <option key={s} value={i + 1}>{s}</option>
            ))}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finding Title (encrypted on COTI)" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Finding Description (encrypted on COTI)" rows={3} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-purple-500 focus:outline-none" />
          <button onClick={addFinding} disabled={isPending || !auditId || !title} className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50">
            {isPending ? "Submitting..." : "Add Finding"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("browse");
  const { isConnected } = useAccount();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "browse", label: "Browse", icon: "📊" },
    { id: "lookup", label: "Lookup", icon: "🔍" },
    { id: "submit", label: "Submit", icon: "📤" },
    { id: "auditor", label: "Auditor", icon: "🛡️" },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-300 bg-clip-text text-transparent">PrivateAudit</span>
          </a>
          <ConnectKitButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 rounded-lg border border-gray-800 bg-gray-900/50 p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${tab === t.id ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {!isConnected ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400">Connect to Celo Sepolia to interact with PrivateAudit</p>
          </div>
        ) : (
          <>
            {tab === "browse" && <BrowseAudits />}
            {tab === "lookup" && <AuditLookup />}
            {tab === "submit" && <SubmitAudit />}
            {tab === "auditor" && <AuditorPanel />}
          </>
        )}
      </div>
    </div>
  );
}
