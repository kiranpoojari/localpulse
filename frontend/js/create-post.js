// load registered location and also get fresh GPS for exact post location
async function loadRegisteredLocation() {
    const user = getUser();

    // first load registered location as default
    if (user && user.district) {
        document.getElementById('city').value = user.city || '';
        document.getElementById('district').value = user.district || '';
        document.getElementById('state').value = user.state || '';
        document.getElementById('latitude').value = user.latitude || 0;
        document.getElementById('longitude').value = user.longitude || 0;

        const display = document.getElementById('location-display');
        if (display) {
            display.value = `${user.city ? user.city + ', ' : ''}${user.district}, ${user.state}`;
        }
    }

    // then get fresh exact GPS for posting
    await detectPostLocation();
}

async function fetchAndSetLocation() {
    const response = await apiCall('/user/profile/');
    if (!response.ok) return;

    const profile = await response.json();
    saveUser(profile);

    if (profile.district) {
        document.getElementById('city').value = profile.city || '';
        document.getElementById('district').value = profile.district || '';
        document.getElementById('state').value = profile.state || '';
        document.getElementById('latitude').value = profile.latitude || 0;
        document.getElementById('longitude').value = profile.longitude || 0;

        const display = document.getElementById('location-display');
        if (display) {
            display.value = `${profile.city ? profile.city + ', ' : ''}${profile.district}, ${profile.state}`;
        }
    }
}

function handleTypeChange() {
    const type = document.getElementById('post-type').value;
    const contentGroup = document.getElementById('content-group');
    const imageGroup = document.getElementById('image-group');

    if (type === 'text') {
        contentGroup.style.display = 'block';
        imageGroup.style.display = 'none';
    } else if (type === 'photo') {
        contentGroup.style.display = 'none';
        imageGroup.style.display = 'block';
    } else {
        contentGroup.style.display = 'block';
        imageGroup.style.display = 'block';
    }
}

// image preview
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            const file = this.files[0];
            const preview = document.getElementById('image-preview');
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}"
                        style="max-width:100%; border-radius:8px; margin-top:8px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

async function handleCreatePost() {
    const postType = document.getElementById('post-type').value;
    const severity = document.getElementById('severity').value;
    const content = document.getElementById('content')?.value.trim() || '';
    const imageFile = document.getElementById('image')?.files[0];
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const city = document.getElementById('city').value;
    const district = document.getElementById('district').value;
    const state = document.getElementById('state').value;

    if (!district) {
        showPostError('Location not set. Please allow location access.');
        return;
    }

    if (postType === 'text' && !content) {
        showPostError('Please enter alert description');
        return;
    }

    if (postType === 'photo' && !imageFile) {
        showPostError('Please upload a photo');
        return;
    }

    if (postType === 'both' && !content && !imageFile) {
        showPostError('Please enter description or upload a photo');
        return;
    }

    if (!navigator.onLine) {
        showPostError('🌐 No internet connection. Please check your network.');
        return;
    }

    const btn = document.querySelector('.btn-primary');
    btn.textContent = 'Posting...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('post_type', postType);
    formData.append('severity', severity);
    formData.append('latitude', latitude || 0);
    formData.append('longitude', longitude || 0);
    formData.append('city', city);
    formData.append('district', district);
    formData.append('state', state);

    if (content) formData.append('content', content);
    if (imageFile) formData.append('image', imageFile);

    const response = await apiCall('/posts/create/', 'POST', formData, true);
    const data = await response.json();

    btn.textContent = '🚨 Post Alert';
    btn.disabled = false;

    if (response.ok) {
        showPostSuccess('Alert posted successfully! Redirecting...');
        setTimeout(() => window.location.href = 'index.html', 1500);
    } else {
        const error = data.content || data.image || data.detail || 'Failed to post alert';
        showPostError(error);
    }
}

function showPostError(message) {
    const el = document.getElementById('post-error');
    el.textContent = message;
    el.style.display = 'block';
    document.getElementById('post-success').style.display = 'none';
}

function showPostSuccess(message) {
    const el = document.getElementById('post-success');
    el.textContent = message;
    el.style.display = 'block';
    document.getElementById('post-error').style.display = 'none';
}