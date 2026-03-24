#!/bin/bash
set -e
cd ~/onyxfire

REPO="vkhemka06/supa-backend"
SHA=$(git rev-parse --short HEAD)

echo "Building backend image..."
docker build -t $REPO:$SHA -t $REPO:latest ./backend

echo "Pushing to DockerHub..."
docker push $REPO:$SHA
docker push $REPO:latest

echo "Done. Pushed $REPO:$SHA and $REPO:latest"
