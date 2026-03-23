#!/bin/bash
cd ~/onyxfire/deployment/docker_compose

echo "Restarting frontend (web server)..."

docker compose -f docker-compose.yml -f docker-compose.dev.yml restart web_server

echo ""
echo "Waiting for Next.js dev server to start..."
sleep 5

echo "Container status..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps web_server

echo ""
echo "Frontend: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View frontend logs:  docker logs onyx-web_server-1 -f"
echo "  View all status:     docker compose -f docker-compose.yml -f docker-compose.dev.yml ps"
