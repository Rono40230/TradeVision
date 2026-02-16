#!/bin/bash

# Setup IB Gateway Docker - Interactive Brokers Trade Synchronization
# This script configures IB Gateway in Docker for the TradeVision app

set -e

echo "🐳 Setting up IB Gateway Docker Container..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/engine/install/fedora/"
    exit 1
fi

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Start Docker with:"
    echo "   sudo systemctl start docker"
    exit 1
fi

# Check docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ ! -f ".env.ib-gateway" ]; then
        echo "❌ Missing .env file"
        echo "   Please create .env from .env.ib-gateway:"
        echo "   cp .env.ib-gateway .env"
        exit 1
    fi
    cp .env.ib-gateway .env
    echo "✅ Created .env from .env.ib-gateway"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and fill in your TWS credentials:"
    echo "   vi .env"
    echo ""
    exit 1
fi

# Check if credentials are filled
if grep -q "your_username_here" .env || grep -q "your_password_here" .env; then
    echo "❌ .env file has placeholder values"
    echo "   Please fill in TWS_USERID and TWS_PASSWORD in .env file"
    exit 1
fi

echo "✅ Configuration validated"
echo ""
echo "🚀 Starting IB Gateway container..."
docker-compose up -d

echo ""
echo "⏳ Waiting for IB Gateway to be ready (30-60 seconds)..."
sleep 40

# Test connection
echo ""
echo "🧪 Testing IB Gateway connectivity..."
if nc -z localhost 4002 2>/dev/null; then
    echo "✅ IB Gateway is listening on port 4002"
else
    echo "⚠️  Port 4002 not responding yet, still starting..."
    sleep 20
fi

echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "✅ IB Gateway Docker setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Verify credentials in .env are correct"
echo "   2. Check logs: docker-compose logs -f ib-gateway"
echo "   3. Run TradeVision: npm run dev"
echo "   4. Test sync: Click '🔄 Sync from IB' button"
echo ""
echo "🛑 To stop: docker-compose down"
echo "🔄 To restart: docker-compose restart"
