#!/usr/bin/env python3
"""Adversarial tests for bookkeeping gate behavior. Run with unittest discover."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path

import rpi


class RPITests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.record = rpi.initialize(self.root, "Fix test invoice idempotency", "standard")
        self.data = json.loads(self.record.read_text(encoding="utf-8"))
        self.data["task"]["owner"] = "Engineering maintainer"
        self.save()

    def save(self):
        self.record.write_text(json.dumps(self.data, indent=2), encoding="utf-8")

    def pass_checks(self, through="implement"):
        proof = self.record.parent / "proof" / "observed.txt"
        proof.write_text("Command result: 0; test executed on sandbox fixture\n", encoding="utf-8")
        path = proof.relative_to(self.root).as_posix()
        gates = rpi.spec()
        max_phase = gates["phases"].index(through)
        for check in gates["checks"]:
            if self.data["task"]["tier"] in check["tiers"] and gates["phases"].index(check["phase"]) <= max_phase:
                self.data["checks"][check["id"]] = {
                    "status": "pass", "note": "Actual artifacts require human review",
                    "evidence": [{"path": path, "note": "Test fixture; not authentic certification"}],
                    "waiver": None,
                }
        self.save()

    def test_fresh_record_cannot_claim_readiness(self):
        issues, counters = rpi.evaluate(self.record, "research")
        self.assertTrue(issues)
        self.assertGreater(counters["pending"], 0)

    def test_filled_record_structurally_passes(self):
        self.pass_checks()
        issues, _ = rpi.evaluate(self.record, "implement")
        self.assertEqual(issues, [])
        # Release requires its separate checks despite implementation passing.
        release_issues, _ = rpi.evaluate(self.record, "release")
        self.assertTrue(any("D-" in issue for issue in release_issues))

    def test_no_empty_evidence(self):
        self.pass_checks()
        self.data["checks"]["I-02"]["evidence"] = []
        self.save()
        issues, _ = rpi.evaluate(self.record, "implement")
        self.assertTrue(any("I-02" in issue for issue in issues))

    def test_missing_and_traversal_evidence(self):
        self.pass_checks()
        self.data["checks"]["R-01"]["evidence"] = [{"path": "../../outside.txt", "note": "invalid"}]
        self.save()
        issues, _ = rpi.evaluate(self.record, "research")
        self.assertTrue(any("outside project" in issue for issue in issues))
        self.data["checks"]["R-01"]["evidence"] = [{"path": "does-not-exist", "note": "invalid"}]
        self.save()
        issues, _ = rpi.evaluate(self.record, "research")
        self.assertTrue(any("missing/empty" in issue for issue in issues))

    def test_nonwaivable_check(self):
        self.pass_checks()
        self.data["checks"]["R-01"] = {"status":"waived","waiver":{
            "reason":"We want to ship this without data", "approved_by":"Human reviewer", "expires":"2099-01-01"}}
        self.save()
        issues, _ = rpi.evaluate(self.record, "research")
        self.assertTrue(any("never be waived" in issue for issue in issues))

    def test_valid_waiver_and_expired_waiver(self):
        self.pass_checks()
        item = self.data["checks"]["R-04"]
        item["status"] = "waived"
        item["waiver"] = {"reason": "Existing contract cannot be changed in this iteration",
                          "approved_by": "Authorized human owner", "expires": "2099-01-01"}
        self.save()
        issues, _ = rpi.evaluate(self.record, "research")
        self.assertEqual(issues, [])
        item["waiver"]["expires"] = "2000-01-01"
        self.save()
        issues, _ = rpi.evaluate(self.record, "research")
        self.assertTrue(any("expired" in issue for issue in issues))

    def test_ai_self_approval_rejected(self):
        self.pass_checks()
        item = self.data["checks"]["R-04"]
        item["status"] = "waived"
        item["waiver"] = {"reason":"This seems acceptable but needs an authorized owner",
                          "approved_by":"ChatGPT", "expires":"2099-01-01"}
        self.save()
        issues, _ = rpi.evaluate(self.record, "research")
        self.assertTrue(any("own approving authority" in issue for issue in issues))

    def test_critical_risk_requires_tier_upgrade(self):
        self.pass_checks()
        self.data["task"]["risk_flags"] = ["payments"]
        self.save()
        issues, _ = rpi.evaluate(self.record, "implement")
        self.assertTrue(any("promote" in issue for issue in issues))

    def test_critical_gate_has_human_approval_and_security(self):
        self.data["task"]["tier"] = "critical"
        self.data["task"]["risk_flags"] = ["payments"]
        self.save()
        self.pass_checks("research")
        issues, _ = rpi.evaluate(self.record, "plan")
        self.assertTrue(any("P-06" in issue for issue in issues))
        self.assertTrue(any("P-05" in issue for issue in issues))

    def test_existing_record_never_overwritten(self):
        with self.assertRaises(ValueError):
            rpi.initialize(self.root, "Fix test invoice idempotency", "standard")

    def test_invalid_record_location_rejected(self):
        fake = self.root / "evidence.json"
        fake.write_text(self.record.read_text(encoding="utf-8"), encoding="utf-8")
        with self.assertRaises(ValueError):
            rpi.evaluate(fake, "research")

    def test_slug_no_traversal(self):
        self.assertEqual(rpi.slugify("../../paid? invoice"), "paid-invoice")
        with self.assertRaises(ValueError):
            rpi.slugify("🫥?!")

    def test_bad_owner_blocks_even_fully_passing(self):
        self.pass_checks()
        self.data["task"]["owner"] = ""
        self.save()
        issues, _ = rpi.evaluate(self.record, "implement")
        self.assertTrue(any("accountable owner" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
