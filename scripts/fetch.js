/* ============================================================
   Zenith Dashboard — Chat, Sessions, Sidebar Logic
   ============================================================ */

// ── Auth guard ──
if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

// API_BASE is defined in script.js (full backend URL)
const user = getUser();
const token = getToken();

// ── State ──
let sessions = [];
let activeSessionId = sessionStorage.getItem('zenith_active_session_id') || null;
let messages = [];
let isStreaming = false;
let currentTab = 'chats';
let sidebarCollapsed = false;
let searchQuery = '';
let abortController = null;

// ── DOM Refs ──
const sidebar = document.getElementById('sidebar');
const sessionList = document.getElementById('sessionList');
const chatArea = document.getElementById('chatArea');
const chatLanding = document.getElementById('chatLanding');
const chatMessages = document.getElementById('chatMessages');
const messagesList = document.getElementById('messagesList');
const chatInputWrapper = document.getElementById('chatInputWrapper');
const stopWrapper = document.getElementById('stopWrapper');
const landingGreeting = document.getElementById('landingGreeting');
const profileName = document.getElementById('profileName');
const profileAvatar = document.getElementById('profileAvatar');
const mobileTitle = document.getElementById('mobileTitle');

// ── Init UI ──
if (user) {
  const fname = user.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1).split(/[\s@._-]/)[0] : '';
  if (landingGreeting && fname) landingGreeting.innerHTML = `Good to see you, <span class="landing-name">${fname}</span>`;
  if (profileName) profileName.textContent = user.username || 'User';
  if (profileAvatar) profileAvatar.textContent = user.username ? user.username.substring(0, 2).toUpperCase() : 'NA';
}

// ── API Helpers ──
function apiHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (user?.user_id) h['X-User-Id'] = String(user.user_id);
  else if (user?.id) h['X-User-Id'] = String(user.id);
  return h;
}

async function apiFetch(path, options) {
  options = options || {};
  const url = API_BASE + path;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: apiHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) { window.location.href = 'login.html'; throw new Error('Unauthorized'); }
  if (options.method === 'DELETE') return res;
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    if (res.ok) return null;
    throw new Error('Unexpected response from server');
  }
  const data = await res.json();
  if (data.success === false) throw new Error(data.error || 'Request failed');
  return data.data !== undefined ? data.data : data;
}

// ── Sessions ──
async function fetchSessions() {
  try {
    document.getElementById('sessionsLoading').style.display = 'flex';
    const data = await apiFetch('/api/sessions');
    sessions = Array.isArray(data) ? data : (data?.sessions || []);
    renderSessionList();
    if (activeSessionId) {
      const exists = sessions.some(s => String(s.session_id) === String(activeSessionId));
      if (exists) await loadSession(activeSessionId);
      else { activeSessionId = null; sessionStorage.removeItem('zenith_active_session_id'); showLanding(); }
    } else {
      showLanding();
    }
  } catch (err) {
    console.error('Failed to fetch sessions:', err);
  } finally {
    document.getElementById('sessionsLoading').style.display = 'none';
  }
}

async function createSession() {
  const data = await apiFetch('/api/sessions', { method: 'POST', body: { title: 'New conversation' } });
  sessions.unshift(data);
  renderSessionList();
  return data;
}

async function deleteSession(sessionId) {
  await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  sessions = sessions.filter(s => String(s.session_id) !== String(sessionId));
  if (String(activeSessionId) === String(sessionId)) {
    activeSessionId = sessions.length > 0 ? sessions[0].session_id : null;
    if (activeSessionId) await loadSession(activeSessionId);
    else showLanding();
  }
  renderSessionList();
}

async function loadSession(sessionId) {
  activeSessionId = String(sessionId);
  sessionStorage.setItem('zenith_active_session_id', activeSessionId);
  try {
    const data = await apiFetch(`/api/messages/${sessionId}`);
    messages = Array.isArray(data) ? data : (data?.messages || []);
  } catch { messages = []; }
  showChat();
  renderMessages();
  renderSessionList();
  scrollToBottom();
}

// ── Render Sessions ──
function renderSessionList() {
  const filtered = searchQuery
    ? sessions.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;
  filtered.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

  const recentsLabel = document.getElementById('recentsLabel');
  const sessionsEmpty = document.getElementById('sessionsEmpty');

  if (filtered.length === 0 && sessions.length === 0) {
    sessionList.innerHTML = '';
    recentsLabel.style.display = 'none';
    sessionsEmpty.style.display = 'flex';
    return;
  }

  sessionsEmpty.style.display = 'none';
  recentsLabel.style.display = sessions.length > 0 ? 'block' : 'none';

  sessionList.innerHTML = filtered.map(s => {
    const isActive = String(s.session_id) === String(activeSessionId);
    return `<li>
      <div class="session-item ${isActive ? 'session-active' : ''}" onclick="loadSession('${s.session_id}')">
        <div class="session-info"><span class="session-title">${escapeHtml(s.title || 'New conversation')}</span></div>
        <div class="session-actions-right">
          <button class="session-delete-btn" onclick="event.stopPropagation();deleteSession('${s.session_id}')" title="Delete">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V3h4v1M3 4l.7 8h6.6L11 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </li>`;
  }).join('');
}

