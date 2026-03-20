#!/bin/bash
cd ~/onyxfire/deployment/docker_compose

echo "🔨 Rebuilding backend services..."

# Stop backend services
echo "Stopping backend services..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop api_server background
docker rm -f learning_service 2>/dev/null || true

# Rebuild api_server and background
echo "Building backend (this may take a few minutes)..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build api_server background

# Pull latest learning service image from ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 982733204083.dkr.ecr.ap-south-1.amazonaws.com

echo "📦 Pulling latest learning-service image..."
docker pull 982733204083.dkr.ecr.ap-south-1.amazonaws.com/learning-service:latest

# Start all services
echo "🚀 Starting all services..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 15

echo "📋 Container status..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

echo ""
echo "🏥 Health checks..."
curl -s http://localhost:8080/health && echo " ✅ Backend healthy" || echo " ❌ Backend unhealthy"
curl -s http://localhost:8001/health && echo " ✅ Learning service healthy" || echo " ❌ Learning service unhealthy"

echo ""
echo "✅ Backend rebuild complete!"
echo "Backend API:      http://localhost:8080"
echo "API Docs:         http://localhost:8080/api/docs"
echo "Learning Service: http://localhost:8001"
echo ""
echo "Useful commands:"
echo "  View backend logs:          docker logs onyx-api_server-1 -f"
echo "  View learning service logs: docker logs learning_service -f"
echo "  View all status:            docker compose -f docker-compose.yml -f docker-compose.dev.yml ps"
