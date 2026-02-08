// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PrivateAudit.sol";

contract PrivateAuditTest is Test {
    PrivateAudit audit;
    address owner = makeAddr("owner");
    address project = makeAddr("project");
    address auditor = makeAddr("auditor");

    function setUp() public {
        vm.prank(owner);
        audit = new PrivateAudit();
    }

    function test_requestAudit() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://QmContract", keccak256("bytecode"));
        
        (address p, bytes32 h,,, PrivateAudit.AuditStatus status, uint8 score, uint256 fc, bool disc) = audit.getPublicAuditInfo(id);
        assertEq(p, project);
        assertEq(h, keccak256("bytecode"));
        assertEq(uint8(status), uint8(PrivateAudit.AuditStatus.Pending));
        assertEq(score, 0);
        assertEq(fc, 0);
        assertFalse(disc);
    }

    function test_fullAuditLifecycle() public {
        // 1. Project requests audit
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://QmContract", keccak256("bytecode"));

        // 2. Owner registers and assigns auditor
        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        (,,,,PrivateAudit.AuditStatus status,,,) = audit.getPublicAuditInfo(id);
        assertEq(uint8(status), uint8(PrivateAudit.AuditStatus.InProgress));

        // 3. Auditor adds findings
        vm.startPrank(auditor);
        audit.addFinding(id, PrivateAudit.Severity.Critical, "enc_title", "enc_desc", keccak256("finding1"));
        audit.addFinding(id, PrivateAudit.Severity.High, "enc_title2", "enc_desc2", keccak256("finding2"));
        audit.addFinding(id, PrivateAudit.Severity.Low, "enc_title3", "enc_desc3", keccak256("finding3"));

        // 4. Complete audit
        audit.completeAudit(id, 72, "encrypted_full_report");
        vm.stopPrank();

        uint256 findingCount;
        (,,,,status,,findingCount,) = audit.getPublicAuditInfo(id);
        assertEq(uint8(status), uint8(PrivateAudit.AuditStatus.Completed));
        assertEq(findingCount, 3);

        // 5. Check severity breakdown
        (uint256 crit, uint256 high, uint256 med, uint256 low, uint256 info) = audit.getSeverityBreakdown(id);
        assertEq(crit, 1);
        assertEq(high, 1);
        assertEq(low, 1);
        assertEq(med, 0);
        assertEq(info, 0);
    }

    function test_findingResolutionAndDisclosure() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.startPrank(auditor);
        audit.addFinding(id, PrivateAudit.Severity.High, "t", "d", keccak256("f1"));
        audit.completeAudit(id, 85, "report");
        
        // Resolve finding
        audit.resolveFinding(id, 0);
        vm.stopPrank();

        // Disclose after resolution
        vm.prank(project);
        audit.discloseFinding(id, 0);

        (PrivateAudit.Severity[] memory sevs, bool[] memory resolved, bool[] memory disclosed) = audit.getFindings(id);
        assertEq(uint8(sevs[0]), uint8(PrivateAudit.Severity.High));
        assertTrue(resolved[0]);
        assertTrue(disclosed[0]);
    }

    function test_cannotDiscloseUnresolved() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.startPrank(auditor);
        audit.addFinding(id, PrivateAudit.Severity.Critical, "t", "d", keccak256("f1"));
        audit.completeAudit(id, 50, "report");
        vm.stopPrank();

        vm.prank(project);
        vm.expectRevert("not resolved yet");
        audit.discloseFinding(id, 0);
    }

    function test_fullReportDisclosure() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        audit.completeAudit(id, 95, "report");

        vm.prank(project);
        audit.discloseFullReport(id);

        (,,,,,,,bool disclosed) = audit.getPublicAuditInfo(id);
        assertTrue(disclosed);
    }

    function test_onlyAuditorCanAddFindings() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(project);
        vm.expectRevert("not assigned auditor");
        audit.addFinding(id, PrivateAudit.Severity.High, "t", "d", keccak256("f"));
    }

    function test_projectAuditsTracking() public {
        vm.startPrank(project);
        audit.requestAudit("ipfs://1", keccak256("code1"));
        audit.requestAudit("ipfs://2", keccak256("code2"));
        audit.requestAudit("ipfs://3", keccak256("code3"));
        vm.stopPrank();

        uint256[] memory ids = audit.getProjectAudits(project);
        assertEq(ids.length, 3);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
        assertEq(ids[2], 2);
    }

    function test_auditorReputation() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        audit.completeAudit(id, 90, "report");

        assertEq(audit.auditorReputation(auditor), 1);
    }
}
