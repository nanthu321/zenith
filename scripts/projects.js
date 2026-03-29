/* ══════════════════════════════════════════════════════════════
   Zenith Project Explorer — Vanilla JS
   Full FileViewer preview with syntax highlighting + Live Preview.
   All external CSS/JS are inlined automatically for preview.
   ══════════════════════════════════════════════════════════════ */

/* ── Auth guard (soft — don't block if testing locally) ── */
(function () {
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    console.warn('[explorer] Not logged in — will try mock data');
  }
})();

/* ═══ Constants ═══ */
var API_ROOT = (typeof API_BASE !== 'undefined' ? API_BASE : '');
var WS_BASE = API_ROOT + '/api/workspace';
var PROJ_BASE = API_ROOT + '/api/projects';
var _useFallback = false;
var _useMockData = false;

/* ═══ Mock Data (for when API is unreachable) ═══ */
var MOCK_PROJECTS = ['zenith-demo'];
var MOCK_FILES = {
  '': [
    { name: 'src', path: 'src', type: 'directory' },
    { name: 'public', path: 'public', type: 'directory' },
    { name: 'package.json', path: 'package.json', type: 'file' },
    { name: 'README.md', path: 'README.md', type: 'file' },
    { name: '.gitignore', path: '.gitignore', type: 'file' },
    { name: 'index.html', path: 'index.html', type: 'file' }
  ],
  'src': [
    { name: 'components', path: 'src/components', type: 'directory' },
    { name: 'utils', path: 'src/utils', type: 'directory' },
    { name: 'App.jsx', path: 'src/App.jsx', type: 'file' },
    { name: 'main.js', path: 'src/main.js', type: 'file' },
    { name: 'styles.css', path: 'src/styles.css', type: 'file' }
  ],
  'src/components': [
    { name: 'Header.jsx', path: 'src/components/Header.jsx', type: 'file' },
    { name: 'Footer.jsx', path: 'src/components/Footer.jsx', type: 'file' },
    { name: 'Button.jsx', path: 'src/components/Button.jsx', type: 'file' }
  ],
  'src/utils': [
    { name: 'helpers.js', path: 'src/utils/helpers.js', type: 'file' },
    { name: 'api.js', path: 'src/utils/api.js', type: 'file' }
  ],
  'public': [
    { name: 'favicon.ico', path: 'public/favicon.ico', type: 'file' },
    { name: 'logo.png', path: 'public/logo.png', type: 'file' }
  ]
};

/* ═══════════════════════════════════════════════════════════
   ★ MOCK FILE CONTENTS — the index.html uses EXTERNAL CSS & JS
     to demonstrate the inlining feature properly.
   ═══════════════════════════════════════════════════════════ */
var MOCK_CONTENTS = {};

/* Build mock contents — using array join to avoid any parsing issues */
MOCK_CONTENTS['package.json'] = [
  '{',
  '  "name": "zenith-demo",',
  '  "version": "1.0.0",',
  '  "private": true,',
  '  "scripts": {',
  '    "dev": "vite",',
  '    "build": "vite build",',
  '    "preview": "vite preview"',
  '  },',
  '  "dependencies": {',
  '    "react": "^18.2.0",',
  '    "react-dom": "^18.2.0"',
  '  },',
  '  "devDependencies": {',
  '    "vite": "^5.0.0",',
  '    "@vitejs/plugin-react": "^4.0.0"',
  '  }',
  '}'
].join('\n');

MOCK_CONTENTS['README.md'] = [
  '# Zenith Demo Project',
  '',
  'This is a demo project created by **Zenith AI**.',
  '',
  '## Getting Started',
  '',
  '```bash',
  'npm install',
  'npm run dev',
  '```',
  '',
  '## Features',
  '',
  '- \u26A1 Fast development with Vite',
  '- \u269B\uFE0F React 18 with JSX',
  '- \uD83C\uDFA8 Modern CSS styling',
  '- \uD83D\uDCE6 Optimized production builds',
  '',
  '## Project Structure',
  '',
  '```',
  'src/',
  '  \u251C\u2500\u2500 components/',
  '  \u2502   \u251C\u2500\u2500 Header.jsx',
  '  \u2502   \u251C\u2500\u2500 Footer.jsx',
  '  \u2502   \u2514\u2500\u2500 Button.jsx',
  '  \u251C\u2500\u2500 utils/',
  '  \u2502   \u251C\u2500\u2500 helpers.js',
  '  \u2502   \u2514\u2500\u2500 api.js',
  '  \u251C\u2500\u2500 App.jsx',
  '  \u251C\u2500\u2500 main.js',
  '  \u2514\u2500\u2500 styles.css',
  '```',
  '',
  '## License',
  '',
  'MIT'
].join('\n');

MOCK_CONTENTS['.gitignore'] = [
  'node_modules/',
  'dist/',
  '.env',
  '.env.local',
  '*.log',
  '.DS_Store'
].join('\n');

/* ★ index.html — references EXTERNAL CSS and JS files from the project.
     Note: we use a <scr"+"ipt> split to avoid the browser prematurely
     closing the host <script> tag that loads this JS file. */
MOCK_CONTENTS['index.html'] = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '  <title>Zenith Demo</title>',
  '  <link rel="stylesheet" href="src/styles.css">',
  '</head>',
  '<body>',
  '  <div class="app">',
  '    <header class="site-header">',
  '      <span class="logo">\u26A1 Zenith Demo</span>',
  '      <nav class="nav-links">',
  '        <a href="#" class="nav-link active">Home</a>',
  '        <a href="#" class="nav-link">About</a>',
  '        <a href="#" class="nav-link">Contact</a>',
  '      </nav>',
  '    </header>',
  '',
  '    <main class="main">',
  '      <h1>Welcome to Zenith</h1>',
  '      <p class="subtitle">A sample project built with Zenith AI</p>',
  '',
  '      <div class="counter-section">',
  '        <button class="btn btn-minus" onclick="updateCount(-1)">\u2212</button>',
  '        <span class="count" id="count">0</span>',
  '        <button class="btn btn-plus" onclick="updateCount(1)">+</button>',
  '      </div>',
  '',
  '      <div class="features">',
  '        <div class="card">',
  '          <div class="card-icon">\uD83D\uDE80</div>',
  '          <h3>Fast</h3>',
  '          <p>Instant builds with Vite</p>',
  '        </div>',
  '        <div class="card">',
  '          <div class="card-icon">\uD83C\uDFA8</div>',
  '          <h3>Styled</h3>',
  '          <p>Modern CSS gradients</p>',
  '        </div>',
  '        <div class="card">',
  '          <div class="card-icon">\uD83D\uDCE6</div>',
  '          <h3>Modular</h3>',
  '          <p>Component architecture</p>',
  '        </div>',
  '        <div class="card">',
  '          <div class="card-icon">\uD83E\uDD16</div>',
  '          <h3>AI Built</h3>',
  '          <p>Created by Zenith AI</p>',
  '        </div>',
  '      </div>',
  '',
  '      <div class="todo-section">',
  '        <h2>Todo List</h2>',
  '        <div class="todo-input-row">',
  '          <input type="text" id="todoInput" class="todo-input" placeholder="Add a task...">',
  '          <button class="btn btn-add" onclick="addTodo()">Add</button>',
  '        </div>',
  '        <ul class="todo-list" id="todoList"></ul>',
  '      </div>',
  '    </main>',
  '',
  '    <footer class="site-footer">',
  '      Built with \u2764\uFE0F by Zenith AI &middot; <span id="year"></span>',
  '    </footer>',
  '  </div>',
  '',
  '  <scr' + 'ipt src="src/main.js"></scr' + 'ipt>',
  '</body>',
  '</html>'
].join('\n');

