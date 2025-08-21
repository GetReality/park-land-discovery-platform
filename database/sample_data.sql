-- Sample data for Park-Adjacent Land Discovery Platform
-- Run this after creating the main schema

-- Insert sample states
INSERT INTO States (state_name, state_abbreviation) VALUES 
('Utah', 'UT'),
('Colorado', 'CO'),
('California', 'CA'),
('Wyoming', 'WY'),
('Montana', 'MT'),
('Arizona', 'AZ'),
('Nevada', 'NV'),
('Idaho', 'ID');

-- Insert sample parks
INSERT INTO Parks (park_name, park_type, state_id, description, latitude, longitude) VALUES 
('Zion National Park', 'National', 1, 'Known for its towering red cliffs and narrow slot canyons', 37.2982, -113.0263),
('Bryce Canyon National Park', 'National', 1, 'Famous for its unique geological structures called hoodoos', 37.5930, -112.1871),
('Rocky Mountain National Park', 'National', 2, 'High-altitude wilderness with snow-capped peaks', 40.3428, -105.6836),
('Yosemite National Park', 'National', 3, 'Renowned for its granite cliffs, waterfalls, and giant sequoias', 37.8651, -119.5383),
('Yellowstone National Park', 'National', 4, 'Americas first national park, famous for geysers and wildlife', 44.4280, -110.5885),
('Glacier National Park', 'National', 5, 'Pristine wilderness with over 700 miles of hiking trails', 48.7596, -113.7870),
('Grand Canyon National Park', 'National', 6, 'One of the worlds most famous natural wonders', 36.1069, -112.1129),
('Great Basin National Park', 'National', 7, 'Dark skies and ancient bristlecone pines', 39.0059, -114.2579);

-- Insert sample amenities
INSERT INTO Amenities (amenity_name, amenity_category, icon_name) VALUES 
('Visitor Center', 'Information', 'info'),
('Camping', 'Accommodation', 'camping'),
('Hiking Trails', 'Recreation', 'hiking'),
('Restrooms', 'Facilities', 'restroom'),
('Picnic Areas', 'Recreation', 'picnic'),
('Gift Shop', 'Services', 'shopping'),
('Restaurant', 'Dining', 'restaurant'),
('Parking', 'Transportation', 'parking'),
('Wildlife Viewing', 'Recreation', 'wildlife'),
('Photography', 'Recreation', 'camera');

-- Insert sample accommodation types
INSERT INTO AccommodationTypes (accommodation_type_name, description, icon_name) VALUES 
('Tent Camping', 'Traditional tent camping sites', 'tent'),
('RV Camping', 'Sites with RV hookups', 'rv'),
('Cabin', 'Rustic cabin accommodations', 'cabin'),
('Lodge', 'Hotel-style accommodations', 'lodge'),
('Glamping', 'Luxury camping experience', 'glamping'),
('Backcountry', 'Wilderness camping', 'backpack');

-- Insert sample park amenities
INSERT INTO ParkAmenities (park_id, amenity_id) VALUES 
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 8), (1, 9),
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 8), (2, 10),
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 8), (3, 9),
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9), (4, 10);

-- Insert sample land parcels
INSERT INTO LandParcels (
    listing_id, latitude, longitude, acreage, price, state_id, county, 
    closest_town, land_description, has_well, has_septic, has_trees, 
    has_right_of_way_access, investment_score, listing_status, listing_date
) VALUES 
('UT001', 37.2500, -113.1000, 5.0, 125000.00, 1, 'Washington County', 'Springdale', 
 'Beautiful 5-acre parcel with red rock views, perfect for building your dream home near Zion National Park.', 
 false, false, true, true, 8.5, 'Active', '2024-01-15'),

('UT002', 37.6200, -112.2500, 10.5, 275000.00, 1, 'Garfield County', 'Bryce', 
 'Stunning 10.5-acre property with panoramic views of Bryce Canyon area. Electricity available at road.', 
 false, false, true, true, 9.2, 'Active', '2024-02-01'),

('CO001', 40.4000, -105.7500, 20.0, 450000.00, 2, 'Larimer County', 'Estes Park', 
 'Pristine 20-acre mountain property with creek running through. Perfect for mountain retreat.', 
 true, true, true, true, 9.8, 'Active', '2024-01-20'),

('CA001', 37.9000, -119.6000, 8.2, 380000.00, 3, 'Mariposa County', 'Mariposa', 
 '8.2 acres of oak woodland with seasonal creek. Great location near Yosemite entrance.', 
 false, true, true, true, 8.8, 'Active', '2024-02-10'),

('WY001', 44.5000, -110.7000, 35.0, 750000.00, 4, 'Park County', 'Gardiner', 
 'Exceptional 35-acre ranch property at the gateway to Yellowstone. Includes well and septic.', 
 true, true, true, true, 9.5, 'Active', '2024-01-05'),

('MT001', 48.8000, -114.0000, 15.7, 325000.00, 5, 'Flathead County', 'West Glacier', 
 'Mountain property with stunning glacier views. 15.7 acres of pristine wilderness access.', 
 false, false, true, true, 9.0, 'Active', '2024-02-15'),

('AZ001', 36.1500, -112.2000, 12.3, 195000.00, 6, 'Coconino County', 'Tusayan', 
 'Desert property near Grand Canyon South Rim. Great investment opportunity for vacation rental.', 
 false, false, false, true, 7.8, 'Active', '2024-01-30'),

('NV001', 39.0500, -114.3000, 25.0, 85000.00, 7, 'White Pine County', 'Baker', 
 'Remote 25-acre parcel near Great Basin National Park. Perfect for off-grid living.', 
 false, false, false, true, 6.5, 'Active', '2024-02-20');

-- Create a sample user (password is 'password123' hashed with bcrypt)
INSERT INTO Users (email, password_hash, first_name, last_name, is_verified, preferences) VALUES 
('demo@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User', true, 
 '{"preferredStates": ["UT", "CO"], "maxPrice": 500000, "minAcreage": 5}');
