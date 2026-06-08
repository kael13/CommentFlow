#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/backend/shared/migrations"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"
CONTAINER_NAME="cf-postgres"

DB_NAME="${DB_NAME:-commentflow}"
DB_USER="${DB_USER:-postgres}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "ERROR: Migrations directory not found at $MIGRATIONS_DIR"
    exit 1
fi

SQL_FILES=$(find "$MIGRATIONS_DIR" -name '*.sql' -type f | sort)

if [ -z "$SQL_FILES" ]; then
    echo "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

echo "Running migrations against container: $CONTAINER_NAME"
echo "Database: $DB_NAME | User: $DB_USER"
echo "─────────────────────────────────────────"

FAILED=0
TOTAL=0

for file in $SQL_FILES; do
    TOTAL=$((TOTAL + 1))
    filename="$(basename "$file")"
    echo -n "[$TOTAL] Applying: $filename ... "

    if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f - < "$file" > /dev/null 2>&1; then
        echo "OK"
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
        docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f - < "$file" 2>&1 || true
    fi
done

echo "─────────────────────────────────────────"
echo "Completed: $((TOTAL - FAILED))/$TOTAL migrations applied successfully."

if [ "$FAILED" -gt 0 ]; then
    echo "WARNING: $FAILED migration(s) failed."
    exit 1
fi
