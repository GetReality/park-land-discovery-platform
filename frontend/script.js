// Application Configuration
const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api' 
        : '/api',
    MAPBOX_TOKEN: 'pk.eyJ1IjoiZ2V0cmVhbGl0eSIsImEiOiJjbWVsdG1sdGQwbWUzMm5vcmEyaTV1ZzdvIn0.DB3l4omQzoqrfZ4GrFvvGg',
    DEFAULT_CENTER: [-74.0060, 40.7128], // NYC
    DEFAULT_ZOOM: 12
};

// Global State
let currentProperties = [];
let currentPage = 1;
let totalPages = 1;
let currentView = 'list';
let map = null;
let markers = [];

// Utility Functions
function formatPrice(price) {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(price);
}

function formatDistance(meters) {
    if (!meters) return 'Distance not available';
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results-grid').style.display = 'none';
    document.getElementById('map-container').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    if (currentView === 'list') {
        document.getElementById('results-grid').style.display = 'grid';
        document.getElementById('map-container').style.display = 'none';
    } else {
        document.getElementById('results-grid').style.display = 'none';
        document.getElementById('map-container').style.display = 'block';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="background: #fee; border: 1px solid #fcc; padding: 1rem; border-radius: 8px; color: #c66;">
            <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>
    `;

    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = '';
    resultsGrid.appendChild(errorDiv);
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

async function searchProperties(filters = {}, page = 1) {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...filters
    });

    return await apiRequest(`/properties?${params}`);
}

async function getProperty(id) {
    return await apiRequest(`/properties/${id}`);
}

async function getNearbyParks(propertyId, radius = 2) {
    return await apiRequest(`/properties/${propertyId}/nearby-parks?radius=${radius}`);
}

async function getParkScoreDistribution() {
    return await apiRequest('/analysis/park-score-distribution');
}

async function getAllParks() {
    return await apiRequest('/parks');
}

// Property Display Functions
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card fade-in';
    card.onclick = () => showPropertyDetails(property.id);

    const parkScore = property.park_score || 0;
    const parkScoreClass = parkScore >= 80 ? 'excellent' : 
                          parkScore >= 60 ? 'good' : 
                          parkScore >= 40 ? 'fair' : 'poor';

    card.innerHTML = `
        <div class="property-image">
            <i class="fas fa-home"></i>
        </div>
        <div class="property-content">
            <div class="property-header">
                <div class="property-price">${formatPrice(property.price)}</div>
                <div class="park-score ${parkScoreClass}">${parkScore.toFixed(1)}</div>
            </div>
            <div class="property-address">${property.address}</div>
            <div class="property-details">
                ${property.bedrooms ? `<span><i class="fas fa-bed"></i> ${property.bedrooms} bed</span>` : ''}
                ${property.bathrooms ? `<span><i class="fas fa-bath"></i> ${property.bathrooms} bath</span>` : ''}
                ${property.square_feet ? `<span><i class="fas fa-ruler-combined"></i> ${property.square_feet.toLocaleString()} sqft</span>` : ''}
            </div>
            ${property.nearest_park_name ? `
                <div class="park-info">
                    <h4><i class="fas fa-tree"></i> ${property.nearest_park_name}</h4>
                    <div class="park-distance">${formatDistance(property.nearest_park_distance)} away</div>
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

function displayProperties(properties) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '';

    if (properties.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No properties found</h3>
                <p>Try adjusting your search filters</p>
            </div>
        `;
        return;
    }

    properties.forEach(property => {
        const card = createPropertyCard(property);
        grid.appendChild(card);
    });
}

function updateResultsCount(total) {
    const countEl = document.getElementById('results-count');
    countEl.textContent = `${total.toLocaleString()} properties found`;
}

// Map Functions
function initializeMap() {
    if (!mapboxgl || !CONFIG.MAPBOX_TOKEN) {
        console.error('Mapbox GL JS not loaded or token not available');
        return;
    }

    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: CONFIG.DEFAULT_CENTER,
        zoom: CONFIG.DEFAULT_ZOOM
    });

    map.addControl(new mapboxgl.NavigationControl());
}

function clearMapMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
}

