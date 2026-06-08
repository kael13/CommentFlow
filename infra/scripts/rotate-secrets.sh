#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR/../secrets"

BACKUP_DIR="$SECRETS_DIR/backups/$(date +%Y%m%d_%H%M%S)"

generate_secret() {
    openssl rand -base64 48
}

generate_hex_key() {
    openssl rand -hex 32
}

echo "══════════════════════════════════════════"
echo "  CommentFlow - Secret Rotation"
echo "══════════════════════════════════════════"

if [ ! -d "$SECRETS_DIR" ]; then
    echo "ERROR: Secrets directory not found at $SECRETS_DIR"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo ""
echo "Backing up current secrets to: $BACKUP_DIR"

for secret_file in encryption_key.txt jwt_secret.txt; do
    if [ -f "$SECRETS_DIR/$secret_file" ]; then
        cp "$SECRETS_DIR/$secret_file" "$BACKUP_DIR/$secret_file"
        echo "  Backed up: $secret_file"
    else
        echo "  WARNING: $secret_file not found, skipping backup"
    fi
done

echo ""
echo "Generating new secrets..."

NEW_ENCRYPTION_KEY=$(generate_hex_key)
echo -n "$NEW_ENCRYPTION_KEY" > "$SECRETS_DIR/encryption_key.txt"
echo "  encryption_key.txt - rotated"

NEW_JWT_SECRET=$(generate_secret)
echo -n "$NEW_JWT_SECRET" > "$SECRETS_DIR/jwt_secret.txt"
echo "  jwt_secret.txt - rotated"

echo ""
echo "══════════════════════════════════════════"
echo "  Rotation complete."
echo "  Backups stored at: $BACKUP_DIR"
echo ""
echo "  IMPORTANT: Restart services to apply:"
echo "    docker compose -f infra/docker-compose.yml restart"
echo ""
echo "  NOTE: Existing tokens encrypted with the old"
echo "  encryption key will need to be re-issued."
echo "══════════════════════════════════════════"
