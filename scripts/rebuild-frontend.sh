#!/bin/bash
cd ~/onyxfire/deployment/docker_compose

echo "🔨 Rebuilding frontend (web server)..."

# Stop web server
echo "Stopping web server..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop web_server

# Rebuild
echo "Building web server (this may take a few minutes)..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build web_server

# Start all services
echo "Starting all services..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 10

echo "📋 Container status..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

echo ""
echo "✅ Frontend rebuild complete!"
echo "Frontend:  http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View frontend logs:  docker logs onyx-web_server-1 -f"
echo "  View all status:     docker compose -f docker-compose.yml -f docker-compose.dev.yml ps"