function addPropertyMarkers(properties) {
    clearMapMarkers();

    if (!map || properties.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    properties.forEach(property => {
        const parkScore = property.park_score || 0;
        const color = parkScore >= 80 ? '#22c55e' : 
                     parkScore >= 60 ? '#eab308' : 
                     parkScore >= 40 ? '#f97316' : '#ef4444';

        const marker = new mapboxgl.Marker({ color })
            .setLngLat([property.longitude, property.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(`
                <div style="min-width: 200px;">
                    <h4 style="margin-bottom: 0.5rem;">${formatPrice(property.price)}</h4>
                    <p style="margin-bottom: 0.5rem; font-size: 0.9rem;">${property.address}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: #666;">Park Score: ${parkScore.toFixed(1)}</span>
                        <button onclick="showPropertyDetails(${property.id})" 
                                style="background: #4a7c59; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">
                            View Details
                        </button>
                    </div>
                </div>
            `))
            .addTo(map);

        markers.push(marker);
        bounds.extend([property.longitude, property.latitude]);
    });

    if (properties.length > 0) {
        map.fitBounds(bounds, { padding: 50 });
    }
}

// Pagination Functions
function createPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            handlePageChange(currentPage - 1);
        }
    };
    pagination.appendChild(prevBtn);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => handlePageChange(1);
        pagination.appendChild(firstBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0.5rem';
            pagination.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i.toString();
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => handlePageChange(i);
        pagination.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0.5rem';
            pagination.appendChild(ellipsis);
        }

        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages.toString();
        lastBtn.onclick = () => handlePageChange(totalPages);
        pagination.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
        }
    };
    pagination.appendChild(nextBtn);
}

function handlePageChange(page) {
    currentPage = page;
    performSearch();
}

// Search and Filter Functions
function getFilterValues() {
    const filters = {};

    const minPrice = document.getElementById('min-price').value;
    if (minPrice) filters.min_price = minPrice;

    const maxPrice = document.getElementById('max-price').value;
    if (maxPrice) filters.max_price = maxPrice;

    const bedrooms = document.getElementById('bedrooms').value;
    if (bedrooms) filters.min_bedrooms = bedrooms;

    const bathrooms = document.getElementById('bathrooms').value;
    if (bathrooms) filters.min_bathrooms = bathrooms;

    const parkScore = document.getElementById('park-score').value;
    if (parkScore) filters.min_park_score = parkScore;

    const maxDistance = document.getElementById('max-distance').value;
    if (maxDistance) filters.max_distance_to_park = maxDistance;

    return filters;
}

function clearFilters() {
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('bedrooms').value = '';
    document.getElementById('bathrooms').value = '';
    document.getElementById('park-score').value = '';
    document.getElementById('max-distance').value = '';

    currentPage = 1;
    performSearch();
}

async function performSearch() {
    try {
        showLoading();

        const filters = getFilterValues();
        const result = await searchProperties(filters, currentPage);

        currentProperties = result.properties;
        totalPages = result.pagination.pages;

        updateResultsCount(result.pagination.total);

        if (currentView === 'list') {
            displayProperties(currentProperties);
        } else {
            addPropertyMarkers(currentProperties);
        }

        createPagination(currentPage, totalPages);

    } catch (error) {
        console.error('Search failed:', error);
        showError('Failed to search properties. Please try again.');
    } finally {
        hideLoading();
    }
}

