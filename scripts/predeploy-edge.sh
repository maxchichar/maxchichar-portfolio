#!/usr/bin/env bash
# Runs automatically before `npm run deploy:edge` (npm "pre" script).
# wrangler uploads the files on disk, so make sure they match GitHub's main.
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "deploy:edge: you're on '$branch'. Switch to main first: git checkout main" >&2
  exit 1
fi

# Uncommitted edits to the worker would be deployed as-is; refuse them.
edge_files=(cloudflare-edge.mjs wrangler.edge.jsonc src/lib/cloudflare-admin.ts)
if [ -n "$(git status --porcelain -- "${edge_files[@]}")" ]; then
  echo "deploy:edge: uncommitted changes to the edge worker:" >&2
  git status --short -- "${edge_files[@]}" >&2
  echo "Commit or discard them (git stash) before deploying." >&2
  exit 1
fi

echo "deploy:edge: pulling the latest main..."
git pull --ff-only origin main