/* ★ src/styles.css — the EXTERNAL stylesheet that index.html links to */
MOCK_CONTENTS['src/styles.css'] = [
  '/* \u2550\u2550\u2550 Zenith Demo Styles \u2550\u2550\u2550 */',
  '',
  ':root {',
  '  --primary: #226DB4;',
  '  --accent: #F9B21C;',
  '  --bg: #080c14;',
  '  --bg-surface: #0b1320;',
  '  --text: #cdd8e4;',
  '  --text-muted: #5a8aac;',
  '  --border: rgba(34,109,180,0.15);',
  '  --card-bg: rgba(34,109,180,0.05);',
  '  --radius: 12px;',
  '}',
  '',
  '* { margin: 0; padding: 0; box-sizing: border-box; }',
  '',
  'body {',
  '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
  '  background: linear-gradient(135deg, var(--bg) 0%, #1a1a2e 50%, var(--bg) 100%);',
  '  color: var(--text);',
  '  min-height: 100vh;',
  '}',
  '',
  '.app {',
  '  display: flex;',
  '  flex-direction: column;',
  '  min-height: 100vh;',
  '}',
  '',
  '/* Header */',
  '.site-header {',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: space-between;',
  '  padding: 16px 32px;',
  '  border-bottom: 1px solid var(--border);',
  '  background: rgba(11,19,32,0.8);',
  '  backdrop-filter: blur(12px);',
  '}',
  '',
  '.logo {',
  '  font-size: 18px;',
  '  font-weight: 700;',
  '  background: linear-gradient(135deg, var(--primary), var(--accent));',
  '  -webkit-background-clip: text;',
  '  -webkit-text-fill-color: transparent;',
  '}',
  '',
  '.nav-links { display: flex; gap: 8px; }',
  '',
  '.nav-link {',
  '  padding: 6px 16px;',
  '  border-radius: 8px;',
  '  color: var(--text-muted);',
  '  text-decoration: none;',
  '  font-size: 14px;',
  '  transition: all 0.2s;',
  '}',
  '.nav-link:hover { background: rgba(34,109,180,0.1); color: #fff; }',
  '.nav-link.active { background: rgba(34,109,180,0.15); color: #fff; }',
  '',
  '/* Main */',
  '.main {',
  '  flex: 1;',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: center;',
  '  padding: 48px 24px;',
  '  gap: 32px;',
  '}',
  '',
  'h1 {',
  '  font-size: 2.8rem;',
  '  background: linear-gradient(135deg, var(--primary), var(--accent));',
  '  -webkit-background-clip: text;',
  '  -webkit-text-fill-color: transparent;',
  '}',
  '',
  '.subtitle { color: var(--text-muted); font-size: 1.1rem; }',
  '',
  '/* Counter */',
  '.counter-section {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 16px;',
  '  padding: 16px 32px;',
  '  border: 1px solid var(--border);',
  '  border-radius: var(--radius);',
  '  background: var(--card-bg);',
  '}',
  '',
  '.count {',
  '  font-size: 2.5rem;',
  '  font-weight: 700;',
  '  color: var(--accent);',
  '  min-width: 80px;',
  '  text-align: center;',
  '}',
  '',
  '/* Buttons */',
  '.btn {',
  '  padding: 10px 24px;',
  '  border: 1px solid rgba(34,109,180,0.3);',
  '  border-radius: 8px;',
  '  background: rgba(34,109,180,0.12);',
  '  color: var(--text-muted);',
  '  font-size: 14px;',
  '  font-weight: 600;',
  '  cursor: pointer;',
  '  transition: all 0.2s;',
  '}',
  '.btn:hover {',
  '  background: rgba(34,109,180,0.25);',
  '  color: #fff;',
  '  transform: translateY(-1px);',
  '  box-shadow: 0 4px 16px rgba(34,109,180,0.15);',
  '}',
  '.btn-plus { border-color: rgba(10,153,73,0.3); background: rgba(10,153,73,0.12); color: #0A9949; }',
  '.btn-plus:hover { background: rgba(10,153,73,0.25); color: #22c55e; }',
  '.btn-minus { border-color: rgba(228,37,39,0.3); background: rgba(228,37,39,0.12); color: #E42527; }',
  '.btn-minus:hover { background: rgba(228,37,39,0.25); color: #ef4444; }',
  '.btn-add { border-color: rgba(249,178,28,0.3); background: rgba(249,178,28,0.12); color: var(--accent); }',
  '.btn-add:hover { background: rgba(249,178,28,0.25); color: #fbbf24; }',
  '',
  '/* Feature Cards */',
  '.features {',
  '  display: flex;',
  '  gap: 20px;',
  '  flex-wrap: wrap;',
  '  justify-content: center;',
  '}',
  '',
  '.card {',
  '  padding: 24px 20px;',
  '  border: 1px solid var(--border);',
  '  border-radius: var(--radius);',
  '  background: var(--card-bg);',
  '  width: 180px;',
  '  text-align: center;',
  '  transition: all 0.3s;',
  '}',
  '.card:hover {',
  '  border-color: rgba(34,109,180,0.35);',
  '  background: rgba(34,109,180,0.10);',
  '  transform: translateY(-4px);',
  '  box-shadow: 0 8px 32px rgba(34,109,180,0.08);',
  '}',
  '.card-icon { font-size: 28px; margin-bottom: 12px; }',
  '.card h3 { color: var(--accent); font-size: 15px; margin-bottom: 6px; }',
  '.card p { color: var(--text-muted); font-size: 12px; margin: 0; }',
  '',
  '/* Todo Section */',
  '.todo-section {',
  '  width: 100%;',
  '  max-width: 500px;',
  '  padding: 24px;',
  '  border: 1px solid var(--border);',
  '  border-radius: var(--radius);',
  '  background: var(--card-bg);',
  '}',
  '.todo-section h2 {',
  '  font-size: 18px;',
  '  color: var(--accent);',
  '  margin-bottom: 16px;',
  '}',
  '.todo-input-row {',
  '  display: flex;',
  '  gap: 8px;',
  '  margin-bottom: 16px;',
  '}',
  '.todo-input {',
  '  flex: 1;',
  '  padding: 10px 14px;',
  '  border: 1px solid var(--border);',
  '  border-radius: 8px;',
  '  background: rgba(34,109,180,0.06);',
  '  color: var(--text);',
  '  font-size: 14px;',
  '  font-family: inherit;',
  '  outline: none;',
  '  transition: border-color 0.2s;',
  '}',
  '.todo-input:focus { border-color: var(--primary); }',
  '.todo-input::placeholder { color: #3a5570; }',
  '.todo-list {',
  '  list-style: none;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 6px;',
  '}',
  '.todo-item {',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 10px;',
  '  padding: 10px 14px;',
  '  border: 1px solid var(--border);',
  '  border-radius: 8px;',
  '  background: rgba(34,109,180,0.04);',
  '  transition: all 0.2s;',
  '}',
  '.todo-item:hover { background: rgba(34,109,180,0.08); }',
  '.todo-item.done .todo-text { text-decoration: line-through; opacity: 0.5; }',
  '.todo-check {',
  '  width: 18px; height: 18px;',
  '  border: 2px solid var(--border);',
  '  border-radius: 4px;',
  '  cursor: pointer;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  transition: all 0.2s;',
  '  flex-shrink: 0;',
  '}',
  '.todo-check:hover { border-color: var(--primary); }',
  '.todo-check.checked { background: var(--primary); border-color: var(--primary); }',
  '.todo-check.checked::after { content: "\u2713"; color: #fff; font-size: 12px; font-weight: 700; }',
  '.todo-text { flex: 1; font-size: 14px; }',
  '.todo-delete {',
  '  background: none; border: none; color: #555; cursor: pointer;',
  '  font-size: 16px; padding: 2px 6px; border-radius: 4px; transition: all 0.2s;',
  '}',
  '.todo-delete:hover { background: rgba(228,37,39,0.1); color: #ef4444; }',
  '',
  '/* Footer */',
  '.site-footer {',
  '  padding: 16px 32px;',
  '  border-top: 1px solid var(--border);',
  '  text-align: center;',
  '  font-size: 13px;',
  '  color: #3a5570;',
  '}'
].join('\n');

/* ★ src/main.js — the EXTERNAL JavaScript that index.html links to */
MOCK_CONTENTS['src/main.js'] = [
  '/* \u2550\u2550\u2550 Zenith Demo - Main JavaScript \u2550\u2550\u2550 */',
  '',
  '/* Counter */',
  'var count = 0;',
  'function updateCount(delta) {',
  '  count += delta;',
  '  document.getElementById("count").textContent = count;',
  '  var el = document.getElementById("count");',
  '  el.style.transform = "scale(1.2)";',
  '  setTimeout(function() { el.style.transform = "scale(1)"; }, 150);',
  '}',
  '',
  '/* Todo List */',
  'var todos = [];',
  'var nextId = 1;',
  '',
  'function addTodo() {',
  '  var input = document.getElementById("todoInput");',
  '  var text = input.value.trim();',
  '  if (!text) return;',
  '  todos.push({ id: nextId++, text: text, done: false });',
  '  input.value = "";',
  '  renderTodos();',
  '}',
  '',
  '/* Allow Enter key to add todo */',
  'document.addEventListener("DOMContentLoaded", function() {',
  '  var input = document.getElementById("todoInput");',
  '  if (input) {',
  '    input.addEventListener("keydown", function(e) {',
  '      if (e.key === "Enter") addTodo();',
  '    });',
  '  }',
  '  var yearEl = document.getElementById("year");',
  '  if (yearEl) yearEl.textContent = new Date().getFullYear();',
  '  console.log("Zenith Demo app started!");',
  '  console.log("Features: Counter + Todo List");',
  '});',
  '',
  'function toggleTodo(id) {',
  '  var t = todos.find(function(t) { return t.id === id; });',
  '  if (t) t.done = !t.done;',
  '  renderTodos();',
  '}',
  '',
  'function deleteTodo(id) {',
  '  todos = todos.filter(function(t) { return t.id !== id; });',
  '  renderTodos();',
  '}',
  '',
  'function renderTodos() {',
  '  var list = document.getElementById("todoList");',
  '  if (!list) return;',
  '  list.innerHTML = todos.map(function(t) {',
  '    return \'<li class="todo-item\' + (t.done ? \' done\' : \'\') + \'">\'',
  '      + \'<div class="todo-check\' + (t.done ? \' checked\' : \'\') + \'" onclick="toggleTodo(\' + t.id + \')"></div>\'',
  '      + \'<span class="todo-text">\' + escapeHtml(t.text) + \'</span>\'',
  '      + \'<button class="todo-delete" onclick="deleteTodo(\' + t.id + \')" title="Delete">\u00D7</button>\'',
  '      + \'</li>\';',
  '  }).join("");',
  '}',
  '',
  'function escapeHtml(str) {',
  '  var d = document.createElement("div");',
  '  d.textContent = str;',
  '  return d.innerHTML;',
  '}'
].join('\n');

