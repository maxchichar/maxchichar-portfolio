# Contributing to RPI Production Engineering

Open a focused issue or pull request with a clear problem statement, expected behavior, alternatives considered and verification results. Changes to check definitions in `references/gates.json` must include corresponding tests demonstrating both pass and fail behavior. Do not downgrade critical requirements to satisfy a test.

Before a pull request:

```bash
python3 scripts/validate_skill.py .
sha256sum --check MANIFEST.sha256
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

Regenerate `MANIFEST.sha256` after editing tracked content, excluding the manifest itself:

```bash
find . -type f ! -path './.git/*' ! -path '*/__pycache__/*' ! -name MANIFEST.sha256 -print0 \
  | sort -z | xargs -0 sha256sum | sed 's#  \./#  #' > MANIFEST.sha256
```

Never include API keys, customer data, actual private logs, or fabricated evidence in issues, tests, or contributions. Gate validation is metadata validation; it is not a substitute for security review or running target-application tests.
