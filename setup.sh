#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════╗"
echo "║     CommentFlow — Development Setup          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Generate .env if not exists ──
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "→ Generating .env from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"

    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

    sed -i.bak "s/ENCRYPTION_KEY=your-32-byte-hex-encryption-key/ENCRYPTION_KEY=$ENCRYPTION_KEY/" "$PROJECT_ROOT/.env"
    sed -i.bak "s/JWT_SECRET=your-jwt-secret-here/JWT_SECRET=$JWT_SECRET/" "$PROJECT_ROOT/.env"
    sed -i.bak "s/DB_PASSWORD=your-db-password/DB_PASSWORD=devpassword123/" "$PROJECT_ROOT/.env"
    rm -f "$PROJECT_ROOT/.env.bak"

    echo "  ✓ .env created with random ENCRYPTION_KEY and JWT_SECRET"
    echo "  ⚠  Edit .env to add your OPENROUTER_API_KEY"
else
    echo "→ .env already exists, skipping generation"
fi

echo ""

# ── Step 2: Check Docker ──
if ! command -v docker &> /dev/null; then
    echo "✗ Docker is not installed. Please install Docker Desktop first."
    echo "  https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "✗ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "→ Docker is available ✓"
echo ""

# ── Step 3: Build and start services ──
echo "→ Building and starting services..."
echo "  (This may take a few minutes on first run)"
echo ""

cd "$INFRA_DIR"
docker compose -f docker-compose.dev.yml up --build -d

echo ""
echo "→ Waiting for PostgreSQL to be ready..."
sleep 5

# ── Step 4: Run database migrations ──
echo ""
echo "→ Running database migrations..."

MIGRATIONS_DIR="$PROJECT_ROOT/backend/shared/migrations"
CONTAINER_NAME="cf-postgres"
DB_NAME="commentflow"
DB_USER="postgres"

for file in $(find "$MIGRATIONS_DIR" -name '*.sql' -type f | sort); do
    filename="$(basename "$file")"
    echo -n "  Applying: $filename ... "
    if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f - < "$file" > /dev/null 2>&1; then
        echo "✓"
    else
        echo "✗ (may already exist)"
    fi
done

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     CommentFlow is running!                  ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  Dashboard:  http://localhost                ║"
echo "║  API:        http://localhost/api/health     ║"
echo "║  PostgreSQL: localhost:5432                  ║"
echo "║  Redis:      localhost:6379                  ║"
echo "║                                              ║"
echo "║  Useful commands:                            ║"
echo "║    docker compose -f infra/                  ║"
echo "║      docker-compose.dev.yml logs -f          ║"
echo "║    docker compose -f infra/                  ║"
echo "║      docker-compose.dev.yml down             ║"
echo "║    docker compose -f infra/                  ║"
echo "║      docker-compose.dev.yml restart          ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
