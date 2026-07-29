#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="https://github.com/workspacesarindustriesltd-creator/project-bjelectronics.git"
ARCHIVE=""
BRANCH="agent/upgrade-bj-electronics-v6.14.0"
BASE_BRANCH="main"
WORKDIR=""
PUSH=0
SKIP_INSTALL=0
SKIP_VERIFY=0

usage() {
  cat <<'EOF'
BJ Electronics v6.14.0 stepwise Git upgrade

Usage:
  ./upgrade-bj-v614-stepwise.sh --archive /path/to/release.zip [options]

Options:
  --repo URL           Git repository URL
  --archive PATH       BJ Electronics v6.14.0 ZIP archive (required)
  --branch NAME        Upgrade branch
  --base NAME          Base branch (default: main)
  --workdir PATH       Existing clean checkout or destination directory
  --push               Push the completed branch to origin
  --skip-install       Do not run npm ci
  --skip-verify        Do not run package verification/build/tests
  -h, --help           Show this help
EOF
}

while (($#)); do
  case "$1" in
    --repo) REPO_URL="${2:?Missing repository URL}"; shift 2 ;;
    --archive) ARCHIVE="${2:?Missing archive path}"; shift 2 ;;
    --branch) BRANCH="${2:?Missing branch name}"; shift 2 ;;
    --base) BASE_BRANCH="${2:?Missing base branch}"; shift 2 ;;
    --workdir) WORKDIR="${2:?Missing workdir path}"; shift 2 ;;
    --push) PUSH=1; shift ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --skip-verify) SKIP_VERIFY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { printf '\n==> %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

need git
need unzip
need node
need npm
need python3

[[ -n "$ARCHIVE" ]] || fail "--archive is required"
ARCHIVE="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$ARCHIVE")"
[[ -f "$ARCHIVE" ]] || fail "Archive not found: $ARCHIVE"

TEMP_ROOT="$(mktemp -d -t bj-v614-upgrade-XXXXXX)"
cleanup() { rm -rf "$TEMP_ROOT"; }
trap cleanup EXIT

if [[ -z "$WORKDIR" ]]; then
  WORKDIR="$TEMP_ROOT/repository"
  info "Cloning repository"
  git clone "$REPO_URL" "$WORKDIR"
else
  WORKDIR="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$WORKDIR")"
  if [[ ! -d "$WORKDIR/.git" ]]; then
    mkdir -p "$WORKDIR"
    git clone "$REPO_URL" "$WORKDIR"
  fi
fi

cd "$WORKDIR"
[[ -z "$(git status --porcelain)" ]] || fail "Checkout has uncommitted changes: $WORKDIR"

info "Fetching repository refs"
git fetch --prune origin

if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git switch -C "$BRANCH" "origin/$BRANCH"
else
  git show-ref --verify --quiet "refs/remotes/origin/$BASE_BRANCH" || fail "origin/$BASE_BRANCH does not exist"
  git switch -C "$BRANCH" "origin/$BASE_BRANCH"
fi

git config user.name >/dev/null 2>&1 || git config user.name "SAR INDUSTRIES NETWORK Automation"
git config user.email >/dev/null 2>&1 || git config user.email "workspace.sarindustriesltd@gmail.com"

info "Extracting release archive"
EXTRACT_DIR="$TEMP_ROOT/extracted"
mkdir -p "$EXTRACT_DIR"
unzip -q "$ARCHIVE" -d "$EXTRACT_DIR"

SOURCE_DIR="$(python3 - "$EXTRACT_DIR" <<'PY'
from pathlib import Path
import json, sys
root = Path(sys.argv[1])
candidates = []
for package_json in root.rglob('package.json'):
    try:
        data = json.loads(package_json.read_text(encoding='utf-8'))
    except Exception:
        continue
    if data.get('name') == 'bj-electronics-store' and data.get('version') == '6.14.0':
        candidates.append(package_json.parent)
if len(candidates) != 1:
    raise SystemExit(f'Expected exactly one BJ Electronics v6.14.0 project root; found {len(candidates)}')
print(candidates[0])
PY
)"

info "Running package safety checks"
python3 - "$SOURCE_DIR" <<'PY'
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
files = [p for p in root.rglob('*') if p.is_file()]
if not files:
    raise SystemExit('Release package is empty')

for path in files:
    rel = path.relative_to(root).as_posix()
    name = path.name.lower()
    if name.startswith('.env') and not name.endswith('.example'):
        raise SystemExit(f'Refusing populated environment file: {rel}')
    if name.endswith(('.pem', '.key', '.p12', '.pfx')):
        raise SystemExit(f'Refusing private key/certificate material: {rel}')

patterns = {
    'GitHub token': re.compile(rb'gh[ps]_[A-Za-z0-9]{30,}'),
    'OpenAI key': re.compile(rb'sk-(?:proj-)?[A-Za-z0-9_-]{20,}'),
    'Private key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
}
for path in files:
    data = path.read_bytes()
    for label, pattern in patterns.items():
        if pattern.search(data):
            raise SystemExit(f'Refusing suspected {label} in {path.relative_to(root)}')
print(f'Safety scan passed: {len(files)} files')
PY

copy_path() {
  local rel="$1"
  rm -rf -- "$WORKDIR/$rel"
  if [[ -e "$SOURCE_DIR/$rel" || -L "$SOURCE_DIR/$rel" ]]; then
    mkdir -p "$(dirname "$WORKDIR/$rel")"
    cp -a -- "$SOURCE_DIR/$rel" "$WORKDIR/$rel"
  fi
}

