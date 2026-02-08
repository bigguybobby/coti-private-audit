export const PRIVATE_AUDIT_ADDRESS = "0x1CaA18014F4AafEC6aC439E1b848484b6A368Db0" as const;

export const PRIVATE_AUDIT_ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "requestAudit", inputs: [{ name: "contractURI", type: "string" }, { name: "codeHash", type: "bytes32" }], outputs: [{ name: "auditId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "assignAuditor", inputs: [{ name: "auditId", type: "uint256" }, { name: "auditor", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "registerAuditor", inputs: [{ name: "auditor", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "addFinding", inputs: [{ name: "auditId", type: "uint256" }, { name: "severity", type: "uint8" }, { name: "encryptedTitle", type: "bytes" }, { name: "encryptedDescription", type: "bytes" }, { name: "findingHash", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "completeAudit", inputs: [{ name: "auditId", type: "uint256" }, { name: "publicScore", type: "uint8" }, { name: "encryptedReport", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "resolveFinding", inputs: [{ name: "auditId", type: "uint256" }, { name: "findingIndex", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "discloseFinding", inputs: [{ name: "auditId", type: "uint256" }, { name: "findingIndex", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "discloseFullReport", inputs: [{ name: "auditId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "nextAuditId", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "auditorReputation", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "registeredAuditors", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getPublicAuditInfo", inputs: [{ name: "auditId", type: "uint256" }], outputs: [{ name: "project", type: "address" }, { name: "codeHash", type: "bytes32" }, { name: "submittedAt", type: "uint256" }, { name: "completedAt", type: "uint256" }, { name: "status", type: "uint8" }, { name: "publicScore", type: "uint8" }, { name: "findingCount", type: "uint256" }, { name: "disclosed", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getSeverityBreakdown", inputs: [{ name: "auditId", type: "uint256" }], outputs: [{ name: "critical", type: "uint256" }, { name: "high", type: "uint256" }, { name: "medium", type: "uint256" }, { name: "low", type: "uint256" }, { name: "info", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getProjectAudits", inputs: [{ name: "project", type: "address" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "getFindings", inputs: [{ name: "auditId", type: "uint256" }], outputs: [{ name: "severities", type: "uint8[]" }, { name: "resolved", type: "bool[]" }, { name: "disclosedArr", type: "bool[]" }], stateMutability: "view" },
  { type: "event", name: "AuditRequested", inputs: [{ name: "auditId", type: "uint256", indexed: true }, { name: "project", type: "address", indexed: true }, { name: "codeHash", type: "bytes32", indexed: false }], anonymous: false },
  { type: "event", name: "AuditCompleted", inputs: [{ name: "auditId", type: "uint256", indexed: true }, { name: "publicScore", type: "uint8", indexed: false }, { name: "findingCount", type: "uint256", indexed: false }], anonymous: false },
] as const;

export const CELO_SEPOLIA = {
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://celo-sepolia.drpc.org"] } },
  blockExplorers: { default: { name: "CeloScan", url: "https://sepolia.celoscan.io" } },
  testnet: true,
} as const;