MOCK_CONTENTS['src/App.jsx'] = [
  'import { useState } from "react";',
  'import Header from "./components/Header";',
  'import Footer from "./components/Footer";',
  'import Button from "./components/Button";',
  'import "./styles.css";',
  '',
  'export default function App() {',
  '  const [count, setCount] = useState(0);',
  '',
  '  return (',
  '    <div className="app">',
  '      <Header title="Zenith Demo" />',
  '      <main className="main">',
  '        <h1>Welcome to Zenith</h1>',
  '        <p>Count: {count}</p>',
  '        <Button',
  '          label={`Clicked ${count} times`}',
  '          onClick={() => setCount(c => c + 1)}',
  '        />',
  '      </main>',
  '      <Footer />',
  '    </div>',
  '  );',
  '}'
].join('\n');

MOCK_CONTENTS['src/components/Header.jsx'] = [
  'export default function Header({ title }) {',
  '  return (',
  '    <header style={{',
  '      padding: "16px 24px",',
  '      borderBottom: "1px solid rgba(34, 109, 180, 0.15)",',
  '      display: "flex",',
  '      alignItems: "center",',
  '      gap: 12,',
  '    }}>',
  '      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">',
  '        <circle cx="12" cy="12" r="10" stroke="#226DB4" strokeWidth="2"/>',
  '        <path d="M8 12l3 3 5-6" stroke="#0A9949" strokeWidth="2" strokeLinecap="round"/>',
  '      </svg>',
  '      <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>',
  '    </header>',
  '  );',
  '}'
].join('\n');

MOCK_CONTENTS['src/components/Footer.jsx'] = [
  'export default function Footer() {',
  '  return (',
  '    <footer style={{',
  '      padding: "16px 24px",',
  '      borderTop: "1px solid rgba(34, 109, 180, 0.1)",',
  '      textAlign: "center",',
  '      fontSize: 12,',
  '      color: "#4a6d88",',
  '    }}>',
  '      Built with Zenith AI &middot; {new Date().getFullYear()}',
  '    </footer>',
  '  );',
  '}'
].join('\n');

MOCK_CONTENTS['src/components/Button.jsx'] = [
  'import { useState } from "react";',
  '',
  'export default function Button({ label, onClick }) {',
  '  const [hover, setHover] = useState(false);',
  '',
  '  const style = {',
  '    padding: "12px 28px",',
  '    fontSize: 14,',
  '    fontWeight: 600,',
  '    border: "1px solid rgba(34, 109, 180, 0.3)",',
  '    borderRadius: 8,',
  '    background: hover',
  '      ? "rgba(34, 109, 180, 0.2)"',
  '      : "rgba(34, 109, 180, 0.08)",',
  '    color: "#8ab4d9",',
  '    cursor: "pointer",',
  '    transition: "all 0.2s ease",',
  '    transform: hover ? "translateY(-1px)" : "none",',
  '  };',
  '',
  '  return (',
  '    <button',
  '      style={style}',
  '      onClick={onClick}',
  '      onMouseEnter={() => setHover(true)}',
  '      onMouseLeave={() => setHover(false)}',
  '    >',
  '      {label}',
  '    </button>',
  '  );',
  '}'
].join('\n');

MOCK_CONTENTS['src/utils/helpers.js'] = [
  '/**',
  ' * Format a number with commas',
  ' * @param {number} num',
  ' * @returns {string}',
  ' */',
  'export function formatNumber(num) {',
  '  return num.toLocaleString("en-US");',
  '}',
  '',
  '/**',
  ' * Debounce a function call',
  ' * @param {Function} fn',
  ' * @param {number} delay',
  ' * @returns {Function}',
  ' */',
  'export function debounce(fn, delay) {',
  '  delay = delay || 300;',
  '  var timer;',
  '  return function () {',
  '    var args = arguments, self = this;',
  '    clearTimeout(timer);',
  '    timer = setTimeout(function() { fn.apply(self, args); }, delay);',
  '  };',
  '}',
  '',
  '/**',
  ' * Generate a random ID',
  ' * @param {number} length',
  ' * @returns {string}',
  ' */',
  'export function randomId(length) {',
  '  length = length || 8;',
  '  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";',
  '  var result = "";',
  '  for (var i = 0; i < length; i++) {',
  '    result += chars.charAt(Math.floor(Math.random() * chars.length));',
  '  }',
  '  return result;',
  '}'
].join('\n');

MOCK_CONTENTS['src/utils/api.js'] = [
  'var BASE_URL = "/api";',
  '',
  '/**',
  ' * Make an authenticated API request',
  ' */',
  'async function apiFetch(path, options) {',
  '  options = options || {};',
  '  var token = localStorage.getItem("token");',
  '  var headers = Object.assign({',
  '    "Content-Type": "application/json"',
  '  }, token ? { Authorization: "Bearer " + token } : {}, options.headers || {});',
  '',
  '  var response = await fetch(BASE_URL + path, Object.assign({}, options, { headers: headers }));',
  '',
  '  if (!response.ok) {',
  '    var error = {};',
  '    try { error = await response.json(); } catch(e) {}',
  '    throw new Error(error.message || ("HTTP " + response.status));',
  '  }',
  '',
  '  return response.json();',
  '}',
  '',
  'var api = {',
  '  get: function(path) { return apiFetch(path); },',
  '  post: function(path, body) { return apiFetch(path, { method: "POST", body: JSON.stringify(body) }); },',
  '  put: function(path, body) { return apiFetch(path, { method: "PUT", body: JSON.stringify(body) }); },',
  '  del: function(path) { return apiFetch(path, { method: "DELETE" }); }',
  '};'
].join('\n');


/* ═══ API helpers ═══ */
function apiHeaders() {
  var h = { 'Content-Type': 'application/json' };
  if (typeof getToken === 'function') {
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
  }
  if (typeof getUser === 'function') {
    var u = getUser();
    if (u && u.user_id) h['X-User-Id'] = String(u.user_id);
    else if (u && u.id) h['X-User-Id'] = String(u.id);
  }
  return h;
}

async function apiRequest(baseUrl, path) {
  var res = await fetch(baseUrl + path, { method: 'GET', headers: apiHeaders() });
  if (res.status === 401) throw new Error('Unauthorized');
  if (res.status === 204) return null;
  var ct = (res.headers.get('content-type') || '');
  if (!ct.includes('application/json')) {
    var txt = await res.text();
    if (res.ok) return txt || null;
    throw new Error(txt.substring(0, 200) || ('HTTP ' + res.status));
  }
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || ('HTTP ' + res.status));
  if (data.success !== undefined && data.data !== undefined) return data.data;
  if (data.success === false) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

/* ═══ Normalize helpers ═══ */
function normalizeProjects(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.projects) return data.projects;
  if (data.data) return data.data;
  return [];
}

function normalizeFiles(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.entries) return data.entries;
  if (data.files) return data.files;
  if (data.children) return data.children;
  return [];
}

