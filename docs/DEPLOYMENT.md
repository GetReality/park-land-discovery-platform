# 🚀 Deployment Guide - DigitalOcean

This guide will walk you through deploying the Park-Adjacent Land Discovery Platform to DigitalOcean.

## 📋 Prerequisites

- DigitalOcean account with $200 free credit
- GitHub account
- Mapbox account (free tier available)
- Domain name (optional, can use DigitalOcean subdomain)

## 🔧 Step 1: Prepare Your Repository

### 1.1 Create GitHub Repository
```bash
# Create new repository on GitHub
# Name: park-land-discovery-platform
# Visibility: Public (required for free DigitalOcean deployment)
```

### 1.2 Upload Code
```bash
# Clone your new repository
git clone https://github.com/YOUR_USERNAME/park-land-discovery-platform.git
cd park-land-discovery-platform

# Copy all project files to this directory
# Commit and push
git add .
git commit -m "Initial commit - Complete park land discovery platform"
git push origin main
```

## 🗄️ Step 2: Set Up Database

### 2.1 Create PostgreSQL Database
1. Go to [DigitalOcean Databases](https://cloud.digitalocean.com/databases)
2. Click **"Create Database Cluster"**
3. Choose **PostgreSQL 15**
4. Select **Basic plan** ($15/month)
5. Choose **New York 1** region
6. Name: `park-land-db`
7. Click **"Create Database Cluster"**

### 2.2 Configure Database
```bash
# Once created, note down the connection string
# Format: postgresql://username:password@host:port/database

# Enable PostGIS extension (will be done by schema)
# Add your IP to trusted sources in DigitalOcean dashboard
```

### 2.3 Run Database Setup
```bash
# Connect to your database and run:
# 1. database/schema.sql
# 2. database/sample_data.sql

# Using psql:
psql "your_database_connection_string" -f database/schema.sql
psql "your_database_connection_string" -f database/sample_data.sql
```

## 🚀 Step 3: Deploy Application

### 3.1 Update app.yaml
Edit `deployment/digitalocean/app.yaml`:
```yaml
# Replace 'your-username' with your GitHub username
github:
  repo: YOUR_USERNAME/park-land-discovery-platform
  branch: main
```

### 3.2 Create App Platform App
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Choose **GitHub** as source
4. Select your repository: `park-land-discovery-platform`
5. Choose **main** branch
6. Upload the `app.yaml` file or configure manually:

### 3.3 Configure Services

#### Backend Service:
- **Name**: `api`
- **Source Directory**: `/backend`
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Environment Slug**: `node-js`
- **Instance Size**: `basic-xxs`
- **HTTP Port**: `3001`

#### Frontend Service:
- **Name**: `frontend`
- **Source Directory**: `/frontend`
- **Build Command**: `npm run build`
- **Environment Slug**: `node-js`
- **Instance Size**: `basic-xxs`

### 3.4 Set Environment Variables

#### Backend Environment Variables:
```
NODE_ENV=production
PORT=3001
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_super_secure_jwt_secret_32_characters_minimum
MAPBOX_ACCESS_TOKEN=your_mapbox_token
CORS_ORIGIN=https://your-frontend-app-url.ondigitalocean.app
```

#### Frontend Environment Variables:
```
VITE_API_BASE_URL=https://your-backend-app-url.ondigitalocean.app
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_NODE_ENV=production
```

## 🔑 Step 4: Get Required API Keys

### 4.1 Mapbox Access Token
1. Go to [Mapbox](https://account.mapbox.com/)
2. Create free account
3. Go to **Access Tokens**
4. Copy your **Default Public Token**
5. Add to both backend and frontend environment variables

### 4.2 JWT Secret
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ⚙️ Step 5: Configure GitHub Actions (Optional)

### 5.1 Add Repository Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
```
DIGITALOCEAN_ACCESS_TOKEN=your_do_api_token
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 5.2 Get DigitalOcean API Token
1. Go to [DigitalOcean API](https://cloud.digitalocean.com/account/api/tokens)
2. Click **"Generate New Token"**
3. Name: `GitHub Actions`
4. Check **Write** scope
5. Copy token and add to GitHub secrets

## 🌐 Step 6: DNS Configuration (Optional)

### 6.1 Using Custom Domain
1. In DigitalOcean Apps dashboard
2. Go to **Settings** → **Domains**
3. Add your custom domain
4. Update DNS records at your domain provider:
   ```
   CNAME www your-app-url.ondigitalocean.app
   A @ your-app-ip-address
   ```

## 📊 Step 7: Monitoring Setup

### 7.1 Enable Monitoring
1. Go to your App in DigitalOcean
2. Navigate to **Monitoring** tab
3. Monitor CPU, Memory, and Request metrics
4. Set up alerts for high resource usage

### 7.2 Application Logs
```bash
# View logs using doctl
doctl apps logs your-app-id --follow

# Or view in DigitalOcean dashboard
# Apps → Your App → Runtime Logs
```

## 💰 Step 8: Cost Optimization

### 8.1 Current Configuration Cost
- **App Platform (2 services)**: ~$12/month
- **Managed PostgreSQL**: $15/month
- **Bandwidth**: Usually included
- **Total**: ~$27-32/month

### 8.2 Scaling Options
```bash
# Monitor usage and scale as needed
# Upgrade instance sizes if needed
# Add more instances for high traffic
```

## 🔒 Step 9: Security Configuration

### 9.1 Enable HTTPS
- Automatic with DigitalOcean App Platform
- Let's Encrypt SSL certificates

### 9.2 Database Security
- Database is in private network
- Enable connection pooling
- Use environment variables for credentials

## 🧪 Step 10: Testing Deployment

### 10.1 Health Checks
```bash
# Test backend health
curl https://your-backend-url.ondigitalocean.app/health

# Should return:
{
  "status": "OK",
  "timestamp": "2024-...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 10.2 Frontend Testing
1. Visit your frontend URL
2. Test user registration/login
3. Test property search functionality
4. Verify map loads correctly

## 🚨 Troubleshooting

### Common Issues:

#### Build Failures
```bash
# Check build logs in DigitalOcean dashboard
# Common issues:
# - Missing environment variables
# - Node.js version mismatch
# - Missing dependencies
```

#### Database Connection Issues
```bash
# Verify connection string format
# Check trusted sources in database settings
# Ensure PostGIS extension is enabled
```

#### Environment Variable Issues
```bash
# Double-check all required variables
# Ensure no typos in variable names
# Verify secrets are properly set
```

## 📞 Support

- **DigitalOcean Documentation**: [docs.digitalocean.com](https://docs.digitalocean.com/)
- **Community Support**: [digitalocean.com/community](https://www.digitalocean.com/community/)
- **GitHub Issues**: Create issues in your repository

## 🎉 Success!

Once deployed, your Park-Adjacent Land Discovery Platform will be:
- ✅ Live on the internet
- ✅ Automatically scaling
- ✅ Backed by managed database
- ✅ SSL secured
- ✅ Monitoring enabled
- ✅ Ready for users!

**Total deployment time: ~30-60 minutes**
**Monthly cost: ~$32 (vs $200+ on AWS)**
