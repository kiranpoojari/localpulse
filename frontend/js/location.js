let currentLocation = null;

// check internet connection
function isOnline() {
    return navigator.onLine;
}

// reverse geocode using Google Maps via Django backend
async function reverseGeocodeGoogle(lat, lng) {
    if (!isOnline()) return null;

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/api/auth/reverse-geocode/?lat=${lat}&lng=${lng}`
        );
        const data = await response.json();

        if (!response.ok || (!data.taluk && !data.district)) {
            console.warn('Google geocode failed, trying Nominatim...');
            return await reverseGeocodeNominatim(lat, lng);
        }

        console.log('Google result:', data);
        return data;

    } catch (error) {
        console.error('Google geocode error:', error);
        return await reverseGeocodeNominatim(lat, lng);
    }
}

// fallback — Nominatim
async function reverseGeocodeNominatim(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        const address = data.address || {};

        const village = address.village || address.town ||
                        address.city_district || address.hamlet || '';
        const taluk = address.state_district || address.county || address.district || '';
        const state = address.state || '';

        console.log('Nominatim result:', { village, taluk, state });
        return { village, taluk, district: taluk, state };

    } catch (error) {
        console.error('Nominatim error:', error);
        return null;
    }
}

// main detect location function
async function detectLocation() {
    const display = document.getElementById('location-display');
    if (display) display.value = 'Detecting your location...';

    // check internet first
    if (!isOnline()) {
        if (display) display.value = 'No internet connection';
        showNetworkError();
        return null;
    }

    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            if (display) display.value = 'Geolocation not supported';
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                console.log('GPS:', lat, lng);

                const result = await reverseGeocodeGoogle(lat, lng);

                if (!result) {
                    if (display) display.value = 'Could not detect location';
                    resolve(null);
                    return;
                }

                // village = exact location, district = taluk for filtering
                currentLocation = {
                    lat,
                    lng,
                    city: result.village || result.taluk,
                    district: result.taluk || result.district,
                    state: result.state
                };

                console.log('Final location:', currentLocation);

                const setField = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                };

                setField('latitude', lat);
                setField('longitude', lng);
                setField('city', currentLocation.city);
                setField('district', currentLocation.district);
                setField('state', currentLocation.state);

                if (display) {
                    display.value = `${currentLocation.city}, ${currentLocation.district}`;
                }

                resolve(currentLocation);
            },
            (error) => {
                console.error('GPS error:', error.code, error.message);
                if (display) display.value = 'Location access denied';
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

// for posting — get EXACT current GPS location
async function detectPostLocation() {
    if (!isOnline()) {
        showNetworkError();
        return null;
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const result = await reverseGeocodeGoogle(lat, lng);
                if (!result) { resolve(null); return; }

                // for posts: city = village name, district = taluk
                const postLocation = {
                    lat,
                    lng,
                    city: result.village || result.taluk,
                    district: result.taluk || result.district,
                    state: result.state
                };

                console.log('Post location:', postLocation);

                const setField = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                };

                setField('latitude', lat);
                setField('longitude', lng);
                setField('city', postLocation.city);
                setField('district', postLocation.district);
                setField('state', postLocation.state);

                const display = document.getElementById('location-display');
                if (display) {
                    display.value = `${postLocation.city}, ${postLocation.district}, ${postLocation.state}`;
                }

                currentLocation = postLocation;
                resolve(postLocation);
            },
            (error) => {
                console.error('GPS error:', error);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

// search manual location for posts
async function searchLocation() {
    const query = document.getElementById('manual-location')?.value.trim();
    if (!query) return;

    if (!isOnline()) {
        showNetworkError();
        return;
    }

    const display = document.getElementById('location-display');
    if (display) display.value = 'Searching...';

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1&countrycodes=in`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();

        if (data.length === 0) {
            if (display) display.value = 'Location not found — try again';
            return;
        }

        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        const result = await reverseGeocodeGoogle(lat, lng);
        if (!result) {
            if (display) display.value = 'Could not get location details';
            return;
        }

        currentLocation = {
            lat,
            lng,
            city: result.village || result.taluk,
            district: result.taluk || result.district,
            state: result.state
        };

        const setField = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        setField('latitude', lat);
        setField('longitude', lng);
        setField('city', currentLocation.city);
        setField('district', currentLocation.district);
        setField('state', currentLocation.state);

        if (display) {
            display.value = `${currentLocation.city}, ${currentLocation.district}, ${currentLocation.state}`;
        }

    } catch (error) {
        console.error('Search error:', error);
        if (display) display.value = 'Search failed — check internet connection';
    }
}

// update user location silently on login
async function updateUserLocation() {
    if (!navigator.geolocation || !isOnline()) return;

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    const result = await reverseGeocodeGoogle(lat, lng);
                    if (!result) { resolve(); return; }

                    const city = result.village || result.taluk || '';
                    const district = result.taluk || result.district || '';
                    const state = result.state || '';

                    // always keep registered district — only update lat/lng
                    const user = getUser();
                    if (user && user.district) {
                        await apiCall('/user/update-location/', 'POST', {
                            latitude: lat,
                            longitude: lng,
                            city: user.city || city,
                            district: user.district,
                            state: user.state || state
                        });
                    } else {
                        await apiCall('/user/update-location/', 'POST', {
                            latitude: lat, longitude: lng,
                            city, district, state
                        });
                        const u = getUser();
                        if (u) {
                            u.city = city;
                            u.district = district;
                            u.state = state;
                            saveUser(u);
                        }
                    }
                } catch (error) {
                    console.error('Update location error:', error);
                }
                resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

// show no internet error
function showNetworkError() {
    const errorEl = document.getElementById('register-error') ||
                    document.getElementById('login-error') ||
                    document.getElementById('post-error');
    if (errorEl) {
        errorEl.textContent = '🌐 No internet connection. Please check your network and try again.';
        errorEl.style.display = 'block';
    }
}

// pincode lookup
async function getPincodeLocation(pincode) {
    if (!isOnline()) {
        showNetworkError();
        return null;
    }
    try {
        const response = await fetch(
            `http://127.0.0.1:8000/api/auth/pincode/${pincode}/`
        );
        const data = await response.json();
        if (!response.ok) return null;

        currentLocation = {
            lat: 0, lng: 0,
            city: data.village,
            district: data.taluk,
            state: data.state,
            pincode
        };
        return data;
    } catch (error) {
        console.error('Pincode error:', error);
        return null;
    }
}

// listen for online/offline events globally
window.addEventListener('offline', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) banner.style.display = 'block';
});

window.addEventListener('online', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) banner.style.display = 'none';
});