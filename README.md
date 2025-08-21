# 🏞️ Park-Adjacent Land Discovery Platform

A comprehensive full-stack application for discovering and analyzing land properties near national and state parks.

## 🚀 Features

- **Interactive Map Interface** - Powered by Mapbox with property clustering
- **Advanced Search & Filtering** - Find properties by proximity, price, size, and amenities
- **Investment Analytics** - Property scoring and market insights
- **User Authentication** - Secure user accounts and saved searches
- **Real-time Data** - Live property listings and park information
- **Mobile Responsive** - Works perfectly on all devices

## 🏗️ Technology Stack

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** with PostGIS for geographic data
- **JWT Authentication** for secure API access
- **Redis** for caching and session management

### Frontend
- **React 18** with TypeScript and Hooks
- **Redux Toolkit** for state management
- **Mapbox GL JS** for interactive maps
- **Material-UI** for modern UI components
- **Vite** for fast development and building

### Infrastructure
- **DigitalOcean App Platform** for deployment
- **Managed PostgreSQL** for database hosting
- **DigitalOcean Spaces** for file storage
- **GitHub Actions** for CI/CD

## 💰 Cost-Effective Deployment

**Monthly costs on DigitalOcean:**
- App Platform (Backend + Frontend): $12/month
- Managed PostgreSQL: $15/month
- File Storage (Spaces): $5/month
- **Total: ~$32/month** (vs AWS ~$200+/month)

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL with PostGIS extension
- Mapbox account (free tier available)
- DigitalOcean account

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd park-land-discovery-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Backend (.env)
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database and API keys

   # Frontend (.env)
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your Mapbox token
   ```

4. **Set up database**
   ```bash
   # Create database and run migrations
   cd backend
   npm run migrate
   npm run seed
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This starts both backend (http://localhost:3001) and frontend (http://localhost:3000)

### Production Deployment

1. **Create DigitalOcean Account**
   - Sign up at [digitalocean.com](https://digitalocean.com)
   - Get $200 free credit

2. **Deploy Database**
   ```bash
   # Using DigitalOcean CLI
   doctl databases create park-land-db --engine postgres --region nyc1 --size db-s-1vcpu-1gb --version 15
   ```

3. **Deploy Application**
   ```bash
   # Deploy using app.yaml configuration
   doctl apps create --spec deployment/digitalocean/app.yaml
   ```

4. **Configure Environment Variables**
   - Set up environment variables in DigitalOcean App Platform dashboard
   - Configure database connection strings
   - Add API keys and secrets

## 📊 Database Schema

The application uses a sophisticated database schema optimized for geographic queries:

- **States & Parks** - Location and amenity data
- **Land Parcels** - Property listings with geographic coordinates
- **User Management** - Authentication and saved searches
- **Analytics** - Visitor demographics and market data

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Property Search Endpoints
- `GET /api/land/search` - Geographic property search
- `POST /api/land/advanced-search` - Advanced filtering
- `GET /api/land/:id` - Get property details
- `GET /api/land/:id/analytics` - Property investment analysis

### Park Information Endpoints
- `GET /api/parks` - List all parks
- `GET /api/parks/:id` - Get park details
- `GET /api/parks/:id/nearby-properties` - Properties near park

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
cd backend && npm test

# Frontend tests only
cd frontend && npm test

# E2E tests
npm run test:e2e
```

## 📱 Mobile Support

The application is fully responsive and works excellently on:
- iOS Safari
- Android Chrome
- Mobile browsers with touch-optimized map controls

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Rate Limiting** to prevent API abuse
- **Input Validation** and sanitization
- **CORS Configuration** for secure cross-origin requests
- **SSL/HTTPS** enabled by default
- **Environment Variable Protection** for sensitive data

## 📈 Performance Optimizations

- **Database Indexing** for fast geographic queries
- **Redis Caching** for frequently accessed data
- **CDN Integration** for static asset delivery
- **Code Splitting** for faster frontend loading
- **Image Optimization** and lazy loading
- **Gzip Compression** for reduced payload sizes

## 🌍 Scaling Strategy

### Small Scale (0-10K users) - $32/month
- Current DigitalOcean configuration
- Handles up to 10,000 monthly active users

### Medium Scale (10K-100K users) - $60/month
- Upgrade to Professional App Platform
- Larger database instance
- Additional monitoring and backup features

### Large Scale (100K+ users) - $125/month
- Multiple app instances with load balancing
- Database clustering
- Advanced caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Open a GitHub issue for bug reports
- **Discussions**: Use GitHub Discussions for questions

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Core property search functionality
- [x] Interactive map interface
- [x] User authentication system
- [x] Basic analytics dashboard

### Phase 2 (Next 3 months)
- [ ] Advanced property comparison tools
- [ ] Email notifications for saved searches
- [ ] Mobile app development
- [ ] Real estate agent portal

### Phase 3 (6 months)
- [ ] AI-powered property recommendations
- [ ] Virtual property tours
- [ ] Investment portfolio tracking
- [ ] Market prediction analytics

---

**Built with ❤️ for land enthusiasts and park lovers**
