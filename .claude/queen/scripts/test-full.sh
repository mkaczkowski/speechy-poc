#!/bin/bash
# Runs ALL tests that are transitively related to modified files.
# This is the final guard check before committing - catches regressions in
# existing code that imports our modified files.
#
# WARNING: This can run many tests if you modify core/shared files.
# Use test-scoped.sh for fast iteration, this script for final verification.
#
# Usage: .claude/skills/queen/scripts/test-full.sh
# Exit code: 0 = pass, 1 = failure

set -euo pipefail

# 1. Collect ALL modified/added files (source + test)
MODIFIED=$(git diff --name-only HEAD --diff-filter=ACMR | grep -E '\.(ts|tsx)$' || true)
UNTRACKED=$(git ls-files --others --exclude-standard | grep -E '\.(ts|tsx)$' || true)
ALL_MODIFIED=$(echo -e "${MODIFIED}\n${UNTRACKED}" | grep -v '^$' | sort -u || true)

if [[ -z "$ALL_MODIFIED" ]]; then
  echo "No modified files found. Skipping full test suite."
  exit 0
fi

echo "Running full related test suite for:"
echo "$ALL_MODIFIED" | sed 's/^/  /'
echo ""
echo "NOTE: This runs ALL tests that import these files (transitively)."
echo ""

# 2. Run vitest with --changed to catch regressions in files that import modified code
npx vitest run --changed