// ── Show/Hide states ──
function showLanding() {
  chatArea.classList.add('chat-area--empty');
  chatLanding.style.display = 'flex';
  chatMessages.style.display = 'none';
  chatInputWrapper.style.display = 'none';
  stopWrapper.style.display = 'none';
  mobileTitle.textContent = 'Zenith';
}

function showChat() {
  chatArea.classList.remove('chat-area--empty');
  chatLanding.style.display = 'none';
  chatMessages.style.display = 'block';
  chatInputWrapper.style.display = 'block';
  const session = sessions.find(s => String(s.session_id) === String(activeSessionId));
  mobileTitle.textContent = session?.title || 'Zenith';
}

// ── Render Messages ──
function renderMessages() {
  messagesList.innerHTML = messages.map((msg, idx) => {
    const isUser = msg.role === 'user';
    const isLast = idx === messages.length - 1;
    const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

    if (isUser) {
      return `<div class="message-row message-row-user ${isLast ? 'message-last' : ''}">
        <div class="message-body message-body-user">
          ${msg.content ? `<div class="message-bubble message-bubble-user">${escapeHtml(msg.content)}</div>` : ''}
          ${timeStr ? `<div class="message-footer message-footer-user"><span class="message-meta">${timeStr}</span></div>` : ''}
        </div>
        <div class="message-avatar message-avatar-user">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="11" r="5.5" fill="white" opacity="0.9"/><path d="M5 28.5C5 22.15 9.92 17 16 17C22.08 17 27 22.15 27 28.5" stroke="white" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.85"/></svg>
        </div>
      </div>`;
    } else {
      const html = renderMarkdown(msg.content || '');
      const toolCalls = msg.tool_calls || [];
      let toolHtml = '';
      if (toolCalls.length > 0) {
        toolHtml = '<div class="claude-activity-summary">' + toolCalls.map(tc => {
          const cfg = TOOL_SUMMARY[tc.tool] || { icon: '🔧', label: tc.tool };
          const isDone = tc.status === 'done';
          return `<div class="claude-activity-indicator ${isDone ? 'claude-activity-done' : 'claude-activity-live'}">
            ${isDone ? '<span class="claude-tool-status-dot claude-tool-status-dot-ok"></span>' : '<span class="claude-activity-spinner"></span>'}
            <span class="claude-activity-icon">${cfg.icon}</span>
            <span class="claude-activity-label">${cfg.label}</span>
          </div>`;
        }).join('') + '</div>';
      }

      const copyAttr = (msg.content || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');

      return `<div class="message-row message-row-assistant ${isLast ? 'message-last' : ''}">
        <div class="message-avatar message-avatar-assistant">
          <img src="images/zenith.png" alt="Zenith" width="24" height="24" style="border-radius:50%;object-fit:cover;">
        </div>
        <div class="message-body message-body-assistant">
          <div class="message-sender">Zenith</div>
          ${toolHtml}
          ${msg.isStreaming && !msg.content ? '<div class="mb-typing-dots"><span></span><span></span><span></span></div>' :
            `<div class="message-bubble message-bubble-assistant">
              <div class="message-content-html">${html}</div>
              ${msg.isStreaming && msg.content ? '<span class="streaming-cursor"></span>' : ''}
            </div>`}
          ${timeStr && !msg.isStreaming ? `<div class="message-footer"><span class="message-meta">${timeStr}</span>
            <button class="message-copy-btn" onclick="copyMessage(this)" data-content="${copyAttr}" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          </div>` : ''}
        </div>
      </div>`;
    }
  }).join('');
}

function scrollToBottom() {
  const bottom = document.getElementById('messagesBottom');
  if (bottom) bottom.scrollIntoView({ behavior: 'smooth' });
}

// ── Send Message (SSE streaming) ──
async function sendMessage(content) {
  if (!content.trim() || isStreaming) return;

  if (!activeSessionId) {
    const session = await createSession();
    activeSessionId = session.session_id;
    sessionStorage.setItem('zenith_active_session_id', activeSessionId);
    showChat();
  }

  messages.push({ role: 'user', content: content.trim(), created_at: new Date().toISOString() });
  messages.push({ role: 'assistant', content: '', isStreaming: true, tool_calls: [] });
  renderMessages();
  scrollToBottom();

  isStreaming = true;
  updateStreamingUI();

  const assistantMsg = messages[messages.length - 1];

  try {
    abortController = new AbortController();
    const res = await fetch(API_BASE + `/api/chat/${activeSessionId}/send`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ message: content.trim() }),
      signal: abortController.signal,
    });

    if (res.status === 401) { window.location.href = 'login.html'; return; }
    if (!res.ok) {
      let errMsg = 'Chat failed';
      try { const d = await res.json(); errMsg = d.error || d.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Normalize concatenated SSE
      buffer = buffer.replace(/\}(event:)/g, '}\n$1');
      buffer = buffer.replace(/\b(token|tool_start|tool_result|thinking|status|iteration|artifact|done|error)(data:)/g, '$1\n$2');
      buffer = buffer.replace(/\}(data:)/g, '}\n$1');

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { currentEvent = ''; continue; }
        if (trimmed.startsWith('event:')) { currentEvent = trimmed.slice(6).trim(); continue; }
        if (trimmed.startsWith('data:') && currentEvent) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            switch (currentEvent) {
              case 'token':
                assistantMsg.content += (data.content || '');
                break;
              case 'tool_start':
                assistantMsg.tool_calls = assistantMsg.tool_calls || [];
                assistantMsg.tool_calls.push({ tool: data.tool, input: data.input, status: 'running', tool_use_id: data.tool_use_id });
                break;
              case 'tool_result': {
                const tc = (assistantMsg.tool_calls || []).find(t => t.tool_use_id === data.tool_use_id);
                if (tc) { tc.status = 'done'; tc.result = data.result; }
                break;
              }
              case 'done':
                assistantMsg.isStreaming = false;
                assistantMsg.created_at = new Date().toISOString();
                if (data.session_title) {
                  const s = sessions.find(s => String(s.session_id) === String(activeSessionId));
                  if (s) { s.title = data.session_title; renderSessionList(); }
                  mobileTitle.textContent = data.session_title;
                }
                break;
              case 'error':
                assistantMsg.isStreaming = false;
                assistantMsg.isError = true;
                assistantMsg.content = data.error || 'An error occurred';
                break;
            }
          } catch {}
          currentEvent = '';
          renderMessages();
          scrollToBottom();
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      const remaining = buffer.replace(/\}(event:)/g, '}\n$1').replace(/\}(data:)/g, '}\n$1');
      const remLines = remaining.split('\n');
      for (const line of remLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('event:')) currentEvent = trimmed.slice(6).trim();
        else if (trimmed.startsWith('data:') && currentEvent) {
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            if (currentEvent === 'token') assistantMsg.content += (data.content || '');
            else if (currentEvent === 'done') { assistantMsg.isStreaming = false; assistantMsg.created_at = new Date().toISOString(); }
          } catch {}
          currentEvent = '';
        }
      }
    }

    assistantMsg.isStreaming = false;
    if (!assistantMsg.created_at) assistantMsg.created_at = new Date().toISOString();

  } catch (err) {
    if (err.name !== 'AbortError') {
      assistantMsg.isStreaming = false;
      assistantMsg.isError = true;
      assistantMsg.content = assistantMsg.content || (err.message || 'Failed to generate response');
    } else {
      assistantMsg.isStreaming = false;
    }
  } finally {
    isStreaming = false;
    abortController = null;
    updateStreamingUI();
    renderMessages();
    scrollToBottom();
  }
}

