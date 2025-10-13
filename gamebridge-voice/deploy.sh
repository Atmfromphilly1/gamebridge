#!/bin/bash

# GameBridge Voice - Production Deployment Script
# This script helps you deploy the app to production quickly

echo "🎮 GameBridge Voice - Production Deployment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the gamebridge-voice root directory"
    exit 1
fi

echo "✅ Found GameBridge Voice project"

# Function to deploy backend
deploy_backend() {
    echo ""
    echo "🚀 Deploying Backend..."
    echo "Choose your deployment platform:"
    echo "1) Railway (Recommended - Easy setup)"
    echo "2) DigitalOcean App Platform"
    echo "3) Docker Compose (Self-hosted)"
    echo "4) Skip backend deployment"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
            
            echo "Deploying to Railway..."
            cd backend
            railway login
            railway init
            railway add postgresql
            railway add redis
            railway up
            cd ..
            echo "✅ Backend deployed to Railway!"
            ;;
        2)
            echo "📋 Manual steps for DigitalOcean:"
            echo "1. Create new app in DigitalOcean App Platform"
            echo "2. Connect your GitHub repository"
            echo "3. Add PostgreSQL and Redis services"
            echo "4. Configure environment variables"
            echo "5. Deploy!"
            ;;
        3)
            echo "🐳 Starting Docker Compose..."
            docker-compose up -d
            echo "✅ Backend running with Docker Compose!"
            ;;
        4)
            echo "⏭️ Skipping backend deployment"
            ;;
        *)
            echo "❌ Invalid choice"
            ;;
    esac
}

# Function to prepare mobile apps
prepare_mobile() {
    echo ""
    echo "📱 Preparing Mobile Apps..."
    echo ""
    echo "📋 Mobile App Store Checklist:"
    echo "1. Create Apple Developer Account (\$99/year)"
    echo "2. Create Google Play Console Account (\$25 one-time)"
    echo "3. Update API endpoints in mobile app"
    echo "4. Build release versions"
    echo "5. Submit to app stores"
    echo ""
    
    read -p "Do you want to update API endpoints now? (y/n): " update_endpoints
    
    if [ "$update_endpoints" = "y" ]; then
        echo "Enter your production API URL (e.g., https://api.gamebridge.voice):"
        read api_url
        
        if [ ! -z "$api_url" ]; then
            # Update mobile app API endpoints
            sed -i.bak "s|http://localhost:3000|$api_url|g" mobile/src/services/AuthService.tsx
            sed -i.bak "s|http://localhost:3000|$api_url|g" mobile/src/services/SocketService.tsx
            echo "✅ Updated API endpoints in mobile app"
        fi
    fi
    
    echo ""
    echo "📱 To build mobile apps:"
    echo "cd mobile"
    echo "npm run build:ios    # For iOS"
    echo "npm run build:android # For Android"
}

# Function to prepare desktop app
prepare_desktop() {
    echo ""
    echo "🖥️ Preparing Desktop App..."
    echo ""
    echo "📋 Desktop App Checklist:"
    echo "1. Update API endpoints"
    echo "2. Build for all platforms"
    echo "3. Set up code signing"
    echo "4. Create GitHub releases"
    echo ""
    
    read -p "Do you want to build desktop app now? (y/n): " build_desktop
    
    if [ "$build_desktop" = "y" ]; then
        cd desktop
        npm run build
        npm run dist
        cd ..
        echo "✅ Desktop app built successfully!"
    fi
}

# Function to create production environment file
create_production_env() {
    echo ""
    echo "⚙️ Creating Production Environment Configuration..."
    
    cat > backend/.env.production << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000

# Database Configuration (Update with your production values)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=gamebridge_voice_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Redis Configuration (Update with your production values)
REDIS_HOST=your-production-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration (Generate a strong secret!)
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
JWT_EXPIRES_IN=7d

# TURN/STUN Servers (Use managed service like Twilio)
TURN_SERVER_URL=turn:your-turn-server:3478
TURN_SERVER_USERNAME=your-turn-username
TURN_SERVER_PASSWORD=your-turn-password

# CORS Configuration (Update with your domains)
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    echo "✅ Created backend/.env.production"
    echo "⚠️  IMPORTANT: Update the values in backend/.env.production with your actual production credentials!"
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "🎯 Next Steps:"
    echo "=============="
    echo ""
    echo "1. 📊 Set up monitoring:"
    echo "   - Sentry for error tracking"
    echo "   - Analytics for user metrics"
    echo ""
    echo "2. 🔒 Security checklist:"
    echo "   - SSL certificates"
    echo "   - Security audit"
    echo "   - GDPR compliance"
    echo ""
    echo "3. 📱 App store submission:"
    echo "   - iOS App Store"
    echo "   - Google Play Store"
    echo ""
    echo "4. 🎮 Marketing launch:"
    echo "   - Gaming communities"
    echo "   - Social media"
    echo "   - Content creators"
    echo ""
    echo "5. 📈 Growth tracking:"
    echo "   - User analytics"
    echo "   - Voice usage metrics"
    echo "   - Cross-platform connections"
    echo ""
    echo "📖 Read DEPLOYMENT.md for detailed instructions!"
}

# Main execution
echo ""
echo "What would you like to do?"
echo "1) Deploy backend"
echo "2) Prepare mobile apps"
echo "3) Prepare desktop app"
echo "4) Create production config"
echo "5) Show next steps"
echo "6) Do everything"
echo "7) Exit"

read -p "Enter your choice (1-7): " main_choice

case $main_choice in
    1)
        deploy_backend
        ;;
    2)
        prepare_mobile
        ;;
    3)
        prepare_desktop
        ;;
    4)
        create_production_env
        ;;
    5)
        show_next_steps
        ;;
    6)
        deploy_backend
        prepare_mobile
        prepare_desktop
        create_production_env
        show_next_steps
        ;;
    7)
        echo "👋 Goodbye! Good luck with your launch!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 GameBridge Voice deployment process completed!"
echo "🚀 Ready to connect Xbox and PlayStation players!"