// Modal Functions
function showPropertyDetails(propertyId) {
    const modal = document.getElementById('property-modal');
    const modalContent = document.getElementById('modal-content-area');

    modal.style.display = 'block';
    modalContent.innerHTML = '<div class="loading-state">Loading property details...</div>';

    Promise.all([
        getProperty(propertyId),
        getNearbyParks(propertyId)
    ]).then(([property, nearbyParksData]) => {
        const nearbyParks = nearbyParksData.nearby_parks || [];

        modalContent.innerHTML = `
            <div class="property-detail">
                <div class="property-detail-header">
                    <h2>${formatPrice(property.price)}</h2>
                    <div class="park-score large">${(property.park_score || 0).toFixed(1)}</div>
                </div>

                <div class="property-detail-address">
                    <i class="fas fa-map-marker-alt"></i> ${property.address}
                </div>

                <div class="property-detail-info">
                    <div class="info-grid">
                        ${property.bedrooms ? `<div class="info-item"><i class="fas fa-bed"></i> ${property.bedrooms} Bedrooms</div>` : ''}
                        ${property.bathrooms ? `<div class="info-item"><i class="fas fa-bath"></i> ${property.bathrooms} Bathrooms</div>` : ''}
                        ${property.square_feet ? `<div class="info-item"><i class="fas fa-ruler-combined"></i> ${property.square_feet.toLocaleString()} sq ft</div>` : ''}
                        ${property.property_type ? `<div class="info-item"><i class="fas fa-home"></i> ${property.property_type}</div>` : ''}
                    </div>
                </div>

                ${property.nearest_park_name ? `
                    <div class="nearest-park-info">
                        <h4><i class="fas fa-tree"></i> Nearest Park</h4>
                        <div class="park-detail">
                            <strong>${property.nearest_park_name}</strong>
                            <span>${formatDistance(property.nearest_park_distance)} away</span>
                        </div>
                    </div>
                ` : ''}

                <div class="park-stats">
                    <div class="stat">
                        <span class="stat-number">${property.park_count_500m || 0}</span>
                        <span class="stat-label">Parks within 500m</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${property.park_count_1km || 0}</span>
                        <span class="stat-label">Parks within 1km</span>
                    </div>
                </div>

                ${nearbyParks.length > 0 ? `
                    <div class="nearby-parks">
                        <h4><i class="fas fa-leaf"></i> Nearby Parks (${nearbyParks.length})</h4>
                        <div class="parks-list">
                            ${nearbyParks.slice(0, 5).map(park => `
                                <div class="park-item">
                                    <span class="park-name">${park.name}</span>
                                    <span class="park-distance">${formatDistance(park.distance_meters)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).catch(error => {
        console.error('Failed to load property details:', error);
        modalContent.innerHTML = '<div class="error-state">Failed to load property details.</div>';
    });
}

// Analytics Functions
async function loadAnalytics() {
    try {
        const [scoreData, parksData] = await Promise.all([
            getParkScoreDistribution(),
            getAllParks()
        ]);

        // Update statistics
        document.getElementById('total-properties').textContent = scoreData.total_properties || 0;
        document.getElementById('avg-park-score').textContent = scoreData.average_score || 0;
        document.getElementById('total-parks').textContent = parksData.length || 0;

        // Create chart
        createScoreDistributionChart(scoreData.distribution || {});

    } catch (error) {
        console.error('Failed to load analytics:', error);
        document.getElementById('score-distribution-chart').innerHTML = 
            '<div class="error-state">Failed to load analytics data.</div>';
    }
}

function createScoreDistributionChart(distribution) {
    const canvas = document.createElement('canvas');
    document.getElementById('score-distribution-chart').innerHTML = '';
    document.getElementById('score-distribution-chart').appendChild(canvas);

    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(distribution),
            datasets: [{
                label: 'Number of Properties',
                data: Object.values(distribution),
                backgroundColor: [
                    '#ef4444',
                    '#f97316',
                    '#eab308',
                    '#22c55e',
                    '#059669'
                ],
                borderColor: '#2d5a27',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Park Score Distribution',
                    color: '#2d5a27'
                }
            }
        }
    });
}

// Navigation Functions
function switchSection(sectionId) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // Load section-specific data
    if (sectionId === 'analytics') {
        loadAnalytics();
    } else if (sectionId === 'search') {
        if (currentProperties.length === 0) {
            performSearch();
        }
    }
}

function switchView(view) {
    currentView = view;

    // Update view toggle buttons
    document.querySelectorAll('.view-toggle .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${view}-view`).classList.add('active');

    if (view === 'list') {
        document.getElementById('results-grid').style.display = 'grid';
        document.getElementById('map-container').style.display = 'none';
        displayProperties(currentProperties);
    } else {
        document.getElementById('results-grid').style.display = 'none';
        document.getElementById('map-container').style.display = 'block';
        if (!map) {
            initializeMap();
        }
        addPropertyMarkers(currentProperties);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            switchSection(sectionId);
        });
    });

    // Search functionality
    document.getElementById('search-btn').addEventListener('click', () => {
        currentPage = 1;
        performSearch();
    });

    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    // View toggle
    document.getElementById('list-view').addEventListener('click', () => switchView('list'));
    document.getElementById('map-view').addEventListener('click', () => switchView('map'));

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('property-modal').style.display = 'none';
    });

    // Close modal on outside click
    document.getElementById('property-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('property-modal')) {
            document.getElementById('property-modal').style.display = 'none';
        }
    });

    // Filter inputs - debounced search
    const debouncedSearch = debounce(() => {
        currentPage = 1;
        performSearch();
    }, 500);

    document.querySelectorAll('.filter-group input, .filter-group select').forEach(input => {
        input.addEventListener('change', debouncedSearch);
    });

    // Initial load
    performSearch();
});

// Make functions available globally for inline event handlers
window.showPropertyDetails = showPropertyDetails;
window.handlePageChange = handlePageChange;
