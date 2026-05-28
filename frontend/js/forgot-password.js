 
let tempToken = null;

function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + stepNumber).classList.add('active');
    // clear messages
    document.getElementById('fp-error').style.display = 'none';
    document.getElementById('fp-success').style.display = 'none';
}

function showFPError(message) {
    const el = document.getElementById('fp-error');
    el.textContent = message;
    el.style.display = 'block';
    document.getElementById('fp-success').style.display = 'none';
}

function showFPSuccess(message) {
    const el = document.getElementById('fp-success');
    el.textContent = message;
    el.style.display = 'block';
    document.getElementById('fp-error').style.display = 'none';
}

async function handleSendOTP() {
    const email = document.getElementById('fp-email').value.trim();
    if (!email) {
        showFPError('Please enter your email');
        return;
    }

    const btn = document.querySelector('#step1 .btn-primary');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    const response = await apiCall('/auth/forgot-password/', 'POST', { email });
    const data = await response.json();

    btn.textContent = 'Send OTP';
    btn.disabled = false;

    if (response.ok) {
        showFPSuccess('OTP sent to your email!');
        setTimeout(() => showStep(2), 1000);
    } else {
        showFPError(data.error || 'Failed to send OTP');
    }
}

async function handleVerifyOTP() {
    const email = document.getElementById('fp-email').value.trim();
    const otp_code = document.getElementById('fp-otp').value.trim();

    if (!otp_code || otp_code.length !== 6) {
        showFPError('Please enter the 6-digit OTP');
        return;
    }

    const btn = document.querySelector('#step2 .btn-primary');
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    const response = await apiCall('/auth/verify-otp/', 'POST', { email, otp_code });
    const data = await response.json();

    btn.textContent = 'Verify OTP';
    btn.disabled = false;

    if (response.ok) {
        tempToken = data.temp_token;
        showStep(3);
    } else {
        showFPError(data.error || 'Invalid OTP');
    }
}

async function handleResetPassword() {
    const newPassword = document.getElementById('fp-newpassword').value.trim();
    const confirmPassword = document.getElementById('fp-confirmpassword').value.trim();

    if (!newPassword || !confirmPassword) {
        showFPError('Please fill in all fields');
        return;
    }

    if (newPassword.length < 6) {
        showFPError('Password must be at least 6 characters');
        return;
    }

    if (newPassword !== confirmPassword) {
        showFPError('Passwords do not match');
        return;
    }

    const btn = document.querySelector('#step3 .btn-primary');
    btn.textContent = 'Resetting...';
    btn.disabled = true;

    // temporarily set token for this request
    localStorage.setItem('access_token', tempToken);

    const response = await apiCall('/auth/reset-password/', 'POST', {
        new_password: newPassword
    });
    const data = await response.json();

    btn.textContent = 'Reset Password';
    btn.disabled = false;

    if (response.ok) {
        // clear token after reset
        clearTokens();
        showFPSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => window.location.href = 'login.html', 2000);
    } else {
        showFPError(data.error || 'Failed to reset password');
    }
}