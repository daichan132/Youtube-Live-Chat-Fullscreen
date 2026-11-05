#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
project=${1:-fixture}
if (($# > 0)); then shift; fi
case "$project" in
  fixture|accessibility|visual|production-chrome) ;;
  *) echo "Usage: $0 [fixture|accessibility|visual|production-chrome] [Playwright options...]" >&2; exit 2 ;;
esac

playwright_version=$(cd "$repo_root" && node -p "require('./package.json').devDependencies['@playwright/test']")
if [[ ! "$playwright_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Expected an exact Playwright version in package.json.' >&2
  exit 1
fi
results_dir=${YLC_DOCKER_RESULTS_DIR:-"$repo_root/.cache/browser-docker"}
mkdir -p "$results_dir"
results_dir=$(cd "$results_dir" && pwd)
trap 'echo "Browser report: $results_dir/playwright-report/index.html"' EXIT

docker run --rm --init --shm-size=1g \
  --mount "type=bind,source=$repo_root,target=/source,readonly" \
  --mount "type=bind,source=$results_dir,target=/artifacts" \
  --mount type=volume,source=ylc-browser-yarn-cache,target=/root/.yarn/berry/cache \
  --workdir /work --env CI=1 --env PLAYWRIGHT_HTML_OUTPUT_DIR=/artifacts/playwright-report \
  "mcr.microsoft.com/playwright:v${playwright_version}-noble" bash -c '
    set -euo pipefail
    mkdir -p /work
    tar -C /source --exclude=./.git --exclude=./node_modules --exclude=./.cache \
      --exclude=./.output --exclude=./.wxt --exclude=./coverage \
      --exclude=./test-results --exclude=./playwright-report \
      --exclude=./.env --exclude="./.env.*" --exclude=./.npmrc --exclude=./.netrc \
      --exclude=./.aws --exclude=./.ssh -cf - . | tar -C /work -xf -
    expected_node=$(sed -n "s/^node = \"\([0-9]*\)\"$/\1/p" mise.toml)
    actual_node=$(node -p "process.versions.node.split(\".\")[0]")
    if [[ -z "$expected_node" || "$actual_node" != "$expected_node" ]]; then
      echo "Playwright image Node major ($actual_node) does not match mise.toml ($expected_node)." >&2
      exit 1
    fi
    yarn install --immutable
    if [[ "$1" == production-chrome ]]; then
      if ! command -v unzip >/dev/null; then
        apt-get update -qq
        apt-get install -y --no-install-recommends unzip
      fi
      yarn zip
      yarn prepare:production-smoke
      export YLC_EXTENSION_OUTPUT_DIR=.output/production-smoke/chrome YLC_REQUIRE_E2E_BRIDGE=0
    else
      yarn build:e2e
    fi
    project=$1
    shift
    xvfb-run --auto-servernum yarn playwright test --project="$project" --retries=0 \
      --output=/artifacts/test-results "$@"
  ' _ "$project" "$@"
