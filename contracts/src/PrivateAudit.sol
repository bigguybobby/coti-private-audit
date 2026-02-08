// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PrivateAudit — Privacy-Preserving Smart Contract Audit Dashboard
/// @notice Allows projects to submit contracts for audit with encrypted results
/// @dev Designed for COTI V2's privacy layer — confidential data fields marked with comments
///      In production on COTI, `bytes encryptedX` fields would use COTI's MPC encryption
contract PrivateAudit {
    // ─── Types ───────────────────────────────────────────────────────────

    enum Severity { None, Info, Low, Medium, High, Critical }

    struct AuditRequest {
        address project;           // project requesting audit
        string contractURI;        // IPFS hash or URL to contract source
        bytes32 codeHash;          // keccak256 of contract bytecode
        uint256 submittedAt;
        uint256 completedAt;
        address auditor;           // assigned auditor
        AuditStatus status;
        uint8 publicScore;         // 0-100 public trust score (visible to all)
        bytes encryptedReport;     // COTI-encrypted: full audit report (only project + auditor)
        uint256 findingCount;
        bool disclosed;            // whether full report has been publicly disclosed
    }

    struct Finding {
        Severity severity;
        bytes encryptedTitle;      // COTI-encrypted: finding title
        bytes encryptedDescription;// COTI-encrypted: finding details
        bytes32 findingHash;       // hash of the finding for verification
        bool resolved;
        bool disclosed;            // selectively disclosed after fix
    }

    enum AuditStatus {
        Pending,
        InProgress,
        Completed,
        Disputed
    }

    // ─── State ───────────────────────────────────────────────────────────

    mapping(uint256 => AuditRequest) public audits;
    mapping(uint256 => mapping(uint256 => Finding)) public findings;
    mapping(address => bool) public registeredAuditors;
    mapping(address => uint256[]) public projectAudits;  // project => audit IDs
    mapping(address => uint256) public auditorReputation; // auditor => reputation score

    uint256 public nextAuditId;
    address public owner;

    // ─── Events ──────────────────────────────────────────────────────────

    event AuditRequested(uint256 indexed auditId, address indexed project, bytes32 codeHash);
    event AuditorAssigned(uint256 indexed auditId, address indexed auditor);
    event AuditCompleted(uint256 indexed auditId, uint8 publicScore, uint256 findingCount);
    event FindingAdded(uint256 indexed auditId, uint256 findingIndex, Severity severity);
    event FindingResolved(uint256 indexed auditId, uint256 findingIndex);
    event FindingDisclosed(uint256 indexed auditId, uint256 findingIndex);
    event FullReportDisclosed(uint256 indexed auditId);
    event AuditorRegistered(address indexed auditor);

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyAuditor(uint256 auditId) {
        require(audits[auditId].auditor == msg.sender, "not assigned auditor");
        _;
    }

    modifier onlyProjectOrAuditor(uint256 auditId) {
        require(
            audits[auditId].project == msg.sender || audits[auditId].auditor == msg.sender,
            "not authorized"
        );
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Auditor Management ──────────────────────────────────────────────

    function registerAuditor(address auditor) external onlyOwner {
        registeredAuditors[auditor] = true;
        emit AuditorRegistered(auditor);
    }

    function removeAuditor(address auditor) external onlyOwner {
        registeredAuditors[auditor] = false;
    }

    // ─── Audit Lifecycle ─────────────────────────────────────────────────

    /// @notice Submit a contract for audit
    /// @param contractURI IPFS hash or URL to the contract source code
    /// @param codeHash keccak256 hash of the contract bytecode
    function requestAudit(
        string calldata contractURI,
        bytes32 codeHash
    ) external returns (uint256 auditId) {
        auditId = nextAuditId++;
        audits[auditId] = AuditRequest({
            project: msg.sender,
            contractURI: contractURI,
            codeHash: codeHash,
            submittedAt: block.timestamp,
            completedAt: 0,
            auditor: address(0),
            status: AuditStatus.Pending,
            publicScore: 0,
            encryptedReport: "",
            findingCount: 0,
            disclosed: false
        });
        projectAudits[msg.sender].push(auditId);
        emit AuditRequested(auditId, msg.sender, codeHash);
    }

    /// @notice Assign an auditor to a pending audit
    function assignAuditor(uint256 auditId, address auditor) external onlyOwner {
        require(registeredAuditors[auditor], "not registered auditor");
        require(audits[auditId].status == AuditStatus.Pending, "not pending");
        audits[auditId].auditor = auditor;
        audits[auditId].status = AuditStatus.InProgress;
        emit AuditorAssigned(auditId, auditor);
    }

    /// @notice Add an encrypted finding to an audit
    /// @dev On COTI V2, encryptedTitle and encryptedDescription use MPC encryption
    function addFinding(
        uint256 auditId,
        Severity severity,
        bytes calldata encryptedTitle,
        bytes calldata encryptedDescription,
        bytes32 findingHash
    ) external onlyAuditor(auditId) {
        require(audits[auditId].status == AuditStatus.InProgress, "not in progress");
        uint256 idx = audits[auditId].findingCount++;
        findings[auditId][idx] = Finding({
            severity: severity,
            encryptedTitle: encryptedTitle,
            encryptedDescription: encryptedDescription,
            findingHash: findingHash,
            resolved: false,
            disclosed: false
        });
        emit FindingAdded(auditId, idx, severity);
    }

    /// @notice Complete the audit with a public trust score and encrypted full report
    function completeAudit(
        uint256 auditId,
        uint8 publicScore,
        bytes calldata encryptedReport
    ) external onlyAuditor(auditId) {
        require(audits[auditId].status == AuditStatus.InProgress, "not in progress");
        require(publicScore <= 100, "score max 100");

        AuditRequest storage a = audits[auditId];
        a.publicScore = publicScore;
        a.encryptedReport = encryptedReport;
        a.completedAt = block.timestamp;
        a.status = AuditStatus.Completed;

        auditorReputation[msg.sender]++;

        emit AuditCompleted(auditId, publicScore, a.findingCount);
    }

    // ─── Finding Resolution & Disclosure ─────────────────────────────────

    /// @notice Mark a finding as resolved (project confirms fix)
    function resolveFinding(uint256 auditId, uint256 findingIndex) external onlyProjectOrAuditor(auditId) {
        require(findingIndex < audits[auditId].findingCount, "invalid finding");
        findings[auditId][findingIndex].resolved = true;
        emit FindingResolved(auditId, findingIndex);
    }

    /// @notice Selectively disclose a single finding (after fix deployed)
    /// @dev This makes the encrypted data publicly decryptable on COTI
    function discloseFinding(uint256 auditId, uint256 findingIndex) external onlyProjectOrAuditor(auditId) {
        require(findingIndex < audits[auditId].findingCount, "invalid finding");
        require(findings[auditId][findingIndex].resolved, "not resolved yet");
        findings[auditId][findingIndex].disclosed = true;
        emit FindingDisclosed(auditId, findingIndex);
    }

    /// @notice Disclose the full audit report publicly
    function discloseFullReport(uint256 auditId) external {
        require(audits[auditId].project == msg.sender, "only project");
        require(audits[auditId].status == AuditStatus.Completed, "not completed");
        audits[auditId].disclosed = true;
        emit FullReportDisclosed(auditId);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /// @notice Get public info about an audit (visible to everyone)
    function getPublicAuditInfo(uint256 auditId) external view returns (
        address project,
        bytes32 codeHash,
        uint256 submittedAt,
        uint256 completedAt,
        AuditStatus status,
        uint8 publicScore,
        uint256 findingCount,
        bool disclosed
    ) {
        AuditRequest storage a = audits[auditId];
        return (a.project, a.codeHash, a.submittedAt, a.completedAt, a.status, a.publicScore, a.findingCount, a.disclosed);
    }

    /// @notice Get finding severity breakdown (public — severities are not encrypted)
    function getSeverityBreakdown(uint256 auditId) external view returns (
        uint256 critical,
        uint256 high,
        uint256 medium,
        uint256 low,
        uint256 info
    ) {
        uint256 count = audits[auditId].findingCount;
        for (uint256 i; i < count; i++) {
            Severity s = findings[auditId][i].severity;
            if (s == Severity.Critical) critical++;
            else if (s == Severity.High) high++;
            else if (s == Severity.Medium) medium++;
            else if (s == Severity.Low) low++;
            else if (s == Severity.Info) info++;
        }
    }

    /// @notice Get all audit IDs for a project
    function getProjectAudits(address project) external view returns (uint256[] memory) {
        return projectAudits[project];
    }

    /// @notice Get finding resolution status
    function getFindings(uint256 auditId) external view returns (
        Severity[] memory severities,
        bool[] memory resolved,
        bool[] memory disclosedArr
    ) {
        uint256 count = audits[auditId].findingCount;
        severities = new Severity[](count);
        resolved = new bool[](count);
        disclosedArr = new bool[](count);
        for (uint256 i; i < count; i++) {
            severities[i] = findings[auditId][i].severity;
            resolved[i] = findings[auditId][i].resolved;
            disclosedArr[i] = findings[auditId][i].disclosed;
        }
    }
}
