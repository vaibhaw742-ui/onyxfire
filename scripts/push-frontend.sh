#!/bin/bash
set -e
cd ~/onyxfire

REPO="vkhemka06/supa-web-server"
SHA=$(git rev-parse --short HEAD)

echo "Building web server image (this runs next build, takes a few minutes)..."
docker build -t $REPO:$SHA -t $REPO:latest ./web

echo "Pushing to DockerHub..."
docker push $REPO:$SHA
docker push $REPO:latest

echo "Done. Pushed $REPO:$SHA and $REPO:latest"