function cancelStream() {
  if (abortController) abortController.abort();
}

function updateStreamingUI() {
  stopWrapper.style.display = isStreaming ? 'flex' : 'none';
}

// ── Helpers ──
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block-wrapper">${langLabel}<pre class="code-block"><code>${code.trim()}</code></pre></div>`;
  });
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul class="md-list">${m}</ul>`);
  html = html.replace(/\n\n/g, '</p><p class="md-p">');
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<pre') && !html.startsWith('<div')) {
    html = `<p class="md-p">${html}</p>`;
  }
  return html;
}

function copyMessage(btn) {
  const text = (btn.getAttribute('data-content') || '').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('message-copy-btn--copied');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    setTimeout(() => {
      btn.classList.remove('message-copy-btn--copied');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }, 2000);
  });
}

const TOOL_SUMMARY = {
  web_search: { icon: '🌐', label: 'Searched the web' }, web_fetch: { icon: '🌐', label: 'Searched the web' },
  execute_code: { icon: '⚡', label: 'Executed code' }, execute_command: { icon: '⚡', label: 'Ran a command' },
  create_project: { icon: '📁', label: 'Created a project' }, create_file: { icon: '📄', label: 'Created files' },
  read_file: { icon: '📖', label: 'Read files' }, update_file: { icon: '✏️', label: 'Updated files' },
  schedule_task: { icon: '⏰', label: 'Scheduled a task' }, list_files: { icon: '📂', label: 'Listed files' },
  browser_launch: { icon: '🖥️', label: 'Used browser' }, memory_store: { icon: '🧠', label: 'Used memory' },
};

// ── Event Listeners ──
document.addEventListener('DOMContentLoaded', () => {
  fetchSessions();

  document.getElementById('newChatBtn').addEventListener('click', () => {
    activeSessionId = null;
    sessionStorage.removeItem('zenith_active_session_id');
    messages = [];
    showLanding();
    renderSessionList();
    closeMobileSidebar();
  });

  document.getElementById('emptyStartBtn')?.addEventListener('click', () => {
    document.getElementById('landingTextarea')?.focus();
  });

  const searchContainer = document.getElementById('searchContainer');
  document.getElementById('searchBtn').addEventListener('click', () => {
    const visible = searchContainer.style.display !== 'none';
    searchContainer.style.display = visible ? 'none' : 'block';
    if (!visible) document.getElementById('searchInput').focus();
    else { searchQuery = ''; document.getElementById('searchInput').value = ''; renderSessionList(); }
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    document.getElementById('searchClear').style.display = searchQuery ? 'block' : 'none';
    renderSessionList();
  });

  document.getElementById('searchClear').addEventListener('click', () => {
    searchQuery = ''; document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none'; renderSessionList();
  });

  document.querySelectorAll('.sidebar-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.sidebar-nav-btn[data-tab]').forEach(b => b.classList.remove('sidebar-nav-active'));
      btn.classList.add('sidebar-nav-active');
      document.getElementById('tasksPanel').style.display = currentTab === 'tasks' ? 'block' : 'none';
      const chatContent = [document.getElementById('recentsLabel'), sessionList, document.getElementById('sessionsEmpty')];
      chatContent.forEach(el => { if (el) el.style.display = currentTab === 'chats' ? '' : 'none'; });
    });
  });

  document.getElementById('collapseBtn').addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    document.getElementById('chatMain').classList.toggle('chat-main-expanded', sidebarCollapsed);
    document.getElementById('sidebarBrandText').style.display = sidebarCollapsed ? 'none' : '';
    document.getElementById('sidebarActions').style.display = sidebarCollapsed ? 'none' : '';
    document.getElementById('sidebarNav').style.display = sidebarCollapsed ? 'none' : '';
    document.getElementById('sidebarContent').style.display = sidebarCollapsed ? 'none' : '';
  });

  document.getElementById('landingInputForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ta = document.getElementById('landingTextarea');
    sendMessage(ta.value); ta.value = ''; ta.style.height = 'auto';
    updateSendBtn('landingSendBtn', '');
  });

  document.getElementById('chatInputForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ta = document.getElementById('chatTextarea');
    sendMessage(ta.value); ta.value = ''; ta.style.height = 'auto';
    updateSendBtn('chatSendBtn', '');
  });

  ['landingTextarea', 'chatTextarea'].forEach(id => {
    const ta = document.getElementById(id);
    if (!ta) return;
    const btnId = id === 'landingTextarea' ? 'landingSendBtn' : 'chatSendBtn';
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
      updateSendBtn(btnId, ta.value);
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.closest('form').dispatchEvent(new Event('submit')); }
    });
  });

  document.getElementById('stopBtn').addEventListener('click', cancelStream);
  document.getElementById('mobileMenuBtn')?.addEventListener('click', openMobileSidebar);
  document.getElementById('mobileOverlay')?.addEventListener('click', closeMobileSidebar);

  document.getElementById('profileTrigger')?.addEventListener('click', () => {
    if (confirm('Log out of Zenith?')) {
      removeCookie('zenith_token'); removeCookie('zenith_user');
      sessionStorage.removeItem('zenith_active_session_id');
      window.location.href = 'login.html';
    }
  });
});

function updateSendBtn(btnId, value) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const hasContent = value.trim().length > 0;
  btn.disabled = !hasContent || isStreaming;
  btn.classList.toggle('ci-send--active', hasContent && !isStreaming);
}

function openMobileSidebar() {
  sidebar.classList.add('sidebar-mobile-open');
  document.getElementById('mobileOverlay').style.display = 'block';
}

function closeMobileSidebar() {
  sidebar.classList.remove('sidebar-mobile-open');
  document.getElementById('mobileOverlay').style.display = 'none';
}
