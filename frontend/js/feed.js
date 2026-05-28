const maps = {};

async function loadFeed() {
    const container = document.getElementById('feed-container');
    container.innerHTML = '<div class="loading">Loading alerts...</div>';

    // check internet
    if (!navigator.onLine) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🌐 No Internet Connection</h3>
                <p>Please check your network and try again.</p>
            </div>`;
        return;
    }

    // show user taluk in location bar
    const user = getUser();
    if (user) {
        const locationEl = document.getElementById('user-location');
        if (locationEl) {
            locationEl.textContent = user.district
                ? `${user.district}${user.state ? ', ' + user.state : ''}`
                : 'Location not set';
        }
    }

    const response = await apiCall('/posts/feed/');

    if (!response.ok) {
        container.innerHTML = '<div class="empty-state"><h3>Could not load feed</h3><p>Please try again</p></div>';
        return;
    }

    const posts = await response.json();

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No alerts in your area</h3>
                <p>Be the first to post an alert in your taluk!</p>
            </div>`;
        return;
    }

    container.innerHTML = posts.map(post => renderPostCard(post)).join('');
    posts.forEach(post => initMap(post));
}

function renderPostCard(post) {
    const user = getUser();
    const isOwner = user && user.id === post.author.id;

    const avatarLetter = post.author.username.charAt(0).toUpperCase();
    const timeAgo = getTimeAgo(post.created_at);

    const severityClass = {
        info: 'badge-info',
        warning: 'badge-warning',
        critical: 'badge-critical'
    }[post.severity] || 'badge-info';

    const severityLabel = {
        info: 'ℹ️ Info',
        warning: '⚠️ Warning',
        critical: '🚨 Critical'
    }[post.severity] || 'Info';

    const disputedBanner = post.is_disputed
        ? `<div class="disputed-banner">⚠️ Disputed — Community is questioning this alert. Verify before trusting.</div>`
        : '';

    const imageHtml = post.image
        ? `<img src="http://127.0.0.1:8000${post.image}" class="post-image" alt="Alert image">`
        : '';

    // location display: village, taluk, district
    const locationText = [post.city, post.district]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i) // remove duplicates
        .join(', ');

    const deleteBtn = isOwner
        ? `<button class="vote-btn" style="margin-left:auto; background:#f8d7da; color:#721c24;"
            onclick="deletePost(${post.id})">🗑️ Delete</button>`
        : `<span class="time-ago">${timeAgo}</span>`;

    // map click opens Google Maps at exact location
    const hasCoords = post.latitude && post.longitude &&
                      post.latitude !== 0 && post.longitude !== 0;

    const mapSection = hasCoords ? `
        <div class="post-map" id="map-${post.id}"
            style="cursor:pointer;"
            onclick="openGoogleMaps(${post.latitude}, ${post.longitude})"
            title="Click to open in Google Maps">
        </div>
        <div style="font-size:11px; color:#6c757d; text-align:right;
            padding: 2px 8px 6px; cursor:pointer;"
            onclick="openGoogleMaps(${post.latitude}, ${post.longitude})">
            🗺️ Open in Google Maps
        </div>
    ` : '';

    return `
        <div class="post-card" id="post-${post.id}">
            <div class="post-card-header">
                <div class="post-author">
                    <div class="author-avatar">${avatarLetter}</div>
                    <div class="author-info">
                        <span class="author-name">${post.author.username}</span>
                        <span class="post-meta">
                            <span class="badge ${severityClass}">${severityLabel}</span>
                        </span>
                    </div>
                </div>
            </div>

            ${disputedBanner}
            ${imageHtml}

            <div class="post-card-body">
                ${post.content ? `<p class="post-content">${post.content}</p>` : ''}
                <div class="post-location">
                    📍 ${locationText}
                    &nbsp;•&nbsp; 🕐 ${timeAgo}
                </div>
                ${mapSection}
            </div>

            <div class="post-card-footer">
                <button class="vote-btn vote-btn-real ${post.user_voted === 'real' ? 'active' : ''}"
                    id="real-btn-${post.id}"
                    onclick="castVote(${post.id}, 'real')">
                    ✅ Real <span id="real-count-${post.id}">${post.real_count}</span>
                </button>
                <button class="vote-btn vote-btn-fake ${post.user_voted === 'fake' ? 'active' : ''}"
                    id="fake-btn-${post.id}"
                    onclick="castVote(${post.id}, 'fake')">
                    ❌ Fake <span id="fake-count-${post.id}">${post.fake_count}</span>
                </button>
                ${deleteBtn}
            </div>
        </div>
    `;
}

// open Google Maps at exact post location
function openGoogleMaps(lat, lng) {
    window.open(
        `https://www.google.com/maps?q=${lat},${lng}&z=15`,
        '_blank'
    );
}

function initMap(post) {
    const mapEl = document.getElementById(`map-${post.id}`);
    if (!mapEl) return;

    const hasCoords = post.latitude && post.longitude &&
                      post.latitude !== 0 && post.longitude !== 0;
    if (!hasCoords) return;

    const map = L.map(`map-${post.id}`, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
    }).setView([post.latitude, post.longitude], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    L.marker([post.latitude, post.longitude]).addTo(map)
        .bindPopup(`<b>${post.severity.toUpperCase()}</b><br>${post.city}, ${post.district}`)
        .openPopup();

    maps[post.id] = map;
}

async function castVote(postId, voteType) {
    if (!navigator.onLine) {
        alert('No internet connection. Please check your network.');
        return;
    }

    const response = await apiCall(`/posts/${postId}/vote/`, 'POST', { vote_type: voteType });
    const data = await response.json();

    if (response.ok) {
        const countResponse = await apiCall(`/posts/${postId}/votes/`);
        const countData = await countResponse.json();

        document.getElementById(`real-count-${postId}`).textContent = countData.real_count;
        document.getElementById(`fake-count-${postId}`).textContent = countData.fake_count;

        const realBtn = document.getElementById(`real-btn-${postId}`);
        const fakeBtn = document.getElementById(`fake-btn-${postId}`);

        realBtn.classList.toggle('active', countData.your_vote === 'real');
        fakeBtn.classList.toggle('active', countData.your_vote === 'fake');

        if (countData.is_disputed) {
            const card = document.getElementById(`post-${postId}`);
            if (!card.querySelector('.disputed-banner')) {
                card.querySelector('.post-card-header').insertAdjacentHTML('afterend',
                    `<div class="disputed-banner">⚠️ Disputed — Community is questioning this alert. Verify before trusting.</div>`
                );
            }
        }
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const response = await apiCall(`/posts/${postId}/delete/`, 'DELETE');
    if (response.ok) {
        document.getElementById(`post-${postId}`).remove();
    }
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}