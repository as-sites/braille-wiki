#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd node
require_cmd pnpm

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

make_secret() {
  node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
}

set_if_empty() {
  key="$1"
  value="$2"
  if ! grep -Eq "^${key}=[^[:space:]]+" .env; then
    if grep -Eq "^${key}=" .env; then
      sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
    else
      printf "\n%s=%s\n" "$key" "$value" >> .env
    fi
    echo "Set ${key} in .env"
  fi
}

set_if_empty "BETTER_AUTH_SECRET" "$(make_secret)"
set_if_empty "INTERNAL_SECRET" "$(make_secret)"

if [ -f .env.bak ]; then
  rm .env.bak
fi

echo "Installing workspace dependencies..."
pnpm install

echo "Running database migrations..."
pnpm --filter @braille-wiki/db db:migrate

echo "Setup complete. Review .env values before starting services."
