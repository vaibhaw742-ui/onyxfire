#!/bin/bash
# =============================================================================
# install-prod.sh — Full prod EC2 setup from scratch
# Run this once on a fresh Ubuntu 24.04 EC2
# Usage: bash install-prod.sh
# =============================================================================

set -e

echo "============================================================"
echo "🚀 Prod EC2 Setup — Configuration"
echo "============================================================"
echo ""

# =============================================================================
# Collect all variables upfront
# =============================================================================

read -p "ECR Account ID [982733204083]: " INPUT_ECR_ACCOUNT_ID
ECR_ACCOUNT_ID="${INPUT_ECR_ACCOUNT_ID:-982733204083}"

read -p "ECR Region [ap-south-1]: " INPUT_ECR_REGION
ECR_REGION="${INPUT_ECR_REGION:-ap-south-1}"

read -p "ECR Repository name [learning-service]: " INPUT_ECR_REPO
ECR_REPO="${INPUT_ECR_REPO:-learning-service}"

read -p "OnyxFire GitHub repo SSH URL [git@github.com:vaibhaw742-ui/onyxfire.git]: " INPUT_ONYXFIRE_REPO
ONYXFIRE_REPO="${INPUT_ONYXFIRE_REPO:-git@github.com:vaibhaw742-ui/onyxfire.git}"

read -p "OnyxFire branch [development]: " INPUT_ONYXFIRE_BRANCH
ONYXFIRE_BRANCH="${INPUT_ONYXFIRE_BRANCH:-development}"

read -p "OpenAI API key: " OPENAI_API_KEY
read -p "Airtop API key: " AIRTOP_API_KEY
read -p "Postgres password [password]: " INPUT_POSTGRES_PASSWORD
POSTGRES_PASSWORD="${INPUT_POSTGRES_PASSWORD:-password}"

ECR_URI="$ECR_ACCOUNT_ID.dkr.ecr.$ECR_REGION.amazonaws.com"

echo ""
echo "============================================================"
echo "📋 Configuration summary:"
echo "  ECR:           $ECR_URI/$ECR_REPO"
echo "  OnyxFire repo: $ONYXFIRE_REPO ($ONYXFIRE_BRANCH)"
echo "  OpenAI key:    ${OPENAI_API_KEY:0:8}..."
echo "  Categories dir: $CATEGORIES_MD_DIR"
echo "============================================================"
read -p "Press ENTER to start installation..."
echo ""

# =============================================================================
# Step 1 — System update
# =============================================================================
echo "📦 Step 1: Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl wget unzip git nano openssl

# =============================================================================
# Step 2 — Docker
# =============================================================================
echo ""
echo "🐳 Step 2: Installing Docker..."
sudo apt-get install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
sudo chmod 666 /var/run/docker.sock

# Docker Compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

# =============================================================================
# Step 3 — AWS CLI v2
# =============================================================================
echo ""
echo "☁️  Step 3: Installing AWS CLI v2..."
sudo snap install aws-cli --classic
aws --version

# =============================================================================
# Step 4 — SSH key for GitHub
# =============================================================================
echo ""
echo "🔑 Step 4: Setting up SSH key for GitHub..."
if [ ! -f ~/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -C "prod-ec2" -f ~/.ssh/id_ed25519 -N ""
fi
echo ""
echo "👉 Add this SSH public key to GitHub → Settings → SSH keys:"
echo "================================================================"
cat ~/.ssh/id_ed25519.pub
echo "================================================================"
read -p "Press ENTER after adding the key to GitHub..."
ssh -T git@github.com || true

# =============================================================================
# Step 5 — Clone OnyxFire repo
# =============================================================================
echo ""
echo "📂 Step 5: Cloning OnyxFire repo..."
cd ~
git clone $ONYXFIRE_REPO
cd onyxfire
git checkout $ONYXFIRE_BRANCH
git submodule update --init --recursive
echo "✅ Repo cloned"

# =============================================================================
# Step 6 — ECR login
# =============================================================================
echo ""
echo "🔐 Step 6: Logging into ECR..."
aws ecr get-login-password --region $ECR_REGION | \
  docker login --username AWS --password-stdin $ECR_URI
echo "✅ ECR login successful"

# =============================================================================
# Step 7 — Set up .env file
# =============================================================================
echo ""
echo "⚙️  Step 7: Setting up .env file..."
cd ~/onyxfire/deployment/docker_compose
read -p "Categories MD dir (container path) [/workspace/categories]: " INPUT_CATEGORIES_MD_DIR
CATEGORIES_MD_DIR="${INPUT_CATEGORIES_MD_DIR:-/workspace/categories}"

# Copy from template
cp env.template .env

# Helper to set or append env vars
_set_env() {
  local key=$1
  local val=$2
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  elif grep -q "^#.*${key}" .env; then
    sed -i "s|^#.*${key}.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

_set_env "OPENAI_API_KEY" "$OPENAI_API_KEY"
_set_env "AIRTOP_API_KEY" "$AIRTOP_API_KEY"
_set_env "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
_set_env "CATEGORIES_MD_DIR" "$CATEGORIES_MD_DIR"

echo "✅ .env created from env.template"

# =============================================================================
# Step 8 — Start OnyxFire stack
# =============================================================================
echo ""
echo "🚀 Step 8: Starting OnyxFire stack..."
cd ~/onyxfire/deployment/docker_compose
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Waiting 30 seconds for services to start..."
sleep 30

echo ""
echo "📋 Container status:"
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps



# =============================================================================
# Final health checks
# =============================================================================
echo ""
echo "🏥 Final health checks..."
sleep 5
curl -s http://localhost:8080/health && echo " ✅ OnyxFire backend healthy" || echo " ⚠️  OnyxFire backend not ready yet"
curl -s http://localhost:8001/health && echo " ✅ Learning service healthy" || echo " ⚠️  Learning service not ready yet"

PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "============================================================"
echo "✅ Prod EC2 setup complete!"
echo "============================================================"
echo "OnyxFire UI:      http://$PUBLIC_IP:3000"
echo "Backend API:      http://localhost:8080"
echo "Learning Service: http://localhost:8001"
echo "PGAdmin:          http://$PUBLIC_IP:5050"
echo ""
echo "Logs:"
echo "  Backend:          docker logs onyx-api_server-1 -f"
echo "  Learning service: docker logs learning_service -f"
echo "============================================================"
