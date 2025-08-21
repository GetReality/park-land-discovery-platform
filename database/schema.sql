-- Park-Adjacent Land Discovery Platform Database Schema
-- Optimized for PostgreSQL with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- States table
CREATE TABLE States (
    state_id SERIAL PRIMARY KEY,
    state_name VARCHAR(255) NOT NULL,
    state_abbreviation VARCHAR(2) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parks table with geographic data
CREATE TABLE Parks (
    park_id SERIAL PRIMARY KEY,
    park_name VARCHAR(255) NOT NULL,
    park_type VARCHAR(50) NOT NULL CHECK (park_type IN ('National', 'State', 'Territory')),
    state_id INT REFERENCES States(state_id),
    description TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    location POINT GENERATED ALWAYS AS (POINT(longitude, latitude)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Park entrances
CREATE TABLE ParkEntrances (
    entrance_id SERIAL PRIMARY KEY,
    park_id INT REFERENCES Parks(park_id) ON DELETE CASCADE,
    entrance_name VARCHAR(255),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    location POINT GENERATED ALWAYS AS (POINT(longitude, latitude)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenities
CREATE TABLE Amenities (
    amenity_id SERIAL PRIMARY KEY,
    amenity_name VARCHAR(255) NOT NULL,
    amenity_category VARCHAR(255),
    icon_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Park amenities junction table
CREATE TABLE ParkAmenities (
    park_id INT REFERENCES Parks(park_id) ON DELETE CASCADE,
    amenity_id INT REFERENCES Amenities(amenity_id) ON DELETE CASCADE,
    PRIMARY KEY (park_id, amenity_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accommodation types
CREATE TABLE AccommodationTypes (
    accommodation_type_id SERIAL PRIMARY KEY,
    accommodation_type_name VARCHAR(50) NOT NULL,
    description TEXT,
    icon_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accommodations
CREATE TABLE Accommodations (
    accommodation_id SERIAL PRIMARY KEY,
    park_id INT REFERENCES Parks(park_id) ON DELETE CASCADE,
    accommodation_type_id INT REFERENCES AccommodationTypes(accommodation_type_id),
    accommodation_name VARCHAR(255),
    description TEXT,
    reservation_required BOOLEAN DEFAULT FALSE,
    reservation_url VARCHAR(255),
    max_occupancy INT,
    number_of_autos_allowed INT,
    allows_pets BOOLEAN DEFAULT FALSE,
    pet_types_allowed TEXT,
    price_range VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for authentication
CREATE TABLE Users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    preferences JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Land parcels - the core property data
CREATE TABLE LandParcels (
    parcel_id SERIAL PRIMARY KEY,
    listing_id VARCHAR(100) UNIQUE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    location POINT GENERATED ALWAYS AS (POINT(longitude, latitude)) STORED,
    acreage DECIMAL(10,2) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    price_per_acre DECIMAL(15,2) GENERATED ALWAYS AS (price / acreage) STORED,
    state_id INT REFERENCES States(state_id),
    county VARCHAR(255),
    closest_town VARCHAR(255),
    closest_msa VARCHAR(255),
    distance_to_nearest_park DECIMAL(10,2),
    land_description TEXT,
    seller_contact_info TEXT,
    listing_url VARCHAR(500),
    annual_taxes DECIMAL(15,2),
    land_use_restrictions TEXT,
    title_type VARCHAR(255),
    title_free_and_clear BOOLEAN DEFAULT TRUE,

    -- Property features
    has_well BOOLEAN DEFAULT FALSE,
    has_septic BOOLEAN DEFAULT FALSE,
    has_river BOOLEAN DEFAULT FALSE,
    has_lake BOOLEAN DEFAULT FALSE,
    has_trees BOOLEAN DEFAULT FALSE,
    has_right_of_way_access BOOLEAN DEFAULT FALSE,
    has_power_service BOOLEAN DEFAULT FALSE,
    has_water_service BOOLEAN DEFAULT FALSE,
    has_gas_service BOOLEAN DEFAULT FALSE,
    has_city_county_sewer_service BOOLEAN DEFAULT FALSE,

    -- Analysis fields
    investment_score DECIMAL(3,2),
    market_analysis JSONB,
    nearby_parks TEXT, -- JSON array of park IDs within 50 miles
    recommendation_summary TEXT,

    -- Status and dates
    listing_status VARCHAR(50) DEFAULT 'Active',
    listing_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved searches for users
CREATE TABLE SavedSearches (
    search_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES Users(user_id) ON DELETE CASCADE,
    search_name VARCHAR(255) NOT NULL,
    search_criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_alerts BOOLEAN DEFAULT FALSE,
    alert_frequency VARCHAR(20) DEFAULT 'daily',
    last_alert_sent TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites
CREATE TABLE UserFavorites (
    user_id UUID REFERENCES Users(user_id) ON DELETE CASCADE,
    parcel_id INT REFERENCES LandParcels(parcel_id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, parcel_id)
);

-- Property views for analytics
CREATE TABLE PropertyViews (
    view_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id INT REFERENCES LandParcels(parcel_id) ON DELETE CASCADE,
    user_id UUID REFERENCES Users(user_id) ON DELETE SET NULL,
    visitor_id VARCHAR(255), -- For anonymous users
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    view_duration INT, -- seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search analytics
CREATE TABLE SearchAnalytics (
    search_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES Users(user_id) ON DELETE SET NULL,
    search_query JSONB NOT NULL,
    results_count INT,
    clicked_results INT[],
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_parks_location ON Parks USING GIST (location);
CREATE INDEX idx_parks_state ON Parks (state_id);
CREATE INDEX idx_parks_type ON Parks (park_type);

CREATE INDEX idx_parcels_location ON LandParcels USING GIST (location);
CREATE INDEX idx_parcels_price ON LandParcels (price);
CREATE INDEX idx_parcels_price_per_acre ON LandParcels (price_per_acre);
CREATE INDEX idx_parcels_acreage ON LandParcels (acreage);
CREATE INDEX idx_parcels_state ON LandParcels (state_id);
CREATE INDEX idx_parcels_status ON LandParcels (listing_status);
CREATE INDEX idx_parcels_features ON LandParcels (has_well, has_septic, has_river, has_lake, has_trees);

CREATE INDEX idx_users_email ON Users (email);
CREATE INDEX idx_users_active ON Users (is_active);

CREATE INDEX idx_saved_searches_user ON SavedSearches (user_id);
CREATE INDEX idx_saved_searches_active ON SavedSearches (is_active);

CREATE INDEX idx_property_views_parcel ON PropertyViews (parcel_id);
CREATE INDEX idx_property_views_user ON PropertyViews (user_id);
CREATE INDEX idx_property_views_created ON PropertyViews (created_at);
