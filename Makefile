# Variables
SERVICE = hr_system_backend
branch = $(shell git rev-parse --abbrev-ref HEAD)

# Build and restart PM2 service
deploy-pm2:
	@echo "Pulling latest code..."
	@git pull origin $(branch)

	@echo "Installing dependencies..."
	npm ci

	@echo "Building TypeScript project..."
	npm run build

	@echo "Restarting application with PM2..."
	pm2 restart $(SERVICE)

	@echo "PM2 deployment of branch $(branch) completed!"