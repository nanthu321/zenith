const form = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('reg-password');
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

passwordInput.addEventListener('input', () => {
    const p = passwordInput.value;
    const el = document.getElementById('pwdStrength');
    if (!p) {
        el.style.display = 'none';
        return;
    }
    el.style.display = 'flex';
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['', '#ef4444', '#f59e0b', '#eab308', '#10b981', '#10b981'];
    for (let i = 1; i <= 5; i++) 
        document.getElementById('bar' + i).style.background = i <= s ? colors[s] : 'var(--border-default)';
    const lbl = document.getElementById('pwdLabel');
    lbl.textContent = labels[s];
    lbl.style.color = colors[s];
});

function clearErrors() {
    ['username', 'email', 'password'].forEach(f => {
        const el = document.getElementById(f + 'Error');
        if (el) el.textContent = '';
        const w = document.getElementById(f + 'Wrapper');
        if (w) w.classList.remove('input-error');
    });
    serverError.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    let hasErr = false;
    const uname = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!uname) {
        document.getElementById('usernameError').textContent = 'Username is required';
        document.getElementById('usernameWrapper').classList.add('input-error');
        hasErr = true;
    } else if (uname.length < 3) {
        document.getElementById('usernameError').textContent = 'Username must be at least 3 characters';
        document.getElementById('usernameWrapper').classList.add('input-error');
        hasErr = true;
    }
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
    } else if (password.length < 6) {
        document.getElementById('passwordError').textContent = 'Password must be at least 6 characters';
        document.getElementById('passwordWrapper').classList.add('input-error');
        hasErr = true;
    }
    if (hasErr) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-loading"><span class="btn-spinner"></span>Creating account...</span>';

    // SAMPLE RESPONSE
    // {
    //   "success": true,
    //   "data": {
    //       "user_id": 17,
    //       "username": "godwin",
    //       "email": "godwin@gmail.com",
    //       "token": "eyJhbGciOiJIUzM4NCJ9.eyJ1c2VyX2lkIjoxNywidXNlcm5hbWUiOiJnb2R3aW4iLCJlbWFpbCI6ImdvZHdpbkBnbWFpbC5jb20iLCJpYXQiOjE3NzQ3NTUwNTIsImV4cCI6MTc3NDg0MTQ1Mn0.tJ_a1ZHyebMw6w2d7hNDWNy23co-0MrLORA2rk90JUqxgXGe9-3vjUhpyT02wPuc"
    //   }
    // }
    
    try {
        const res = await fetch(API_BASE + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: uname,
                email,
                password
            })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Registration failed');
        const d = data.data || data;
        setCookie('zenith_token', d.token);
        setCookie('zenith_user', JSON.stringify({
            user_id: d.user_id,
            username: d.username,
            email: d.email
        }));
        window.location.href = 'dashboard.html';
    } catch (err) {
        serverErrorText.textContent = err.message || 'Registration failed. Please try again.';
        serverError.style.display = 'flex';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
});

[usernameInput, emailInput, passwordInput].forEach(inp => inp.addEventListener('input', clearErrors));