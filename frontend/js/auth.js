async function register(username, email, password) {
    const response = await apiCall('/auth/register/', 'POST', {
        username, email, password
    });

    const data = await response.json();

    if (response.ok) {
        saveTokens(data.access, data.refresh);
        saveUser(data.user);

        // save location from hidden fields
        const city = document.getElementById('city')?.value || '';
        const district = document.getElementById('district')?.value || '';
        const state = document.getElementById('state')?.value || '';
        const latitude = parseFloat(document.getElementById('latitude')?.value || 0);
        const longitude = parseFloat(document.getElementById('longitude')?.value || 0);

        if (district) {
            await apiCall('/user/update-location/', 'POST', {
                latitude, longitude, city, district, state
            });

            saveUser({
                ...data.user,
                city, district, state, latitude, longitude
            });
        }

        window.location.href = 'index.html';
    } else {
        const error = data.email || data.password ||
                      data.username || 'Registration failed';
        showError('register-error', error);
    }
}

async function login(email, password) {
    const response = await apiCall('/auth/login/', 'POST', { email, password });
    const data = await response.json();

    if (response.ok) {
        saveTokens(data.access, data.refresh);
        saveUser(data.user);

        // fetch fresh profile to get saved district
        const profileRes = await apiCall('/user/profile/');
        if (profileRes.ok) {
            const profile = await profileRes.json();
            saveUser(profile);
        }

        window.location.href = 'index.html';
    } else {
        showError('login-error', data.error || 'Invalid email or password');
    }
}

async function logout() {
    const refresh = getRefreshToken();
    await apiCall('/auth/logout/', 'POST', { refresh });
    clearTokens();
    window.location.href = 'login.html';
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}