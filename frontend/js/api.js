const BASE_URL = 'http://127.0.0.1:8000/api';

// save tokens to localStorage
function saveTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
}

// get tokens from localStorage
function getAccessToken() {
    return localStorage.getItem('access_token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

// clear tokens on logout
function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}

// save user info
function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// get user info
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// check if user is logged in
function isLoggedIn() {
    return !!getAccessToken();
}

// redirect to login if not logged in
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
    }
}

// redirect to feed if already logged in
function requireGuest() {
    if (isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// refresh the access token using refresh token
async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) {
        clearTokens();
        window.location.href = 'login.html';
        return null;
    }

    const response = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        return data.access;
    } else {
        clearTokens();
        window.location.href = 'login.html';
        return null;
    }
}

// main API call function — handles token refresh automatically
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    let token = getAccessToken();

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers };
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    let response = await fetch(`${BASE_URL}${endpoint}`, options);

    // if token expired, refresh and retry
    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            options.headers = headers;
            response = await fetch(`${BASE_URL}${endpoint}`, options);
        }
    }

    return response;
}