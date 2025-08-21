# Park-Adjacent Land Discovery Platform - Backend API

A Flask-based REST API for discovering properties near parks and green spaces.

## Features

- Property management with park proximity scoring
- Real-time park data from OpenStreetMap
- Advanced filtering and search capabilities
- Geospatial distance calculations
- RESTful API design
- PostgreSQL database integration

## API Endpoints

### Health Check
- `GET /api/health` - Health check endpoint

### Properties
- `GET /api/properties` - List properties with filtering
- `POST /api/properties` - Create new property
- `GET /api/properties/{id}` - Get specific property
- `GET /api/properties/{id}/nearby-parks` - Get nearby parks for property

### Parks
- `GET /api/parks` - List all parks
- `POST /api/parks/refresh` - Refresh parks data from OpenStreetMap

### Analytics
- `GET /api/analysis/park-score-distribution` - Park score distribution analysis

## Query Parameters

### Properties Filtering
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)
- `min_price` - Minimum price filter
- `max_price` - Maximum price filter
- `min_bedrooms` - Minimum bedrooms filter
- `min_bathrooms` - Minimum bathrooms filter
- `property_type` - Property type filter
- `min_park_score` - Minimum park score filter
- `max_distance_to_park` - Maximum distance to nearest park (meters)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Flask secret key for security
- `MAPBOX_ACCESS_TOKEN` - Mapbox API token
- `PORT` - Server port (default: 5000)

## Deployment

### Using Docker
```bash
docker build -t park-platform-backend .
docker run -p 5000:5000 --env-file .env park-platform-backend
```

### Direct Deployment
```bash
pip install -r requirements.txt
python app.py
```

## Database Schema

### Properties Table
- Basic property information (address, price, bedrooms, etc.)
- Geolocation data (latitude, longitude)
- Park proximity metrics (nearest park, distances, scores)

### Parks Table
- Park information from OpenStreetMap
- Geolocation and amenity data
- Source tracking and metadata

## Park Scoring Algorithm

Properties receive a park score (0-100) based on:
- Distance to nearest park (closer = higher score)
- Number of parks within 1km radius
- Park accessibility and amenities

## Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error description"
}
```

HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Internal Server Error
