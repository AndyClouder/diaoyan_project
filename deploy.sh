#!/bin/bash

# CI/CD Deployment Script for Team Assessment System

set -e

echo "🚀 Starting CI/CD deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
check_requirements() {
    print_status "Checking requirements..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi
    
    if [ ! -f "server-cloud.js" ]; then
        print_error "server-cloud.js not found"
        exit 1
    fi
    
    if [ ! -f "render.yaml" ]; then
        print_warning "render.yaml not found - Render deployment may not work"
    fi
    
    print_status "✅ All requirements met"
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    npm ci
    print_status "✅ Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test
    print_status "✅ Tests passed"
}

# Run security audit
run_audit() {
    print_status "Running security audit..."
    npm audit --audit-level moderate || print_warning "Security audit found issues"
    print_status "✅ Security audit completed"
}

# Build application
build_app() {
    print_status "Building application..."
    npm run build || print_warning "No build script found"
    print_status "✅ Build completed"
}

# Deploy to Render
deploy_to_render() {
    print_status "Deploying to Render..."
    
    if [ -f "render.yaml" ]; then
        print_status "Render configuration found"
        print_status "🎯 Render deployment will be triggered automatically"
        print_status "📊 Check Render dashboard for deployment status"
    else
        print_warning "Render configuration not found"
        print_status "Skipping Render deployment"
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    if [ -f "vercel.json" ]; then
        print_status "Vercel configuration found"
        print_status "🎯 Vercel deployment will be triggered automatically"
        print_status "📊 Check Vercel dashboard for deployment status"
    else
        print_warning "Vercel configuration not found"
        print_status "Skipping Vercel deployment"
    fi
}

# Main deployment process
main() {
    print_status "🚀 Team Assessment System CI/CD Deployment"
    print_status "=========================================="
    
    check_requirements
    install_deps
    run_tests
    run_audit
    build_app
    deploy_to_render
    deploy_to_vercel
    
    print_status "🎉 Deployment process completed!"
    print_status "📋 Next steps:"
    print_status "   1. Check your deployment platform dashboards"
    print_status "   2. Verify the application is running"
    print_status "   3. Test the application functionality"
}

# Run main function
main "$@"