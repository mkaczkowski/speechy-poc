#!/bin/bash
# Runs tests + coverage ONLY for files we created/modified in this session.
# This is the primary test script for fast iteration with quality checks.
#
# What it runs:
#   - Test files: Only .test.ts files we touched
#   - Coverage: Scoped to source files we touched
#
# Does NOT run transitively related tests (use test-full.sh for that).
#
# Usage: .claude/skills/queen/scripts/test-scoped.sh
# Exit code: 0 = pass, 1 = failure (test or coverage)

set -euo pipefail

# 1. Collect modified/added SOURCE files (exclude test files)
MODIFIED_SRC=$(git diff --name-only HEAD --diff-filter=ACMR | grep -E '\.(ts|tsx)$' | grep -v -E '\.test\.' || true)
UNTRACKED_SRC=$(git ls-files --others --exclude-standard | grep -E '\.(ts|tsx)$' | grep -v -E '\.test\.' || true)
ALL_SRC=$(echo -e "${MODIFIED_SRC}\n${UNTRACKED_SRC}" | grep -v '^$' | sort -u || true)

# 2. Collect modified/added TEST files
MODIFIED_TESTS=$(git diff --name-only HEAD --diff-filter=ACMR | grep -E '\.test\.(ts|tsx)$' || true)
UNTRACKED_TESTS=$(git ls-files --others --exclude-standard | grep -E '\.test\.(ts|tsx)$' || true)
ALL_TESTS=$(echo -e "${MODIFIED_TESTS}\n${UNTRACKED_TESTS}" | grep -v '^$' | sort -u || true)

if [[ -z "$ALL_TESTS" ]]; then
  echo "No modified/created test files found. Skipping tests."
  exit 0
fi

echo "Running scoped tests + coverage:"
if [[ -n "$ALL_SRC" ]]; then
  echo "  Source files (coverage):"
  echo "$ALL_SRC" | sed 's/^/    /'
fi
echo "  Test files:"
echo "$ALL_TESTS" | sed 's/^/    /'
echo ""

# 3. Build --coverage.include patterns to scope coverage to touched source files
COVERAGE_ARGS=()
if [[ -n "$ALL_SRC" ]]; then
  COVERAGE_ARGS+=("--coverage")
  for file in $ALL_SRC; do
    COVERAGE_ARGS+=("--coverage.include=$file")
  done
fi

# 4. Run vitest with specific test files
if [[ ${#COVERAGE_ARGS[@]} -gt 0 ]]; then
  # With scoped coverage
  # shellcheck disable=SC2086
  npx vitest run "${COVERAGE_ARGS[@]}" $ALL_TESTS
else
  # Without coverage (no source files to measure)
  # shellcheck disable=SC2086
  npx vitest run $ALL_TESTS
fi