function sortEntries(entries) {
  return entries.slice().sort(function (a, b) {
    var ad = a.type === 'directory' || a.type === 'dir' || a.is_directory;
    var bd = b.type === 'directory' || b.type === 'dir' || b.is_directory;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/* ═══ API: List projects ═══ */
async function listProjects() {
  if (_useMockData) return MOCK_PROJECTS.slice();
  if (!_useFallback) {
    try {
      var data = await apiRequest(WS_BASE, '/projects');
      var list = normalizeProjects(data);
      return list.map(function (p) { return typeof p === 'string' ? p : (p.name || p.project_name || ''); }).filter(Boolean);
    } catch (e) {
      console.warn('[ws] /api/workspace/projects failed:', e.message);
      _useFallback = true;
    }
  }
  try {
    var data2 = await apiRequest(PROJ_BASE, '');
    var list2 = normalizeProjects(data2);
    return list2.map(function (p) { return typeof p === 'string' ? p : (p.name || p.project_name || ''); }).filter(Boolean);
  } catch (e2) {
    console.warn('[api] /api/projects also failed:', e2.message, '— using mock data');
    _useMockData = true;
    return MOCK_PROJECTS.slice();
  }
}

/* ═══ API: List files in a folder ═══ */
async function listFiles(project, path) {
  path = path || '';
  if (_useMockData) {
    var mockEntries = MOCK_FILES[path] || [];
    return mockEntries.slice();
  }
  try {
    var data = await apiRequest(WS_BASE, '/projects/' + encodeURIComponent(project) + '/files?path=' + encodeURIComponent(path) + '&recursive=false');
    return normalizeFiles(data);
  } catch (e) {
    try {
      var data2 = await apiRequest(PROJ_BASE, '/' + encodeURIComponent(project) + '/files?path=' + encodeURIComponent(path) + '&recursive=false');
      return normalizeFiles(data2);
    } catch (e2) {
      console.warn('[api] listFiles failed:', e2.message, '— mock fallback');
      _useMockData = true;
      return (MOCK_FILES[path] || []).slice();
    }
  }
}

/* ═══ API: Read file content ═══ */
async function readFile(project, path) {
  if (_useMockData) {
    var content = MOCK_CONTENTS[path];
    if (content !== undefined) return content;
    return '// File: ' + path + '\n// Content not available in demo mode\n';
  }
  try {
    return await apiRequest(WS_BASE, '/projects/' + encodeURIComponent(project) + '/file?path=' + encodeURIComponent(path));
  } catch (e) {
    try {
      return await apiRequest(PROJ_BASE, '/' + encodeURIComponent(project) + '/file?path=' + encodeURIComponent(path));
    } catch (e2) {
      try {
        return await apiRequest(PROJ_BASE, '/' + encodeURIComponent(project) + '/files/' + encodeURIComponent(path));
      } catch (e3) {
        console.warn('[api] readFile failed:', e3.message, '— mock fallback');
        _useMockData = true;
        var mc = MOCK_CONTENTS[path];
        if (mc !== undefined) return mc;
        return '// File: ' + path + '\n// Content not available in demo mode\n';
      }
    }
  }
}

/* ═══ File Icon Helpers ═══ */
var ICON_MAP = {
  js:{c:'#f5de19',l:'JS',bg:1}, mjs:{c:'#f5de19',l:'JS',bg:1},
  jsx:{c:'#61dafb',l:'JSX',r:1}, tsx:{c:'#3178c6',l:'TSX',r:1},
  ts:{c:'#3178c6',l:'TS',bg:1}, py:{c:'#3572A5',l:'PY',bg:1},
  html:{c:'#e44d26',l:'H',bg:1}, htm:{c:'#e44d26',l:'H',bg:1},
  css:{c:'#264de4',l:'{}',bg:1}, scss:{c:'#cd6799',l:'S',bg:1},
  json:{c:'#f5de19',l:'{}'}, md:{c:'#519aba',l:'MD'},
  yaml:{c:'#cb171e',l:'YML'}, yml:{c:'#cb171e',l:'YML'},
  sql:{c:'#e38c00',l:'SQL'}, sh:{c:'#4ec9b0',l:'>_',bg:1},
  bash:{c:'#4ec9b0',l:'>_',bg:1}, java:{c:'#e76f00',l:'J',bg:1},
  c:{c:'#555',l:'C'}, cpp:{c:'#f34b7d',l:'C++'},
  rs:{c:'#dea584',l:'R'}, go:{c:'#00add8',l:'Go'},
  rb:{c:'#cc342d',l:'Rb'}, php:{c:'#4f5b93',l:'PHP'},
  swift:{c:'#fa7343',l:'Sw'}, kt:{c:'#7f52ff',l:'Kt'},
  txt:{c:'#a8b9cc',l:'TXT'}, env:{c:'#ecd53f',l:'ENV'},
  toml:{c:'#9c4221',l:'TML'}, svg:{c:'#ffb13b',l:'SVG'},
  pdf:{c:'#ec1c24',l:'PDF'}, zip:{c:'#e6a817',l:'ZIP'},
  lock:{c:'#a8b9cc',l:'LCK'}, csv:{c:'#107c41',l:'CSV'},
  ico:{c:'#a8b9cc',l:'ICO'}, png:{c:'#a8b9cc',l:'IMG'},
  jpg:{c:'#a8b9cc',l:'IMG'}, gif:{c:'#a8b9cc',l:'IMG'},
  xml:{c:'#e44d26',l:'</>'}
};
var FOLDER_COLORS = {
  src:'#42a5f5',components:'#42a5f5',pages:'#42a5f5',
  lib:'#ab47bc',utils:'#ab47bc',hooks:'#ab47bc',helpers:'#ab47bc',
  public:'#66bb6a',assets:'#66bb6a',images:'#66bb6a',static:'#66bb6a',
  styles:'#ec407a',css:'#ec407a',config:'#ffa726',node_modules:'#7cb342',
  dist:'#78909c',build:'#78909c',test:'#ef5350',tests:'#ef5350',
  api:'#26c6da',services:'#26c6da',context:'#ff7043',store:'#ff7043',
  routes:'#26a69a',models:'#ffa726',types:'#3178c6',docs:'#42a5f5',
  scripts:'#8bc34a',icons:'#66bb6a'
};

function fileIcon(name) {
  var n = (name || '').toLowerCase();
  var ext = n.split('.').pop();
  if (n === 'dockerfile' || n === 'docker-compose.yml')
    return '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#2496ed" opacity="0.2"/><text x="8" y="11" text-anchor="middle" font-size="6" font-weight="bold" fill="#2496ed">DKR</text></svg>';
  if (n === '.gitignore' || n === '.gitattributes')
    return '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#e64a19" opacity="0.2"/><text x="8" y="11" text-anchor="middle" font-size="6" font-weight="bold" fill="#e64a19">GIT</text></svg>';
  if (n === 'package.json' || n === 'package-lock.json')
    return '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb3837" opacity="0.2"/><text x="8" y="11" text-anchor="middle" font-size="6" font-weight="bold" fill="#cb3837">NPM</text></svg>';
  var info = ICON_MAP[ext];
  if (!info) return '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="#a8b9cc" stroke-width="1.2" fill="none"/><path d="M9 1v4h4" stroke="#a8b9cc" stroke-width="1.2" fill="none"/></svg>';
  if (info.r) return '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="1.8" fill="'+info.c+'"/><ellipse cx="8" cy="8" rx="7" ry="2.8" stroke="'+info.c+'" stroke-width="0.8" fill="none"/><ellipse cx="8" cy="8" rx="7" ry="2.8" stroke="'+info.c+'" stroke-width="0.8" fill="none" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="7" ry="2.8" stroke="'+info.c+'" stroke-width="0.8" fill="none" transform="rotate(120 8 8)"/></svg>';
  var fs = info.l.length > 2 ? '6' : '8';
  if (info.bg) return '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="'+info.c+'" opacity="0.2"/><text x="8" y="12" text-anchor="middle" font-size="'+fs+'" font-weight="bold" fill="'+info.c+'">'+info.l+'</text></svg>';
  return '<svg width="16" height="16" viewBox="0 0 16 16"><text x="8" y="12" text-anchor="middle" font-family="monospace" font-size="'+fs+'" font-weight="bold" fill="'+info.c+'">'+info.l+'</text></svg>';
}

function folderIcon(name, open) {
  var clr = FOLDER_COLORS[(name || '').toLowerCase()] || '#90a4ae';
  if (open) return '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v1H2V6z" fill="'+clr+'" opacity="0.9"/><path d="M2 9h20v9c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9z" fill="'+clr+'" opacity="0.65"/></svg>';
  return '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 4h5l2 2h9c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="'+clr+'" opacity="0.85"/></svg>';
}

function chevronSvg(open) {
  if (open) return '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 3l4 3-4 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" transform="rotate(90 6 6)"/></svg>';
  return '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 3l4 3-4 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function spinnerSvg() {
  return '<svg width="14" height="14" viewBox="0 0 16 16" style="animation:vsc-spin 0.7s linear infinite"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round" opacity="0.5"/></svg>';
}

function esc(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

/* ═══ Binary detection ═══ */
var BINARY_EXTS = ['png','jpg','jpeg','gif','webp','bmp','ico','zip','tar','gz','rar','7z','pdf','doc','docx','xls','xlsx','mp3','mp4','wav','avi','mov','exe','dll','so','wasm','pyc','class','o'];
function isBinary(name) { return BINARY_EXTS.indexOf((name || '').split('.').pop().toLowerCase()) >= 0; }

/* ═══ Language detection ═══ */
var LANG_MAP = {
  js:'javascript',jsx:'javascript',mjs:'javascript',cjs:'javascript',
  ts:'typescript',tsx:'typescript',py:'python',
  html:'markup',htm:'markup',css:'css',scss:'scss',
  json:'json',md:'markdown',xml:'markup',svg:'markup',
  yaml:'yaml',yml:'yaml',sql:'sql',sh:'bash',bash:'bash',
  java:'java',c:'c',h:'c',cpp:'cpp',rs:'rust',go:'go',
  rb:'ruby',php:'php',swift:'swift',kt:'kotlin',toml:'toml',
  dockerfile:'docker',txt:'none',env:'none',lock:'json',gitignore:'none'
};
var LANG_LABEL = {
  javascript:'JavaScript',typescript:'TypeScript',python:'Python',
  markup:'HTML',css:'CSS',scss:'SCSS',json:'JSON',markdown:'Markdown',
  yaml:'YAML',sql:'SQL',bash:'Shell',java:'Java',c:'C',cpp:'C++',
  rust:'Rust',go:'Go',ruby:'Ruby',php:'PHP',swift:'Swift',
  kotlin:'Kotlin',toml:'TOML',docker:'Dockerfile',none:'Plain Text'
};
function getLang(name) {
  var n = (name || '').toLowerCase();
  if (n === 'dockerfile') return 'docker';
  if (n === 'makefile') return 'none';
  return LANG_MAP[n.split('.').pop()] || 'none';
}
function getLangLabel(name) { return LANG_LABEL[getLang(name)] || 'Plain Text'; }

/* ═══ Preview-eligible file detection ═══ */
var PREVIEWABLE_EXTS = ['html', 'htm', 'svg'];
function isPreviewable(name) {
  var ext = (name || '').split('.').pop().toLowerCase();
  return PREVIEWABLE_EXTS.indexOf(ext) >= 0;
}
var CSS_EXTS = ['css', 'scss'];
var JS_EXTS = ['js', 'mjs', 'jsx', 'ts', 'tsx'];
function canPreviewWithShell(name) {
  var ext = (name || '').split('.').pop().toLowerCase();
  return CSS_EXTS.indexOf(ext) >= 0 || JS_EXTS.indexOf(ext) >= 0;
}

/* ══════════════════════════════════════════════════════════════════
   ★★★ KEY: Resolve & inline external CSS/JS into preview HTML
   ══════════════════════════════════════════════════════════════════ */

/**
 * Resolve a file reference relative to the HTML file's path,
 * then look it up in mock data or via API.
 */
async function resolveProjectFile(project, refPath, basePath) {
  /* Skip CDN / external URLs */
  if (/^(https?:)?\/\//.test(refPath)) return null;

  /* Resolve relative to the HTML file's directory */
  var baseDir = (basePath || '').replace(/[^\/]*$/, '');
  var resolved = refPath;

  if (refPath.charAt(0) === '/') {
    resolved = refPath.substring(1);
  } else if (refPath.substring(0, 2) === './') {
    resolved = baseDir + refPath.substring(2);
  } else {
    resolved = baseDir + refPath;
  }

  /* Normalize ".." and "." segments */
  var parts = resolved.split('/'), stack = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === '..') stack.pop();
    else if (parts[i] && parts[i] !== '.') stack.push(parts[i]);
  }
  resolved = stack.join('/');

  console.log('[resolveProjectFile] "' + refPath + '" -> "' + resolved + '"');

  /* ── Try mock data FIRST (instant, no network delay) ── */
  if (MOCK_CONTENTS.hasOwnProperty(resolved)) {
    console.log('[resolveProjectFile] FOUND in mock data (' + MOCK_CONTENTS[resolved].length + ' chars)');
    return MOCK_CONTENTS[resolved];
  }

  /* ── Fallback: try via API ── */
  try {
    var content = await readFile(project, resolved);
    if (typeof content === 'string') return content;
    if (content && typeof content.content === 'string') return content.content;
    return '';
  } catch (e) {
    console.warn('[resolveProjectFile] FAILED:', resolved, e.message);
    return null;
  }
}

/**
 * Parse an HTML string, find all <link rel="stylesheet" href="..."> and
 * <script src="..."> tags, fetch those files, and inline them directly.
 * This is what makes the preview show CSS styles and run JavaScript.
 */
async function inlineExternalResources(htmlStr, project, filePath) {
  var result = htmlStr;

  console.log('[inlineExternalResources] Starting for', filePath, '(length=' + htmlStr.length + ')');

  /* ── 1. Inline CSS: <link rel="stylesheet" href="..."> ── */
  var cssRe = /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]*>/gi;
  var hrefRe = /href\s*=\s*["']([^"']+)["']/i;
  var cssTag;
  var cssMatches = [];

  while ((cssTag = cssRe.exec(htmlStr)) !== null) {
    var hm = hrefRe.exec(cssTag[0]);
    if (hm) cssMatches.push({ full: cssTag[0], href: hm[1] });
  }

  console.log('[inlineExternalResources] Found', cssMatches.length, 'CSS link(s)');

  for (var i = 0; i < cssMatches.length; i++) {
    var cm = cssMatches[i];
    if (/^(https?:)?\/\//.test(cm.href)) { console.log('  Skipping CDN:', cm.href); continue; }

    console.log('  Resolving CSS:', cm.href);
    var cssContent = await resolveProjectFile(project, cm.href, filePath);

    if (cssContent != null && cssContent.length > 0) {
      var styleTag = '<style>\n/* === Inlined from: ' + cm.href + ' === */\n' + cssContent + '\n</style>';
      result = result.replace(cm.full, styleTag);
      console.log('  INLINED CSS:', cm.href, '(' + cssContent.length + ' chars)');
    } else {
      console.warn('  FAILED to inline CSS:', cm.href);
    }
  }

  /* ── 2. Inline JS: <script src="..."></script> ── */
  /* Use a safe regex that handles the closing script tag */
  var jsRe = /<script([^>]+)src\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi;
  var jsMatches = [];
  var jsTag;

  while ((jsTag = jsRe.exec(htmlStr)) !== null) {
    jsMatches.push({ full: jsTag[0], src: jsTag[2] });
  }

  console.log('[inlineExternalResources] Found', jsMatches.length, 'JS script(s)');

  for (var j = 0; j < jsMatches.length; j++) {
    var jm = jsMatches[j];
    if (/^(https?:)?\/\//.test(jm.src)) { console.log('  Skipping CDN:', jm.src); continue; }

    console.log('  Resolving JS:', jm.src);
    var jsContent = await resolveProjectFile(project, jm.src, filePath);

    if (jsContent != null && jsContent.length > 0) {
      /* Escape any </script> that might exist inside the JS content */
      var safeJs = jsContent.split('</' + 'script>').join('<\\/' + 'script>');
      var scriptTag = '<' + 'script>\n/* === Inlined from: ' + jm.src + ' === */\n' + safeJs + '\n</' + 'script>';
      result = result.replace(jm.full, scriptTag);
      console.log('  INLINED JS:', jm.src, '(' + jsContent.length + ' chars)');
    } else {
      console.warn('  FAILED to inline JS:', jm.src);
    }
  }

  console.log('[inlineExternalResources] Done. Output length:', result.length);
  return result;
}

/* ═══ State ═══ */
var projects = [];
var expanded = {};
var filesCache = {};
var folderExpanded = {};
var folderLoading = {};
var openTabs = [];
var activeTab = -1;
var wrapOn = false;
var previewOpen = false;
var retryInfo = null;
var _lastPreviewHtml = '';

/* ═══ DOM refs ═══ */
var $list, $loading, $empty, $tabBar, $crumb;
var $stEmpty, $stLoading, $stBinary, $stError, $stViewer;
var $loadText, $binName, $errText, $retryBtn;
var $vIcon, $vName, $vPath, $vLang, $vLines;
var $btnCopy, $btnDl, $btnWrap, $btnPreview, $previewLabel, $copyLbl;
var $viewerBody, $codeWrap, $lineNums, $codePre, $code;
var $previewPanel, $previewFrame;
var $previewRefreshBtn, $previewNewTabBtn, $previewCloseBtn;
var $statProj, $statFile;

/* ═══ Initialize ═══ */
document.addEventListener('DOMContentLoaded', function () {
  $list     = document.getElementById('projectsList');
  $loading  = document.getElementById('projectsLoading');
  $empty    = document.getElementById('projectsEmpty');
  $tabBar   = document.getElementById('tabBar');
  $crumb    = document.getElementById('breadcrumb');

  $stEmpty   = document.getElementById('stateEmpty');
  $stLoading = document.getElementById('stateLoading');
  $stBinary  = document.getElementById('stateBinary');
  $stError   = document.getElementById('stateError');
  $stViewer  = document.getElementById('stateViewer');

  $loadText = document.getElementById('loadingText');
  $binName  = document.getElementById('binaryFileName');
  $errText  = document.getElementById('errorText');
  $retryBtn = document.getElementById('retryBtn');

  $vIcon  = document.getElementById('viewerIcon');
  $vName  = document.getElementById('viewerName');
  $vPath  = document.getElementById('viewerPath');
  $vLang  = document.getElementById('viewerLang');
  $vLines = document.getElementById('viewerLines');

  $btnCopy    = document.getElementById('btnCopy');
  $btnDl      = document.getElementById('btnDownload');
  $btnWrap    = document.getElementById('btnWrap');
  $btnPreview = document.getElementById('btnPreview');
  $previewLabel = document.getElementById('previewLabel');
  $copyLbl    = document.getElementById('copyLabel');

  $viewerBody   = document.getElementById('viewerBody');
  $codeWrap     = document.getElementById('codeWrapper');
  $lineNums     = document.getElementById('lineNumbers');
  $codePre      = document.getElementById('codePre');
  $code         = document.getElementById('codeBlock');

  $previewPanel      = document.getElementById('previewPanel');
  $previewFrame      = document.getElementById('previewFrame');
  $previewRefreshBtn = document.getElementById('previewRefreshBtn');
  $previewNewTabBtn  = document.getElementById('previewNewTabBtn');
  $previewCloseBtn   = document.getElementById('previewCloseBtn');

  $statProj = document.getElementById('statusProject');
  $statFile = document.getElementById('statusFile');

  /* Theme toggle */
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    var syncTheme = function () {
      var t = document.documentElement.getAttribute('data-theme');
      themeBtn.classList.remove('ett-dark', 'ett-light');
      themeBtn.classList.add(t === 'light' ? 'ett-light' : 'ett-dark');
      syncPrismTheme(t);
    };
    syncTheme();
    themeBtn.addEventListener('click', function () {
      if (typeof toggleTheme === 'function') toggleTheme();
      syncTheme();
    });
  }

  /* Buttons */
  var refreshBtn = document.getElementById('refreshProjectsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', function () { _useMockData = false; _useFallback = false; loadProjects(); });
  if ($retryBtn) $retryBtn.addEventListener('click', doRetry);
  if ($btnCopy) $btnCopy.addEventListener('click', doCopy);
  if ($btnDl) $btnDl.addEventListener('click', doDownload);
  if ($btnWrap) $btnWrap.addEventListener('click', doWrap);
  if ($btnPreview) $btnPreview.addEventListener('click', doPreview);

  /* Preview panel buttons */
  if ($previewRefreshBtn) $previewRefreshBtn.addEventListener('click', refreshPreview);
  if ($previewNewTabBtn) $previewNewTabBtn.addEventListener('click', openPreviewInNewTab);
  if ($previewCloseBtn) $previewCloseBtn.addEventListener('click', closePreview);

  initResize();
  loadProjects();
});

/* ═══ Prism theme sync ═══ */
function syncPrismTheme(theme) {
  var link = document.getElementById('prismThemeLink');
  if (!link) return;
  link.href = theme === 'light'
    ? 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css'
    : 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
}

/* ═══ Show one state panel, hide others ═══ */
function showState(name) {
  var map = { empty: $stEmpty, loading: $stLoading, binary: $stBinary, error: $stError, viewer: $stViewer };
  for (var k in map) {
    if (map[k]) map[k].style.display = (k === name) ? 'flex' : 'none';
  }
}

/* ═══ Load projects ═══ */
async function loadProjects() {
  $loading.style.display = 'flex';
  $empty.style.display = 'none';
  $list.innerHTML = '';
  try {
    var raw = await listProjects();
    projects = (raw || []).filter(Boolean);
    if (projects.length === 0) {
      $empty.style.display = 'flex';
    } else {
      renderSidebar();
    }
  } catch (err) {
    console.error('[explorer] Load projects error:', err);
    $empty.style.display = 'flex';
    var et = $empty.querySelector('.vsc-empty-text');
    if (et) et.textContent = 'Failed to load projects';
  } finally {
    $loading.style.display = 'none';
  }
}

/* ═══ Render sidebar projects ═══ */
function renderSidebar() {
  if (projects.length === 0) { $list.innerHTML = ''; $empty.style.display = 'flex'; return; }
  $empty.style.display = 'none';
  var html = '';
  for (var i = 0; i < projects.length; i++) {
    var name = projects[i];
    var isOpen = !!expanded[name];
    html += '<div class="vsc-project-section">';
    html += '<div class="vsc-section-header" data-act="toggle-proj" data-proj="' + esc(name) + '">';
    html += '<span class="vsc-section-chevron">' + chevronSvg(isOpen) + '</span>';
    html += '<span class="vsc-section-title">' + esc(name) + '</span>';
    html += '<div class="vsc-section-actions">';
    html += '<button class="vsc-icon-btn" title="Refresh" data-act="refresh-proj" data-proj="' + esc(name) + '"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M12 7a5 5 0 01-10 0 5 5 0 019-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 1v3H9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    html += '<button class="vsc-icon-btn" title="Download ZIP" data-act="dl-proj" data-proj="' + esc(name) + '"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v7M4 7l3 3 3-3M2 11h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    html += '</div></div>';
    if (isOpen) {
      html += '<div class="vsc-section-body">' + buildTree(name, '') + '</div>';
    }
    html += '</div>';
  }
  $list.innerHTML = html;
  $list.onclick = handleClick;
}

/* ═══ Event delegation ═══ */
function handleClick(e) {
  var el = e.target.closest('[data-act]');
  if (!el) return;
  e.stopPropagation();
  var act = el.getAttribute('data-act');
  var proj = el.getAttribute('data-proj');
  var path = el.getAttribute('data-path');
  var name = el.getAttribute('data-name');
  if (act === 'toggle-proj') toggleProject(proj);
  else if (act === 'refresh-proj') refreshProject(proj);
  else if (act === 'dl-proj') downloadProject(proj);
  else if (act === 'toggle-dir') toggleFolder(proj, path);
  else if (act === 'open-file') openFile(proj, path, name);
}

/* ═══ Project toggle ═══ */
async function toggleProject(name) {
  if (expanded[name]) { delete expanded[name]; renderSidebar(); return; }
  expanded[name] = true;
  if ($statProj) $statProj.textContent = name;
  if (!filesCache[name] || !filesCache[name]['']) {
    await loadFolder(name, '');
  }
  renderSidebar();
}

async function refreshProject(name) {
  delete filesCache[name];
  var keys = Object.keys(folderExpanded);
  for (var i = 0; i < keys.length; i++) { if (keys[i].indexOf(name + '::') === 0) delete folderExpanded[keys[i]]; }
  if (expanded[name]) await loadFolder(name, '');
  renderSidebar();
}

/* ═══ Folder toggle ═══ */
async function toggleFolder(proj, path) {
  var key = proj + '::' + path;
  if (folderExpanded[key]) { delete folderExpanded[key]; renderSidebar(); return; }
  folderExpanded[key] = true;
  if (!filesCache[proj] || !filesCache[proj][path]) {
    await loadFolder(proj, path);
  }
  renderSidebar();
}

/* ═══ Load folder files ═══ */
async function loadFolder(proj, path) {
  var key = proj + '::' + path;
  folderLoading[key] = true;
  renderSidebar();
  try {
    var raw = await listFiles(proj, path);
    var entries = normalizeFiles(raw);
    entries = sortEntries(entries);
    entries = entries.map(function (e) {
      var n = e.name || e.filename || '';
      var p = e.path || (path ? path + '/' + n : n);
      return { name: n, path: p, type: e.type || (e.is_directory ? 'directory' : 'file'), is_directory: e.is_directory || e.type === 'directory' || e.type === 'dir' };
    });
    if (!filesCache[proj]) filesCache[proj] = {};
    filesCache[proj][path] = entries;
  } catch (err) {
    console.error('[explorer] loadFolder failed:', err);
    if (!filesCache[proj]) filesCache[proj] = {};
    filesCache[proj][path] = [];
  } finally {
    delete folderLoading[key];
  }
}

/* ═══ Build file tree HTML ═══ */
function buildTree(proj, parentPath) {
  var key = proj + '::' + parentPath;
  if (folderLoading[key]) {
    return '<div style="padding-left:32px;height:26px;display:flex;align-items:center;gap:8px;color:#4a6d88;font-size:12px">' + spinnerSvg() + '<span>Loading...</span></div>';
  }
  var entries = (filesCache[proj] && filesCache[proj][parentPath]) || null;
  if (entries === null) {
    return '<div style="padding-left:32px;height:26px;display:flex;align-items:center;gap:8px;color:#4a6d88;font-size:12px">' + spinnerSvg() + '<span>Loading...</span></div>';
  }
  if (entries.length === 0) return '<div class="filetree-empty-dir" style="padding-left:32px">(empty)</div>';

  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var isDir = entry.is_directory || entry.type === 'directory' || entry.type === 'dir';
    var depth = (entry.path || '').split('/').length;
    var indent = depth * 18 + 4;
    var fkey = proj + '::' + entry.path;
    var isExp = !!folderExpanded[fkey];

    if (isDir) {
      var chev = folderLoading[fkey] ? spinnerSvg() : chevronSvg(isExp);
      html += '<div class="filetree-node" style="padding-left:' + indent + 'px" data-act="toggle-dir" data-proj="' + esc(proj) + '" data-path="' + esc(entry.path) + '">';
      html += '<span class="filetree-chevron">' + chev + '</span>';
      html += '<span class="filetree-icon">' + folderIcon(entry.name, isExp) + '</span>';
      html += '<span class="filetree-name">' + esc(entry.name) + '</span></div>';
      if (isExp) {
        html += '<div class="filetree-children" style="position:relative"><div style="position:absolute;left:' + (indent + 7) + 'px;top:0;bottom:0;width:1px;background:rgba(34,109,180,0.10)"></div>';
        html += buildTree(proj, entry.path) + '</div>';
      }
    } else {
      var isActive = activeTab >= 0 && openTabs[activeTab] && openTabs[activeTab].path === entry.path && openTabs[activeTab].project === proj;
      html += '<div class="filetree-node' + (isActive ? ' filetree-node-selected' : '') + '" style="padding-left:' + indent + 'px" data-act="open-file" data-proj="' + esc(proj) + '" data-path="' + esc(entry.path) + '" data-name="' + esc(entry.name) + '">';
      html += '<span class="filetree-chevron" style="visibility:hidden"><svg width="12" height="12" viewBox="0 0 12 12"></svg></span>';
      html += '<span class="filetree-icon">' + fileIcon(entry.name) + '</span>';
      html += '<span class="filetree-name">' + esc(entry.name) + '</span></div>';
    }
  }
  return html;
}

/* ══════════════════════════════════════════════════════════
   FILE OPEN — open file, show content in FileViewer
   ══════════════════════════════════════════════════════════ */
async function openFile(proj, path, name) {
  for (var i = 0; i < openTabs.length; i++) {
    if (openTabs[i].project === proj && openTabs[i].path === path) {
      activeTab = i;
      renderTabs();
      renderViewer();
      renderSidebar();
      return;
    }
  }

  retryInfo = { proj: proj, path: path, name: name };

  if (isBinary(name)) {
    openTabs.push({ name: name, path: path, project: proj, content: null, binary: true });
    activeTab = openTabs.length - 1;
    renderTabs();
    renderViewer();
    renderSidebar();
    return;
  }

  if ($loadText) $loadText.textContent = 'Loading ' + name + '\u2026';
  showState('loading');
  if ($statFile) $statFile.textContent = 'Loading ' + name + '...';

  try {
    var raw = await readFile(proj, path);
    var content = '';
    if (typeof raw === 'string') content = raw;
    else if (raw && raw.content !== undefined) content = raw.content;
    else if (raw) content = JSON.stringify(raw, null, 2);

    openTabs.push({ name: name, path: path, project: proj, content: content, binary: false });
    activeTab = openTabs.length - 1;
    renderTabs();
    renderViewer();
    renderSidebar();
  } catch (err) {
    console.error('[explorer] openFile error:', err);
    if ($errText) $errText.textContent = 'Error: ' + err.message;
    showState('error');
    if ($statFile) $statFile.textContent = 'Error loading file';
  }
}

function doRetry() {
  if (retryInfo) openFile(retryInfo.proj, retryInfo.path, retryInfo.name);
}

/* ═══ Close tab ═══ */
function closeTab(idx) {
  openTabs.splice(idx, 1);
  if (activeTab >= openTabs.length) activeTab = openTabs.length - 1;
  closePreview();
  renderTabs();
  renderViewer();
  renderSidebar();
}

/* ═══ Render tab bar ═══ */
function renderTabs() {
  var html = '';
  for (var i = 0; i < openTabs.length; i++) {
    var tab = openTabs[i];
    var isAct = i === activeTab;
    html += '<div class="vsc-tab' + (isAct ? ' vsc-tab-active' : '') + '" onclick="activeTab=' + i + ';closePreview();renderTabs();renderViewer();renderSidebar();" title="' + esc(tab.project + '/' + tab.path) + '">';
    html += '<span class="vsc-tab-icon">' + fileIcon(tab.name) + '</span>';
    html += '<span class="vsc-tab-name">' + esc(tab.name) + '</span>';
    html += '<button class="vsc-tab-close" onclick="event.stopPropagation();closeTab(' + i + ')"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button></div>';
  }
  $tabBar.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════
   RENDER FILE VIEWER — the main content panel
   ══════════════════════════════════════════════════════════ */
function renderViewer() {
  if (activeTab < 0 || !openTabs[activeTab]) {
    showState('empty');
    $crumb.innerHTML = '';
    if ($statFile) $statFile.textContent = 'Ready';
    if ($statProj) $statProj.textContent = 'No project selected';
    if ($btnPreview) $btnPreview.style.display = 'none';
    return;
  }

  var tab = openTabs[activeTab];
  if ($statFile) $statFile.textContent = tab.name;
  if ($statProj) $statProj.textContent = tab.project;

  /* Breadcrumb */
  var parts = [tab.project].concat(tab.path.split('/'));
  var bc = '';
  for (var i = 0; i < parts.length; i++) {
    if (i > 0) bc += '<span class="vsc-breadcrumb-sep">&rsaquo;</span>';
    var cls = i === parts.length - 1 ? 'vsc-breadcrumb-item vsc-breadcrumb-current' : 'vsc-breadcrumb-item';
    bc += '<span class="' + cls + '">' + esc(parts[i]) + '</span>';
  }
  $crumb.innerHTML = bc;

  /* Binary */
  if (tab.binary) {
    if ($binName) $binName.textContent = tab.name;
    if ($btnPreview) $btnPreview.style.display = 'none';
    showState('binary');
    return;
  }

  showState('viewer');

  /* Show/hide Preview button */
  var showPreviewBtn = isPreviewable(tab.name) || canPreviewWithShell(tab.name);
  if ($btnPreview) {
    $btnPreview.style.display = showPreviewBtn ? 'inline-flex' : 'none';
  }

  /* Header info */
  $vIcon.innerHTML = fileIcon(tab.name);
  $vName.textContent = tab.name;
  $vPath.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" style="margin-right:5px;flex-shrink:0"><path d="M4 4h5l2 2h9c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="var(--text-tertiary,#4a6d88)" opacity="0.6"/></svg>' + esc(tab.path);
  $vLang.textContent = getLangLabel(tab.name);

  /* Lines */
  var lines = (tab.content || '').split('\n');
  var lc = lines.length;
  $vLines.textContent = lc + ' line' + (lc !== 1 ? 's' : '');

  /* Line numbers */
  var lnHtml = '';
  for (var ln = 1; ln <= lc; ln++) {
    lnHtml += '<span class="fv-line-num">' + ln + '</span>';
  }
  $lineNums.innerHTML = lnHtml;

  /* Word wrap */
  if (wrapOn) {
    $codePre.classList.add('fv-wrap-on');
    $btnWrap.classList.add('fv-active');
  } else {
    $codePre.classList.remove('fv-wrap-on');
    $btnWrap.classList.remove('fv-active');
  }

  /* Syntax highlighting */
  var lang = getLang(tab.name);
  $code.textContent = tab.content || '';

  if (lang !== 'none' && typeof Prism !== 'undefined' && Prism.languages[lang]) {
    $code.className = 'language-' + lang;
    $codePre.className = 'fv-code-pre language-' + lang + (wrapOn ? ' fv-wrap-on' : '');
    try { Prism.highlightElement($code); } catch (e) { console.warn('[Prism]', e); }
  } else {
    $code.className = '';
    $codePre.className = 'fv-code-pre' + (wrapOn ? ' fv-wrap-on' : '');
  }

  /* Scroll to top */
  $codeWrap.scrollTop = 0;
  $codeWrap.scrollLeft = 0;

  /* If preview is open, refresh it */
  if (previewOpen) {
    writePreviewFrame();
  }
}

/* ═══ FileViewer actions ═══ */
function doCopy() {
  if (activeTab < 0) return;
  var tab = openTabs[activeTab];
  if (!tab || tab.binary || !tab.content) return;
  navigator.clipboard.writeText(tab.content).then(function () {
    $btnCopy.classList.add('fv-copied');
    if ($copyLbl) $copyLbl.textContent = 'Copied!';
    setTimeout(function () {
      $btnCopy.classList.remove('fv-copied');
      if ($copyLbl) $copyLbl.textContent = 'Copy';
    }, 2000);
  }).catch(function (err) { console.error('[Copy]', err); });
}

function doDownload() {
  if (activeTab < 0) return;
  var tab = openTabs[activeTab];
  if (!tab || !tab.content) return;
  var blob = new Blob([tab.content], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = tab.name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function doWrap() {
  wrapOn = !wrapOn;
  if ($codePre) $codePre.classList.toggle('fv-wrap-on', wrapOn);
  if ($btnWrap) $btnWrap.classList.toggle('fv-active', wrapOn);
}

/* ══════════════════════════════════════════════════════════════════════
   ★★★ LIVE PREVIEW — renders HTML/CSS/JS in a sandboxed iframe
        with AUTOMATIC inlining of external CSS & JS files!
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Build the full HTML string for the preview iframe.
 * For HTML files: fetches linked CSS/JS from the project and inlines them.
 * For CSS files: wraps in a demo HTML page.
 * For JS files: wraps in a page that captures console output.
 */
async function buildPreviewHtml() {
  if (activeTab < 0 || !openTabs[activeTab]) return '';
  var tab = openTabs[activeTab];
  var content = tab.content || '';
  var ext = (tab.name || '').split('.').pop().toLowerCase();

  console.log('[buildPreviewHtml] Building preview for:', tab.name, '(ext=' + ext + ')');

  /* HTML files — inline all external CSS/JS, then render */
  if (ext === 'html' || ext === 'htm') {
    var inlinedHtml = await inlineExternalResources(content, tab.project, tab.path);
    console.log('[buildPreviewHtml] HTML preview ready. Length:', inlinedHtml.length);
    return inlinedHtml;
  }

  /* SVG files */
  if (ext === 'svg') {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a2e;}</style></head><body>' + content + '</body></html>';
  }

  /* CSS files — show a styled demo page */
  if (ext === 'css' || ext === 'scss') {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>' + content + '</style></head><body>\n' +
      '<div class="app"><div class="main">\n' +
      '<h1>CSS Preview</h1>\n' +
      '<p class="subtitle">Showing styles from <code>' + esc(tab.name) + '</code></p>\n' +
      '<button class="btn">Sample Button</button>\n' +
      '<div class="features"><div class="card"><div class="card-icon">\uD83C\uDFA8</div><h3>Card 1</h3><p>Sample card</p></div><div class="card"><div class="card-icon">\u2728</div><h3>Card 2</h3><p>Another card</p></div></div>\n' +
      '<div class="container"><div class="todo-section"><h2>Demo Section</h2><p>This page uses the CSS classes from your stylesheet.</p></div></div>\n' +
      '</div></div>\n</body></html>';
  }

  /* JS files — run in an HTML shell with console output capture */
  if (JS_EXTS.indexOf(ext) >= 0) {
    var jsShellParts = [];
    jsShellParts.push('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>');
    jsShellParts.push('body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0a0f1a;color:#cdd8e4;}');
    jsShellParts.push('#output{white-space:pre-wrap;font-family:"JetBrains Mono",monospace;font-size:13px;line-height:1.6;padding:16px;background:rgba(34,109,180,0.06);border:1px solid rgba(34,109,180,0.15);border-radius:8px;}');
    jsShellParts.push('.log-line{padding:2px 0;border-bottom:1px solid rgba(34,109,180,0.06);}');
    jsShellParts.push('.log-error{color:#ef4444;}');
    jsShellParts.push('.log-warn{color:#f5a623;}');
    jsShellParts.push('h3{color:#5a8aac;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;}');
    jsShellParts.push('</style></head><body>');
    jsShellParts.push('<h3>\u25B6 Console Output \u2014 ' + esc(tab.name) + '</h3>');
    jsShellParts.push('<div id="output"></div>');
    jsShellParts.push('<' + 'script>');
    jsShellParts.push('(function(){');
    jsShellParts.push('  var out=document.getElementById("output");');
    jsShellParts.push('  function addLine(cls,args){');
    jsShellParts.push('    var d=document.createElement("div");d.className="log-line "+cls;');
    jsShellParts.push('    d.textContent=[].map.call(args,function(a){');
    jsShellParts.push('      if(typeof a==="object")try{return JSON.stringify(a,null,2)}catch(e){return String(a)}');
    jsShellParts.push('      return String(a);');
    jsShellParts.push('    }).join(" ");');
    jsShellParts.push('    out.appendChild(d);');
    jsShellParts.push('  }');
    jsShellParts.push('  var _log=console.log,_err=console.error,_warn=console.warn,_info=console.info;');
    jsShellParts.push('  console.log=function(){addLine("",arguments);_log.apply(console,arguments);};');
    jsShellParts.push('  console.error=function(){addLine("log-error",arguments);_err.apply(console,arguments);};');
    jsShellParts.push('  console.warn=function(){addLine("log-warn",arguments);_warn.apply(console,arguments);};');
    jsShellParts.push('  console.info=function(){addLine("",arguments);_info.apply(console,arguments);};');
    jsShellParts.push('  window.onerror=function(m,s,l,c,e){addLine("log-error",["Error: "+m+" (line "+l+")"]);};');
    jsShellParts.push('})();');
    jsShellParts.push('</' + 'script>');
    jsShellParts.push('<' + 'script>');
    jsShellParts.push('try {');
    /* Escape closing script tag in user code */
    jsShellParts.push(content.split('</' + 'script>').join('<\\/' + 'script>'));
    jsShellParts.push('} catch(e) { console.error("Runtime Error:", e.message); }');
    jsShellParts.push('</' + 'script>');
    jsShellParts.push('</body></html>');
    return jsShellParts.join('\n');
  }

  /* Fallback */
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="padding:40px;font-family:sans-serif;background:#0a0f1a;color:#cdd8e4;"><p>Preview not available for this file type.</p></body></html>';
}

/**
 * Write the preview HTML into the iframe.
 */
async function writePreviewFrame() {
  if (!$previewFrame) { console.warn('[writePreviewFrame] No iframe element!'); return; }

  /* Show a loading spinner while resolving files */
  $previewFrame.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#080c14;color:#5a8aac;font-family:sans-serif;font-size:14px;}@keyframes spin{to{transform:rotate(360deg)}}.sp{width:20px;height:20px;border:2px solid rgba(34,109,180,0.2);border-top-color:#226DB4;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:10px;}</style></head><body><div class="sp"></div>Loading preview\u2026</body></html>';

  try {
    var html = await buildPreviewHtml();
    _lastPreviewHtml = html;
    console.log('[writePreviewFrame] Setting srcdoc, length:', html.length);
    $previewFrame.srcdoc = html;
  } catch (err) {
    console.error('[writePreviewFrame] Error:', err);
    $previewFrame.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#080c14;color:#ef4444;font-family:sans-serif;}</style></head><body>Error: ' + esc(err.message) + '</body></html>';
  }
}

/**
 * Toggle the preview panel open/closed
 */
function doPreview() {
  if (previewOpen) {
    closePreview();
  } else {
    openPreviewPanel();
  }
}

function openPreviewPanel() {
  previewOpen = true;
  if ($previewPanel) $previewPanel.style.display = 'flex';
  if ($viewerBody) $viewerBody.classList.add('fv-body-split');
  if ($btnPreview) $btnPreview.classList.add('fv-active');
  if ($previewLabel) $previewLabel.textContent = 'Close Preview';
  writePreviewFrame();
}

function closePreview() {
  previewOpen = false;
  if ($previewPanel) $previewPanel.style.display = 'none';
  if ($viewerBody) $viewerBody.classList.remove('fv-body-split');
  if ($btnPreview) $btnPreview.classList.remove('fv-active');
  if ($previewLabel) $previewLabel.textContent = 'Preview';
  _lastPreviewHtml = '';
}

function refreshPreview() {
  writePreviewFrame();
}

async function openPreviewInNewTab() {
  var html = _lastPreviewHtml;
  if (!html) {
    html = await buildPreviewHtml();
  }
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}

/* ═══ Download project ZIP ═══ */
async function downloadProject(name) {
  try {
    var res = await fetch(PROJ_BASE + '/' + encodeURIComponent(name) + '/download', { headers: apiHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var blob = await res.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name + '.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[download]', err);
    alert('Download failed: ' + err.message);
  }
}

/* ═══ Sidebar resize ═══ */
function initResize() {
  var handle = document.getElementById('resizeHandle');
  var sidebar = document.getElementById('explorerSidebar');
  if (!handle || !sidebar) return;
  var resizing = false;
  handle.addEventListener('mousedown', function (e) {
    resizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!resizing) return;
    var w = Math.max(160, Math.min(500, e.clientX - 50));
    sidebar.style.width = w + 'px';
  });
  document.addEventListener('mouseup', function () {
    if (!resizing) return;
    resizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}
