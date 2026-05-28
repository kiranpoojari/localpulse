async function loadProfile() {
    const response = await apiCall('/user/profile/');
    if (!response.ok) return;

    const user = await response.json();

    // update localStorage with fresh data
    saveUser(user);

    document.getElementById('profile-avatar').textContent =
        user.username.charAt(0).toUpperCase();
    document.getElementById('profile-username').textContent = user.username;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('edit-username').value = user.username;

    if (user.city || user.district) {
        document.getElementById('profile-location').textContent =
            `${user.city || ''}${user.district ? ', ' + user.district : ''}${user.state ? ', ' + user.state : ''}`;
    }
}

async function loadMyPosts() {
    const container = document.getElementById('my-posts-container');

    const response = await apiCall('/posts/feed/');
    if (!response.ok) {
        container.innerHTML = '<div class="empty-state"><h3>Could not load posts</h3></div>';
        return;
    }

    const allPosts = await response.json();
    const user = getUser();

    // filter only current user's posts
    const myPosts = allPosts.filter(post => post.author.id === user.id);

    if (myPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No alerts posted yet</h3>
                <p>Post your first alert to help your community!</p>
                <br>
                <a href="create-post.html" class="btn btn-primary">Post Alert</a>
            </div>`;
        return;
    }

    container.innerHTML = myPosts.map(post => renderPostCard(post)).join('');
    myPosts.forEach(post => initMap(post));
}

async function handleUpdateProfile() {
    const username = document.getElementById('edit-username').value.trim();
    const msgEl = document.getElementById('profile-msg');

    if (!username) {
        msgEl.textContent = 'Please enter a name';
        msgEl.style.color = '#721c24';
        msgEl.style.display = 'block';
        return;
    }

    const response = await apiCall('/user/profile/update/', 'PUT', { username });
    const data = await response.json();

    if (response.ok) {
        saveUser(data);
        document.getElementById('profile-username').textContent = data.username;
        document.getElementById('profile-avatar').textContent =
            data.username.charAt(0).toUpperCase();
        msgEl.textContent = '✅ Profile updated successfully!';
        msgEl.style.color = '#155724';
        msgEl.style.display = 'block';
        setTimeout(() => msgEl.style.display = 'none', 3000);
    } else {
        msgEl.textContent = 'Failed to update profile';
        msgEl.style.color = '#721c24';
        msgEl.style.display = 'block';
    }
}