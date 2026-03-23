#!/bin/bash
cd ~/onyxfire/deployment/docker_compose

echo "Restarting backend services..."

# Restart api_server and background (volume-mounted, no rebuild needed)
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart api_server background

# Pull latest learning service image from ECR and restart
echo "Logging into ECR..."
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 982733204083.dkr.ecr.ap-south-1.amazonaws.com

echo "Pulling latest learning-service image..."
docker pull 982733204083.dkr.ecr.ap-south-1.amazonaws.com/learning-service:latest

echo "Restarting learning service..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d learning_service

echo ""
echo "Waiting for services to start..."
sleep 10

echo "Container status..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps api_server background learning_service

echo ""
echo "Health checks..."
curl -s http://localhost:8080/health && echo " api_server healthy" || echo " api_server unhealthy"
curl -s http://localhost:8001/health && echo " learning_service healthy" || echo " learning_service unhealthy"

echo ""
echo "Backend API:      http://localhost:8080"
echo "Learning Service: http://localhost:8001"
echo ""
echo "Useful commands:"
echo "  View api_server logs:       docker logs onyx-api_server-1 -f"
echo "  View background logs:       docker logs onyx-background-1 -f"
echo "  View learning service logs: docker logs learning_service -f"
