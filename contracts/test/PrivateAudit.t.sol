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

    // ─── Additional coverage tests ───────────────────────────────────────

    function test_removeAuditor() public {
        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        assertTrue(audit.registeredAuditors(auditor));
        audit.removeAuditor(auditor);
        assertFalse(audit.registeredAuditors(auditor));
        vm.stopPrank();
    }

    function test_assignUnregisteredAuditor() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.prank(owner);
        vm.expectRevert("not registered auditor");
        audit.assignAuditor(id, auditor);
    }

    function test_assignNotPending() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        // Try assigning again — now InProgress
        vm.expectRevert("not pending");
        audit.assignAuditor(id, auditor);
        vm.stopPrank();
    }

    function test_addFindingNotInProgress() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.startPrank(auditor);
        audit.completeAudit(id, 80, "report");
        // Now completed — can't add findings
        vm.expectRevert("not in progress");
        audit.addFinding(id, PrivateAudit.Severity.Low, "t", "d", keccak256("f"));
        vm.stopPrank();
    }

    function test_completeNotInProgress() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.startPrank(auditor);
        audit.completeAudit(id, 80, "report");
        vm.expectRevert("not in progress");
        audit.completeAudit(id, 90, "report2");
        vm.stopPrank();
    }

    function test_scoreAbove100() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        vm.expectRevert("score max 100");
        audit.completeAudit(id, 101, "report");
    }

    function test_resolveInvalidFinding() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        vm.expectRevert("invalid finding");
        audit.resolveFinding(id, 0);
    }

    function test_discloseInvalidFinding() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        vm.expectRevert("invalid finding");
        audit.discloseFinding(id, 0);
    }

    function test_discloseFullReport_notProject() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        audit.completeAudit(id, 90, "report");

        vm.prank(auditor);
        vm.expectRevert("only project");
        audit.discloseFullReport(id);
    }

    function test_discloseFullReport_notCompleted() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.prank(project);
        vm.expectRevert("not completed");
        audit.discloseFullReport(id);
    }

    function test_resolveNotAuthorized() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        audit.addFinding(id, PrivateAudit.Severity.Low, "t", "d", keccak256("f"));

        address rando = makeAddr("rando");
        vm.prank(rando);
        vm.expectRevert("not authorized");
        audit.resolveFinding(id, 0);
    }

    function test_onlyOwnerRegisterAuditor() public {
        vm.prank(project);
        vm.expectRevert("not owner");
        audit.registerAuditor(auditor);
    }

    function test_onlyOwnerRemoveAuditor() public {
        vm.prank(project);
        vm.expectRevert("not owner");
        audit.removeAuditor(auditor);
    }

    function test_onlyOwnerAssignAuditor() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.prank(project);
        vm.expectRevert("not owner");
        audit.assignAuditor(id, auditor);
    }

    function test_severityBreakdown_allTypes() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.startPrank(auditor);
        audit.addFinding(id, PrivateAudit.Severity.Critical, "t", "d", keccak256("f1"));
        audit.addFinding(id, PrivateAudit.Severity.High, "t", "d", keccak256("f2"));
        audit.addFinding(id, PrivateAudit.Severity.Medium, "t", "d", keccak256("f3"));
        audit.addFinding(id, PrivateAudit.Severity.Low, "t", "d", keccak256("f4"));
        audit.addFinding(id, PrivateAudit.Severity.Info, "t", "d", keccak256("f5"));
        audit.addFinding(id, PrivateAudit.Severity.None, "t", "d", keccak256("f6"));
        vm.stopPrank();

        (uint256 crit, uint256 high, uint256 med, uint256 low, uint256 info) = audit.getSeverityBreakdown(id);
        assertEq(crit, 1);
        assertEq(high, 1);
        assertEq(med, 1);
        assertEq(low, 1);
        assertEq(info, 1);
    }

    function test_projectCanResolveFinding() public {
        vm.prank(project);
        uint256 id = audit.requestAudit("ipfs://Qm", keccak256("code"));

        vm.startPrank(owner);
        audit.registerAuditor(auditor);
        audit.assignAuditor(id, auditor);
        vm.stopPrank();

        vm.prank(auditor);
        audit.addFinding(id, PrivateAudit.Severity.Medium, "t", "d", keccak256("f"));

        vm.prank(project);
        audit.resolveFinding(id, 0);

        (,bool[] memory resolved,) = audit.getFindings(id);
        assertTrue(resolved[0]);
    }
}
