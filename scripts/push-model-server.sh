#!/bin/bash
set -e
cd ~/onyxfire

REPO="vkhemka06/supa-model-server"
SHA=$(git rev-parse --short HEAD)

echo "Pulling latest onyxdotapp model server..."
docker pull onyxdotapp/onyx-model-server:latest

echo "Retagging..."
docker tag onyxdotapp/onyx-model-server:latest $REPO:$SHA
docker tag onyxdotapp/onyx-model-server:latest $REPO:latest

echo "Pushing to DockerHub..."
docker push $REPO:$SHA
docker push $REPO:latest

echo "Done. Pushed $REPO:$SHA and $REPO:latest"
