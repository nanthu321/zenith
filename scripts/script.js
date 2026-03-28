/* ============================================================
   Zenith — Global Script (Theme, Auth State, Landing Page)
   ============================================================ */

// ── API Base URL ──
const API_BASE = 'https://backend-computer.onrender.com';

// ── Theme Management ──
(function initTheme() {
  const saved = localStorage.getItem('zenith_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeToggles(saved);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('zenith_theme', next);
  updateThemeToggles(next);
}

function updateThemeToggles(theme) {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.classList.remove('theme-dark', 'theme-light');
    btn.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  });
  document.querySelectorAll('.theme-toggle-label').forEach(lbl => {
    lbl.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-toggle, #themeToggle');
  if (btn) toggleTheme();
});

// ── Cookie helpers ──
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name, value, maxAge) {
  maxAge = maxAge || 7 * 24 * 60 * 60;
  let cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + ';path=/;max-age=' + maxAge + ';SameSite=Lax';
  if (location.protocol === 'https:') cookie += ';Secure';
  document.cookie = cookie;
}

function removeCookie(name) {
  document.cookie = encodeURIComponent(name) + '=;path=/;max-age=0;SameSite=Lax';
}

function getUser() {
  try {
    const raw = getCookie('zenith_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getToken() {
  return getCookie('zenith_token');
}

function isLoggedIn() {
  return !!(getToken() && getUser());
}

// ── Auth-aware UI updates ──
function updateAuthUI() {
  const loggedIn = isLoggedIn();

  const navSignIn = document.getElementById('navSignIn');
  const navGetStarted = document.getElementById('navGetStarted');
  if (navSignIn) navSignIn.style.display = loggedIn ? 'none' : '';
  if (navGetStarted) navGetStarted.style.display = loggedIn ? 'none' : '';

  const heroCta = document.getElementById('heroCta');
  if (heroCta) {
    if (loggedIn) {
      heroCta.href = 'dashboard.html';
      heroCta.querySelector('span').textContent = 'Access Zenith';
    } else {
      heroCta.href = 'signup.html';
      heroCta.querySelector('span').textContent = 'Start for Free';
    }
  }

  const ctaBtn = document.getElementById('ctaBtn');
  if (ctaBtn) {
    if (loggedIn) {
      ctaBtn.href = 'dashboard.html';
      ctaBtn.textContent = 'Access Zenith →';
    } else {
      ctaBtn.href = 'signup.html';
      ctaBtn.textContent = 'Create Free Account';
    }
  }

  const mobileNavActions = document.getElementById('mobileNavActions');
  if (mobileNavActions && loggedIn) {
    mobileNavActions.innerHTML = '<a href="dashboard.html" class="btn btn-primary">Access Zenith</a>';
  }
}

// ── Mobile Menu ──
let mobileMenuOpen = false;
function closeMobileMenu() {
  mobileMenuOpen = false;
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();

  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      mobileMenuOpen = !mobileMenuOpen;
      const menu = document.getElementById('mobileMenu');
      if (menu) {
        if (mobileMenuOpen) { menu.classList.add('open'); document.body.style.overflow = 'hidden'; }
        else closeMobileMenu();
      }
    });
  }

  window.addEventListener('resize', () => { if (window.innerWidth > 768) closeMobileMenu(); });

  // ── Features Grid ──
  const featuresGrid = document.getElementById('featuresGrid');
  if (featuresGrid) {
    const features = [
      { icon: 'fa-solid fa-bolt', title: 'Live Code Execution', desc: 'Run Python, JavaScript, and Bash directly in the cloud. See results in real time.', color: '#f59e0b' },
      { icon: 'fa-solid fa-folder-open', title: 'Project Generation', desc: 'Ask Zenith to build complete multi-file projects. Download as ZIP instantly.', color: '#10b981' },
      { icon: 'fa-solid fa-globe', title: 'Web Intelligence', desc: 'Search the internet for live data — prices, news, stocks — and process it instantly.', color: '#3b82f6' },
      { icon: 'fa-solid fa-clock', title: 'Autonomous Scheduling', desc: "Schedule recurring tasks that run 24/7 even when you're offline. Excel reports included.", color: '#226DB4' },
      { icon: 'fa-solid fa-brain', title: 'Claude AI Powered', desc: "Backed by Anthropic's Claude — the most capable AI model for complex reasoning.", color: '#ec4899' },
      { icon: 'fa-solid fa-shield-halved', title: 'Secure & Isolated', desc: 'Every user gets a sandboxed workspace. Your data and code never cross boundaries.', color: '#06b6d4' },
    ];
    features.forEach((f, i) => {
      const card = document.createElement('div');
      card.className = 'feature-card';
      card.style.setProperty('--feature-color', f.color);
      card.style.animationDelay = `${i * 0.08}s`;
      card.innerHTML = `<div class="feature-header"><div class="feature-icon" style="color:${f.color}"><i class="${f.icon}"></i></div><h3 class="feature-title">${f.title}</h3></div><p class="feature-desc">${f.desc}</p>`;
      featuresGrid.appendChild(card);
    });
  }

  // ── Particle Canvas ──
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const COLORS = [{ r:228,g:37,b:29 },{ r:249,g:178,b:28 },{ r:10,g:153,b:73 },{ r:34,g:109,b:180 }];
    let particles = [];
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function createParticles() {
      const w = window.innerWidth, h = window.innerHeight;
      const count = Math.min(Math.floor((w * h) / 25000), 80);
      particles = [];
      for (let i = 0; i < count; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        particles.push({ x: Math.random()*w, y: Math.random()*h, size: 1+Math.random()*2, speedY: -(0.15+Math.random()*0.35), speedX: (Math.random()-0.5)*0.3, opacity: 0.15+Math.random()*0.35, pulse: Math.random()*Math.PI*2, pulseSpeed: 0.005+Math.random()*0.015, color });
      }
    }
    function animate() {
      const w = window.innerWidth, h = window.innerHeight;
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.speedX; p.y += p.speedY; p.pulse += p.pulseSpeed;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        const alpha = (dark ? p.opacity : p.opacity * 0.9) * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`; ctx.fill();
      }
      requestAnimationFrame(animate);
    }
    resize(); createParticles(); requestAnimationFrame(animate);
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); createParticles(); }, 150); }, { passive: true });
  }

  // ── Parallax hero ──
  const hero = document.getElementById('hero');
  if (hero) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX - window.innerWidth / 2) / window.innerWidth * 20;
      const y = (e.clientY - window.innerHeight / 2) / window.innerHeight * 20;
      hero.style.setProperty('--hero-x', x + 'px');
      hero.style.setProperty('--hero-y', y + 'px');
    });
  }

  // ── Redirect logged-in users from auth pages ──
  const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('signup');
  if (isAuthPage && isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
});
