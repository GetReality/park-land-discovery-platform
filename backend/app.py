
import os
import logging
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.exceptions import BadRequest, NotFound, InternalServerError
import requests
from sqlalchemy import func, and_, or_
from geopy.distance import geodesic
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/parkland')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, origins=['*'])

# External API configuration
MAPBOX_TOKEN = os.environ.get('MAPBOX_ACCESS_TOKEN')
OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter'

# Database Models
class Property(db.Model):
    __tablename__ = 'properties'

    id = db.Column(db.Integer, primary_key=True)
    address = db.Column(db.String(500), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    price = db.Column(db.Integer, nullable=True)  # Price in dollars
    bedrooms = db.Column(db.Integer, nullable=True)
    bathrooms = db.Column(db.Float, nullable=True)
    square_feet = db.Column(db.Integer, nullable=True)
    property_type = db.Column(db.String(100), nullable=True)
    listing_date = db.Column(db.DateTime, default=datetime.utcnow)
    source = db.Column(db.String(100), nullable=False, default='manual')
    external_id = db.Column(db.String(200), nullable=True)

    # Park proximity fields
    nearest_park_name = db.Column(db.String(200), nullable=True)
    nearest_park_distance = db.Column(db.Float, nullable=True)  # Distance in meters
    park_count_500m = db.Column(db.Integer, default=0)
    park_count_1km = db.Column(db.Integer, default=0)
    park_score = db.Column(db.Float, nullable=True)  # Calculated park proximity score

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'price': self.price,
            'bedrooms': self.bedrooms,
            'bathrooms': self.bathrooms,
            'square_feet': self.square_feet,
            'property_type': self.property_type,
            'listing_date': self.listing_date.isoformat() if self.listing_date else None,
            'source': self.source,
            'nearest_park_name': self.nearest_park_name,
            'nearest_park_distance': self.nearest_park_distance,
            'park_count_500m': self.park_count_500m,
            'park_count_1km': self.park_count_1km,
            'park_score': self.park_score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Park(db.Model):
    __tablename__ = 'parks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    park_type = db.Column(db.String(100), nullable=True)
    amenities = db.Column(db.Text, nullable=True)  # JSON string of amenities
    size_acres = db.Column(db.Float, nullable=True)
    source = db.Column(db.String(100), nullable=False, default='openstreetmap')
    external_id = db.Column(db.String(200), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'park_type': self.park_type,
            'amenities': json.loads(self.amenities) if self.amenities else [],
            'size_acres': self.size_acres,
            'source': self.source
        }

# Utility Functions
def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using geodesic distance."""
    return geodesic((lat1, lon1), (lat2, lon2)).meters

def calculate_park_score(property_obj, parks_nearby):
    """Calculate a park proximity score based on distance and number of parks."""
    if not parks_nearby:
        return 0.0

    # Base score calculation
    nearest_distance = property_obj.nearest_park_distance or float('inf')

    # Distance score (closer = higher score)
    if nearest_distance <= 200:  # Within 200m
        distance_score = 100
    elif nearest_distance <= 500:  # Within 500m
        distance_score = 80
    elif nearest_distance <= 1000:  # Within 1km
        distance_score = 60
    elif nearest_distance <= 2000:  # Within 2km
        distance_score = 40
    else:
        distance_score = 20

    # Quantity bonus
    quantity_bonus = min(property_obj.park_count_1km * 5, 20)

    # Final score (0-120 scale, normalized to 0-100)
    final_score = min((distance_score + quantity_bonus) * 0.83, 100)

    return round(final_score, 2)

def fetch_parks_from_overpass(lat, lon, radius_km=2):
    """Fetch parks from OpenStreetMap via Overpass API."""
    try:
        # Overpass QL query for parks and green spaces
        overpass_query = f"""
        [out:json][timeout:25];
        (
          way["leisure"="park"](around:{radius_km * 1000},{lat},{lon});
          way["landuse"="recreation_ground"](around:{radius_km * 1000},{lat},{lon});
          relation["leisure"="park"](around:{radius_km * 1000},{lat},{lon});
        );
        out center;
        """

        response = requests.post(OVERPASS_API_URL, data=overpass_query, timeout=30)
        response.raise_for_status()

        data = response.json()
        parks = []

        for element in data.get('elements', []):
            # Get coordinates
            if element['type'] == 'way':
                # For ways, use the center point if available
                center_lat = element.get('center', {}).get('lat')
                center_lon = element.get('center', {}).get('lon')
                if not center_lat or not center_lon:
                    continue
            elif element['type'] == 'relation':
                # For relations, use center
                center_lat = element.get('center', {}).get('lat')
                center_lon = element.get('center', {}).get('lon')
                if not center_lat or not center_lon:
                    continue
            else:
                continue

            tags = element.get('tags', {})
            name = tags.get('name', f'Park {element.get("id", "Unknown")}')

            park_data = {
                'name': name,
                'latitude': center_lat,
                'longitude': center_lon,
                'park_type': tags.get('leisure', tags.get('landuse', 'park')),
                'external_id': f"osm_{element['type']}_{element['id']}"
            }

            parks.append(park_data)

        logger.info(f"Fetched {len(parks)} parks from Overpass API")
        return parks

    except Exception as e:
        logger.error(f"Error fetching parks from Overpass API: {str(e)}")
        return []

def update_property_park_info(property_obj):
    """Update park information for a property."""
    try:
        # Get nearby parks from database
        nearby_parks = db.session.query(Park).all()

        if not nearby_parks:
            # If no parks in database, fetch from API
            parks_data = fetch_parks_from_overpass(property_obj.latitude, property_obj.longitude)
            for park_data in parks_data:
                # Check if park already exists
                existing_park = Park.query.filter_by(external_id=park_data['external_id']).first()
                if not existing_park:
                    park = Park(**park_data, source='openstreetmap')
                    db.session.add(park)

            db.session.commit()
            nearby_parks = db.session.query(Park).all()

        # Calculate distances and find nearest park
        parks_with_distances = []
        for park in nearby_parks:
            distance = calculate_distance(
                property_obj.latitude, property_obj.longitude,
                park.latitude, park.longitude
            )
            parks_with_distances.append((park, distance))

        # Sort by distance
        parks_with_distances.sort(key=lambda x: x[1])

        # Update property park information
        if parks_with_distances:
            nearest_park, nearest_distance = parks_with_distances[0]
            property_obj.nearest_park_name = nearest_park.name
            property_obj.nearest_park_distance = nearest_distance

            # Count parks within different radii
            property_obj.park_count_500m = sum(1 for _, dist in parks_with_distances if dist <= 500)
            property_obj.park_count_1km = sum(1 for _, dist in parks_with_distances if dist <= 1000)

            # Calculate park score
            property_obj.park_score = calculate_park_score(property_obj, parks_with_distances)

        db.session.commit()
        logger.info(f"Updated park info for property {property_obj.id}")

    except Exception as e:
        logger.error(f"Error updating park info for property {property_obj.id}: {str(e)}")
        db.session.rollback()

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/properties', methods=['GET'])
def get_properties():
    """Get properties with optional filtering."""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page

        # Filtering parameters
        min_price = request.args.get('min_price', type=int)
        max_price = request.args.get('max_price', type=int)
        min_bedrooms = request.args.get('min_bedrooms', type=int)
        min_bathrooms = request.args.get('min_bathrooms', type=float)
        property_type = request.args.get('property_type')
        min_park_score = request.args.get('min_park_score', type=float)
        max_distance_to_park = request.args.get('max_distance_to_park', type=float)

        # Build query
        query = Property.query

        if min_price:
            query = query.filter(Property.price >= min_price)
        if max_price:
            query = query.filter(Property.price <= max_price)
        if min_bedrooms:
            query = query.filter(Property.bedrooms >= min_bedrooms)
        if min_bathrooms:
            query = query.filter(Property.bathrooms >= min_bathrooms)
        if property_type:
            query = query.filter(Property.property_type.ilike(f'%{property_type}%'))
        if min_park_score:
            query = query.filter(Property.park_score >= min_park_score)
        if max_distance_to_park:
            query = query.filter(Property.nearest_park_distance <= max_distance_to_park)

        # Order by park score (highest first) then by price
        query = query.order_by(Property.park_score.desc().nullslast(), Property.price.asc())

        # Paginate
        paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )

        return jsonify({
            'properties': [prop.to_dict() for prop in paginated.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            }
        })

    except Exception as e:
        logger.error(f"Error getting properties: {str(e)}")
        return jsonify({'error': 'Failed to fetch properties'}), 500

@app.route('/api/properties', methods=['POST'])
def create_property():
    """Create a new property."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Required fields
        required_fields = ['address', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Create property
        property_obj = Property(
            address=data['address'],
            latitude=float(data['latitude']),
            longitude=float(data['longitude']),
            price=data.get('price'),
            bedrooms=data.get('bedrooms'),
            bathrooms=data.get('bathrooms'),
            square_feet=data.get('square_feet'),
            property_type=data.get('property_type'),
            source=data.get('source', 'api')
        )

        db.session.add(property_obj)
        db.session.commit()

        # Update park information
        update_property_park_info(property_obj)

        return jsonify(property_obj.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating property: {str(e)}")
        return jsonify({'error': 'Failed to create property'}), 500

@app.route('/api/properties/<int:property_id>', methods=['GET'])
def get_property(property_id):
    """Get a specific property."""
    try:
        property_obj = Property.query.get_or_404(property_id)
        return jsonify(property_obj.to_dict())
    except Exception as e:
        logger.error(f"Error getting property {property_id}: {str(e)}")
        return jsonify({'error': 'Property not found'}), 404

@app.route('/api/properties/<int:property_id>/nearby-parks', methods=['GET'])
def get_nearby_parks(property_id):
    """Get parks near a specific property."""
    try:
        property_obj = Property.query.get_or_404(property_id)

        # Get radius parameter (default 2km)
        radius_km = float(request.args.get('radius', 2.0))
        radius_m = radius_km * 1000

        # Get all parks and calculate distances
        parks = Park.query.all()
        nearby_parks = []

        for park in parks:
            distance = calculate_distance(
                property_obj.latitude, property_obj.longitude,
                park.latitude, park.longitude
            )

            if distance <= radius_m:
                park_dict = park.to_dict()
                park_dict['distance_meters'] = round(distance, 2)
                nearby_parks.append(park_dict)

        # Sort by distance
        nearby_parks.sort(key=lambda x: x['distance_meters'])

        return jsonify({
            'property': property_obj.to_dict(),
            'nearby_parks': nearby_parks,
            'search_radius_km': radius_km
        })

    except Exception as e:
        logger.error(f"Error getting nearby parks for property {property_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch nearby parks'}), 500

@app.route('/api/parks', methods=['GET'])
def get_parks():
    """Get all parks."""
    try:
        parks = Park.query.all()
        return jsonify([park.to_dict() for park in parks])
    except Exception as e:
        logger.error(f"Error getting parks: {str(e)}")
        return jsonify({'error': 'Failed to fetch parks'}), 500

@app.route('/api/parks/refresh', methods=['POST'])
def refresh_parks():
    """Refresh parks data from external sources."""
    try:
        # Get center point from request or use default
        data = request.get_json() or {}
        lat = data.get('latitude', 40.7128)  # Default to NYC
        lon = data.get('longitude', -74.0060)

        # Fetch parks from Overpass API
        parks_data = fetch_parks_from_overpass(lat, lon, radius_km=5)

        added_count = 0
        updated_count = 0

        for park_data in parks_data:
            existing_park = Park.query.filter_by(external_id=park_data['external_id']).first()

            if existing_park:
                # Update existing park
                for key, value in park_data.items():
                    if hasattr(existing_park, key):
                        setattr(existing_park, key, value)
                existing_park.updated_at = datetime.utcnow()
                updated_count += 1
            else:
                # Add new park
                park = Park(**park_data, source='openstreetmap')
                db.session.add(park)
                added_count += 1

        db.session.commit()

        return jsonify({
            'message': 'Parks data refreshed successfully',
            'added': added_count,
            'updated': updated_count,
            'total_parks': Park.query.count()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error refreshing parks: {str(e)}")
        return jsonify({'error': 'Failed to refresh parks data'}), 500

@app.route('/api/analysis/park-score-distribution', methods=['GET'])
def park_score_distribution():
    """Get distribution of park scores across all properties."""
    try:
        # Get properties with park scores
        properties = Property.query.filter(Property.park_score.isnot(None)).all()

        if not properties:
            return jsonify({
                'message': 'No properties with park scores found',
                'distribution': {}
            })

        # Create score distribution buckets
        buckets = {
            '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0
        }

        scores = [prop.park_score for prop in properties]

        for score in scores:
            if score <= 20:
                buckets['0-20'] += 1
            elif score <= 40:
                buckets['21-40'] += 1
            elif score <= 60:
                buckets['41-60'] += 1
            elif score <= 80:
                buckets['61-80'] += 1
            else:
                buckets['81-100'] += 1

        return jsonify({
            'total_properties': len(properties),
            'average_score': round(sum(scores) / len(scores), 2),
            'min_score': min(scores),
            'max_score': max(scores),
            'distribution': buckets
        })

    except Exception as e:
        logger.error(f"Error analyzing park score distribution: {str(e)}")
        return jsonify({'error': 'Failed to analyze park scores'}), 500

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# Create tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
