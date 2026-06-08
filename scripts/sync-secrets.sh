#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ .env file not found at $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

mkdir -p infra/secrets

echo -n "$DB_PASSWORD" | base64 > infra/secrets/db_password.txt
echo -n "$JWT_SECRET" | base64 > infra/secrets/jwt_secret.txt
echo -n "$ENCRYPTION_KEY" | base64 > infra/secrets/encryption_key.txt

echo "✓ Synced secrets from .env to infra/secrets/"
