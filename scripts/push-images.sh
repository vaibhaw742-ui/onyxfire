#!/bin/bash
set -e
cd ~/onyxfire

SHA=$(git rev-parse --short HEAD)
echo "Pushing all images at commit $SHA..."

bash ~/onyxfire/scripts/push-backend.sh
bash ~/onyxfire/scripts/push-frontend.sh
bash ~/onyxfire/scripts/push-model-server.sh

echo ""
echo "All images pushed:"
echo "  vkhemka06/supa-backend:$SHA"
echo "  vkhemka06/supa-web-server:$SHA"
echo "  vkhemka06/supa-model-server:$SHA"
