#!/usr/bin/env python3
"""RPI evidence bookkeeping CLI. Checks records and linked local files, NOT truth/security.

Python 3.9+ standard library only. Run from anywhere; paths in records are relative
 to the project root inferred from docs/rpi/<slug>/evidence.json.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

SKILL_ROOT = Path(__file__).resolve().parents[1]
GATES_FILE = SKILL_ROOT / "references" / "gates.json"
TEMPLATE_ROOT = SKILL_ROOT / "assets" / "templates"
HIGH_RISK = {"auth", "payments", "pii", "production-migration", "cross-tenant",
             "destructive", "regulated", "agent-write", "safety", "high-scale"}
STATUSES = {"pending", "pass", "fail", "blocked", "waived"}


def load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ValueError(f"Cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return data


def spec() -> dict[str, Any]:
    return load_json(GATES_FILE)


def slugify(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")[:72].strip("-")
    if not slug:
        raise ValueError("Task needs letters or numbers to form a safe directory name")
    return slug


def initialize(project: Path, task: str, tier: str) -> Path:
    project = project.expanduser().resolve()
    if not project.is_dir():
        raise ValueError(f"Project directory does not exist: {project}")
    if tier not in spec()["tiers"]:
        raise ValueError(f"Invalid risk tier: {tier}")
    target = project / "docs" / "rpi" / slugify(task)
    if target.exists():
        raise ValueError(f"Task record already exists; refusing to overwrite: {target}")
    target.mkdir(parents=True)
    today = dt.date.today().isoformat()
    for name in ("research", "plan", "implementation", "release"):
        source = TEMPLATE_ROOT / f"{name}.md"
        content = source.read_text(encoding="utf-8").replace("{{TASK_TITLE}}", task) \
            .replace("{{TIER}}", tier).replace("{{DATE}}", today)
        (target / f"{name}.md").write_text(content, encoding="utf-8")
    (target / "traceability.csv").write_bytes((TEMPLATE_ROOT / "traceability.csv").read_bytes())
    (target / "proof").mkdir()
    checks = {
        check["id"]: {"status": "pending", "evidence": [], "note": "", "waiver": None}
        for check in spec()["checks"]
    }
    record = {
        "schema_version": 1,
        "task": {"id": slugify(task), "title": task, "tier": tier,
                 "created": today, "owner": "", "risk_flags": []},
        "checks": checks,
        "note": "Record actual output and human approvals; do not set a check to pass by assumption."
    }
    location = target / "evidence.json"
    location.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return location


def project_for_record(record_path: Path) -> Path:
    record_path = record_path.expanduser().resolve()
    # docs/rpi/<task>/evidence.json => project root is parents[3]
    if record_path.name != "evidence.json" or record_path.parent.parent.name != "rpi" \
            or record_path.parent.parent.parent.name != "docs":
        raise ValueError("Expected record at <project>/docs/rpi/<task>/evidence.json")
    return record_path.parents[3]


def proof_path(value: str, project: Path) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        return None
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        return None
    try:
        location = (project / relative).resolve()
        location.relative_to(project.resolve())
    except (ValueError, OSError):
        return None
    if location.name == "evidence.json" or not location.is_file():
        return None
    try:
        if location.stat().st_size == 0:
            return None
    except OSError:
        return None
    return location


def evaluate(record_path: Path, phase: str) -> tuple[list[str], dict[str, int]]:
    gates = spec()
    if phase not in gates["phases"]:
        raise ValueError(f"Unknown phase: {phase}")
    data = load_json(record_path)
    project = project_for_record(record_path)
    errors: list[str] = []
    counters = {"pass": 0, "waived": 0, "pending": 0, "fail": 0, "blocked": 0}
    task = data.get("task")
    if data.get("schema_version") != gates["schema_version"]:
        errors.append("Record schema_version is unsupported")
    if not isinstance(task, dict) or task.get("tier") not in gates["tiers"]:
        raise ValueError("Record task.tier must be patch, standard, or critical")
    tier = task["tier"]
    if not str(task.get("title", "")).strip():
        errors.append("Task has no title")
    if not str(task.get("owner", "")).strip():
        errors.append("Task has no accountable owner (task.owner)")
    flags = task.get("risk_flags", [])
    if not isinstance(flags, list) or any(not isinstance(flag, str) for flag in flags):
        errors.append("risk_flags must be a list of strings")
        flags = []
    unknown_flags = set(flags) - HIGH_RISK
    if unknown_flags:
        errors.append(f"Unknown risk flags: {', '.join(sorted(unknown_flags))}")
    if tier != "critical" and set(flags) & HIGH_RISK:
        errors.append("Critical risk flags present; promote task.tier to critical")
    if not isinstance(data.get("checks"), dict):
        raise ValueError("Record checks must be a JSON object keyed by check ID")
    entries = data["checks"]
    max_phase = gates["phases"].index(phase)
    for check in gates["checks"]:
        if tier not in check["tiers"] or gates["phases"].index(check["phase"]) > max_phase:
            continue
        check_id = check["id"]
        item = entries.get(check_id)
        if not isinstance(item, dict):
            errors.append(f"{check_id}: missing check object")
            continue
        status = item.get("status")
        if status not in STATUSES:
            errors.append(f"{check_id}: unknown status {status!r}")
            continue
        counters[status] += 1
        if status in ("pending", "fail", "blocked"):
            errors.append(f"{check_id}: {check['label']} is {status}")
            continue
        if status == "waived":
            if not check["waivable"]:
                errors.append(f"{check_id}: this check may never be waived")
                continue
            waiver = item.get("waiver")
            if not isinstance(waiver, dict):
                errors.append(f"{check_id}: waiver requires reason, approved_by, expires")
                continue
            reason = waiver.get("reason", "")
            approved = waiver.get("approved_by", "")
            expires = waiver.get("expires", "")
            if not isinstance(reason, str) or len(reason.strip()) < 12:
                errors.append(f"{check_id}: waiver reason must be substantive (>=12 chars)")
            if not isinstance(approved, str) or len(approved.strip()) < 3:
                errors.append(f"{check_id}: waiver requires an accountable approver")
            if isinstance(approved, str) and re.search(r"\b(chatgpt|ai agent|assistant|automated system|self-approved)\b", approved, re.I):
                errors.append(f"{check_id}: an AI/system cannot be its own approving authority")
            try:
                expiry = dt.date.fromisoformat(expires)
                if expiry < dt.date.today():
                    errors.append(f"{check_id}: waiver expired on {expires}")
            except (TypeError, ValueError):
                errors.append(f"{check_id}: waiver expires must be YYYY-MM-DD")
            continue
        # 'pass' is not enough: at least one existing non-empty local evidence file.
        evidence = item.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            errors.append(f"{check_id}: pass requires a linked evidence file")
            continue
        for e in evidence:
            if not isinstance(e, dict) or not isinstance(e.get("note"), str) or not e["note"].strip():
                errors.append(f"{check_id}: each evidence entry needs a meaningful note")
                continue
            if proof_path(e.get("path"), project) is None:
                errors.append(f"{check_id}: evidence path missing/empty/outside project: {e.get('path')!r}")
    return errors, counters


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="RPI scoped record + evidence gate checking (not certification)")
    commands = parser.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init", help="Create RPI docs/evidence records without overwriting")
    init.add_argument("--project", default=".", help="Project directory")
    init.add_argument("--task", required=True, help="Short task title")
    init.add_argument("--tier", choices=spec()["tiers"], default="standard")
    for command in ("status", "validate"):
        sub = commands.add_parser(command, help=f"{command.capitalize()} evidence gate state")
        sub.add_argument("--record", required=True, type=Path)
        sub.add_argument("--phase", choices=spec()["phases"], default="implement",
                         help="Validate this phase AND all prerequisites; release is opt-in")
    args = parser.parse_args(argv)
    try:
        if args.command == "init":
            location = initialize(Path(args.project), args.task, args.tier)
            print(f"Created {location}\nAll checks start PENDING; fill genuine evidence before validation.")
            return 0
        errors, counters = evaluate(args.record, args.phase)
        state = "READY" if not errors else "NOT READY"
        print(f"RPI {args.phase.upper()} GATE: {state}")
        print(" ".join(f"{key}={count}" for key, count in counters.items()))
        if errors:
            print("Open gate issues:")
            for msg in errors:
                print(f"  - {msg}")
        print("Note: a READY record validates file presence and declared status, not evidence truth, approvals, or software quality.")
        return int(bool(errors)) if args.command == "validate" else 0
    except (ValueError, OSError) as exc:
        print(f"RPI ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
