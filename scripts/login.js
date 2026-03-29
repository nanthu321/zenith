const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePwd = document.getElementById('togglePwd');
const submitBtn = document.getElementById('submitBtn');
const serverError = document.getElementById('serverError');
const serverErrorText = document.getElementById('serverErrorText');

let showPwd = false;
togglePwd.addEventListener('click', () => {
    showPwd = !showPwd;
    passwordInput.type = showPwd ? 'text' : 'password';
    togglePwd.innerHTML = showPwd ?
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' :
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
});

function clearErrors() {
    document.getElementById('emailError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('emailWrapper').classList.remove('input-error');
    document.getElementById('passwordWrapper').classList.remove('input-error');
    serverError.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    let hasErr = false;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email) {
        document.getElementById('emailError').textContent = 'Email is required';
        document.getElementById('emailWrapper').classList.add('input-error');
        hasErr = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        document.getElementById('emailError').textContent = 'Enter a valid email';
        document.getElementById('emailWrapper').classList.add('input-error');
        hasErr = true;
    }
    if (!password) {
        document.getElementById('passwordError').textContent = 'Password is required';
        document.getElementById('passwordWrapper').classList.add('input-error');
        hasErr = true;
    }
    if (hasErr)
        return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-loading"><span class="btn-spinner"></span>Signing in...</span>';

    // SAMPLE RESPONSE
    // {
    //     "success": true,
    //     "data": {
    //         "user_id": 16,
    //         "username": "nantha",
    //         "email": "nantha@gmail.com",
    //         "token": "eyJhbGciOiJIUzM4NCJ9.eyJ1c2VyX2lkIjoxNiwidXNlcm5hbWUiOiJuYW50aGEiLCJlbWFpbCI6Im5hbnRoYUBnbWFpbC5jb20iLCJpYXQiOjE3NzQ3NTQ2NTksImV4cCI6MTc3NDg0MTA1OX0.FYWK7nC5OZ_5xe8AV2rWSXRDK1X0EOSn_Q9HcavhFt_oAavFIgwsXY7xG6LT2CZ4"
    //     }
    // }
    try {
        const res = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        const data = await res.json();
        if (!data.success)
            throw new Error(data.error || 'Login failed');

        const d = data.data || data;

        setCookie('zenith_token', d.token);
        setCookie('zenith_user', JSON.stringify({
            user_id: d.user_id,
            username: d.username,
            email: d.email
        }));
        window.location.href = 'dashboard.html';
    } catch (err) {
        serverErrorText.textContent = err.message || 'Login failed. Please try again.';
        serverError.style.display = 'flex';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
});

emailInput.addEventListener('input', clearErrors);
passwordInput.addEventListener('input', clearErrors);