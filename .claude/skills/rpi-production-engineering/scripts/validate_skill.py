#!/usr/bin/env python3
"""Portable RPI bundle sanity validation; NOT the official skills-ref validator."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def validate(root: Path) -> list[str]:
    problems: list[str] = []
    manifest = root / "SKILL.md"
    if not manifest.is_file():
        return ["Missing SKILL.md"]
    content = manifest.read_text(encoding="utf-8")
    parts = content.split("---", 2)
    if len(parts) < 3 or parts[0].strip():
        return ["Missing leading YAML frontmatter"]
    front = parts[1]
    name_match = re.search(r"(?m)^name:\s*(\S+)\s*$", front)
    if not name_match:
        problems.append("Missing name field")
    else:
        name = name_match.group(1)
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or len(name) > 64:
            problems.append("Name must be lowercase hyphen-case <= 64 characters")
        if name != root.name:
            problems.append(f"Directory {root.name} differs from skill name {name}")
    desc = re.search(r"(?ms)^description:\s*(.*?)(?=^[a-zA-Z][\w-]*:|\Z)", front)
    if not desc:
        problems.append("Missing description field")
    else:
        text = " ".join(desc.group(1).split()).lstrip(">|- ")
        if not text or len(text) > 1024:
            problems.append(f"Description length invalid: {len(text)} characters")
    if len(content.splitlines()) >= 500:
        problems.append("SKILL.md exceeds recommended 500 lines")
    # Check Markdown links to local resources, not external URLs.
    for target in re.findall(r"\]\(([^)]+)\)", content):
        if "://" in target or target.startswith("#"):
            continue
        location = (root / target.split("#")[0]).resolve()
        try:
            location.relative_to(root.resolve())
        except ValueError:
            problems.append(f"Out-of-root reference: {target}")
            continue
        if not location.is_file():
            problems.append(f"Missing resource: {target}")
    gates_path = root / "references" / "gates.json"
    try:
        gates = json.loads(gates_path.read_text(encoding="utf-8"))
        ids: set[str] = set()
        for check in gates["checks"]:
            if check["id"] in ids:
                problems.append(f"Duplicate gate ID {check['id']}")
            ids.add(check["id"])
            if check["phase"] not in gates["phases"] or not set(check["tiers"]).issubset(gates["tiers"]):
                problems.append(f"Invalid metadata for {check['id']}")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        problems.append(f"Invalid gates.json: {exc}")
    for name in ("research", "plan", "implementation", "release"):
        if not (root / "assets" / "templates" / f"{name}.md").is_file():
            problems.append(f"Missing {name} template")
    return problems


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]).resolve()
    issues = validate(root)
    if issues:
        print("Bundle sanity validation FAIL:")
        for issue in issues:
            print(" -", issue)
        sys.exit(1)
    print("Bundle sanity validation PASS (local structure only; not official certification).")