commit_if_changed() {
  local message="$1"; shift
  local regular_paths=()
  local path

  # The release intentionally tracks example environment templates while its
  # .gitignore blocks populated .env files. Stage those templates explicitly.
  for path in "$@"; do
    case "$path" in
      .env.example|.env.hostinger.example) ;;
      *) regular_paths+=("$path") ;;
    esac
  done

  if ((${#regular_paths[@]})); then
    git add -A -- "${regular_paths[@]}"
  fi
  [[ -f .env.example ]] && git add -f -- .env.example
  [[ -f .env.hostinger.example ]] && git add -f -- .env.hostinger.example

  if git diff --cached --quiet; then
    echo "No changes for: $message"
  else
    git commit -m "$message"
  fi
}

info "Commit 1/7: project foundation"
FOUNDATION=(
  .dockerignore .env.example .env.hostinger.example .gitignore .npmrc AGENTS.md
  Dockerfile docker-compose.yml index.html package.json package-lock.json vite.config.mjs
)
for path in "${FOUNDATION[@]}"; do copy_path "$path"; done
commit_if_changed "chore: establish BJ Electronics v6.14.0 foundation" "${FOUNDATION[@]}"

info "Commit 2/7: storefront and admin UI"
copy_path src
commit_if_changed "feat: upgrade storefront and admin interface" src

info "Commit 3/7: commerce API and database"
copy_path server
commit_if_changed "feat: upgrade commerce API and database" server

info "Commit 4/7: build, deployment, worker, and tests"
TOOLING=(.openai deploy scripts tests worker)
for path in "${TOOLING[@]}"; do copy_path "$path"; done
commit_if_changed "chore: upgrade deployment build worker and tests" "${TOOLING[@]}"

info "Commit 5/7: storefront and brand assets"
copy_path public
commit_if_changed "assets: refresh BJ Electronics storefront and brand assets" public

info "Commit 6/7: release documentation"
python3 - "$SOURCE_DIR" "$WORKDIR" <<'PY'
from pathlib import Path
import shutil, sys
source, dest = map(Path, sys.argv[1:])
for p in source.iterdir():
    if not p.is_file():
        continue
    if p.suffix.lower() == '.md' or p.name.startswith(('VALIDATION-', 'VERIFICATION-')):
        shutil.copy2(p, dest / p.name)
PY
git add -A -- '*.md' 'VALIDATION-*' 'VERIFICATION-*' 2>/dev/null || true
if git diff --cached --quiet; then
  echo "No changes for release documentation"
else
  git commit -m "docs: add BJ Electronics v6.14.0 release documentation"
fi

info "Commit 7/7: exact release-tree synchronization"
python3 - "$SOURCE_DIR" "$WORKDIR" <<'PY'
from pathlib import Path
import os, shutil, sys
source, dest = map(Path, sys.argv[1:])

# Remove project entries while preserving Git metadata and repository-level
# GitHub automation when the release package does not explicitly replace it.
preserve = {'.git'}
if not (source / '.github').exists():
    preserve.add('.github')
for item in dest.iterdir():
    if item.name in preserve:
        continue
    if item.is_dir() and not item.is_symlink():
        shutil.rmtree(item)
    else:
        item.unlink()

# Copy the release package exactly, including dotfiles.
for item in source.iterdir():
    target = dest / item.name
    if item.is_dir() and not item.is_symlink():
        shutil.copytree(item, target, symlinks=True)
    else:
        shutil.copy2(item, target, follow_symlinks=False)
PY
git add -A
if git diff --cached --quiet; then
  echo "Release tree already matches the package exactly"
else
  git commit -m "chore: synchronize exact BJ Electronics v6.14.0 release tree"
fi

info "Verifying exact file-tree synchronization"
python3 - "$SOURCE_DIR" "$WORKDIR" <<'PY'
from pathlib import Path
import hashlib, sys
source, dest = map(Path, sys.argv[1:])

def manifest(root):
    result = {}
    for p in root.rglob('*'):
        if not p.is_file() or '.git' in p.parts:
            continue
        if root == dest and not (source / '.github').exists() and '.github' in p.parts:
            continue
        rel = p.relative_to(root).as_posix()
        result[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return result

left, right = manifest(source), manifest(dest)
if left != right:
    missing = sorted(set(left) - set(right))
    extra = sorted(set(right) - set(left))
    changed = sorted(k for k in set(left) & set(right) if left[k] != right[k])
    raise SystemExit(f'Tree mismatch: missing={missing[:10]}, extra={extra[:10]}, changed={changed[:10]}')
print(f'Exact tree verified: {len(left)} files')
PY

if (( ! SKIP_INSTALL )); then
  info "Installing locked dependencies"
  npm ci --include=dev
fi

if (( ! SKIP_VERIFY )); then
  info "Running security, brand, code, build, and test verification"
  npm run build:diagnose
  npm run security:verify
  npm run brand:verify
  npm run audit:code
  npm test
fi

info "Reviewing commit sequence"
git status --short
git log --oneline --decorate "origin/$BASE_BRANCH..HEAD"

if (( PUSH )); then
  info "Pushing $BRANCH"
  git push --force-with-lease -u origin "$BRANCH"
  echo "Upgrade branch pushed successfully. main was not modified."
else
  echo "Upgrade commits are ready locally. Re-run with --push to publish the branch."
fi
