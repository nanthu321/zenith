/* Zenith Dashboard -- Chat, Sessions, Sidebar Logic */
if (!isLoggedIn()) {
    window.location.href = 'login.html';
}
var user = getUser();
var token = getToken();
var sessions = [];
var activeSessionId = sessionStorage.getItem('zenith_active_session_id') || null;
var messages = [],
    isStreaming = false,
    currentTab = 'chats',
    sidebarCollapsed = false,
    searchQuery = '',
    abortController = null;
var MAX_FILE_SIZE = 50 * 1024 * 1024,
    MAX_FILES = 10,
    attachments = [],
    menuOpen = false,
    activeMenuTarget = null;

function getFileCategory(file) {
    var type = file.type,
        name = file.name,
        ext = name.split('.').pop().toLowerCase() || '';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type === 'application/pdf' || type.includes('document') || type.includes('sheet') || type.includes('presentation') || type.startsWith('text/')) return 'document';
    if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gzip') || type.includes('7z')) return 'archive';
    var ie = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'],
        ve = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'],
        ae = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma', 'm4a', 'opus'];
    var de = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'rb', 'php', 'sh', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'log', 'sql', 'jsx', 'tsx', 'vue', 'svelte', 'dart', 'kt', 'swift', 'r', 'lua', 'zig'];
    var ar = ['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz', 'tgz'];
    if (ie.includes(ext)) return 'image';
    if (ve.includes(ext)) return 'video';
    if (ae.includes(ext)) return 'audio';
    if (de.includes(ext)) return 'document';
    if (ar.includes(ext)) return 'archive';
    return 'file';
}

function getCategoryColor(cat) {
    var c = {
        image: '#226DB4',
        video: '#E42527',
        audio: '#0A9949',
        document: '#5a9fd4',
        archive: '#F9B21C',
        file: '#94a3b8'
    };
    return c[cat] || '#94a3b8';
}

function getExt(name) {
    var p = name.split('.');
    return p.length > 1 ? p.pop().toUpperCase() : '';
}

function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIconSvg(cat) {
    var i = {
        image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        video: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="15" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M17 8l5-3v14l-5-3V8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        audio: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',
        document: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        archive: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 8v13H3V8M1 3h22v5H1V3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 12h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 2v7h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return i[cat] || i.file;
}

function addFiles(files) {
    var ok = [];
    for (var fi = 0; fi < files.length; fi++) {
        if (files[fi].size > MAX_FILE_SIZE) {
            showFileError('"' + files[fi].name + '" exceeds 50 MB.');
            continue;
        }
        ok.push(files[fi]);
    }
    if (!ok.length) return;
    var rem = MAX_FILES - attachments.length;
    if (rem <= 0) {
        showFileError('Max ' + MAX_FILES + ' files.');
        return;
    }
    if (ok.length > rem) showFileError('Only ' + rem + ' more file(s) allowed.');
    var toAdd = ok.slice(0, rem).map(function (file) {
        var cat = getFileCategory(file);
        return {
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            category: cat,
            extension: getExt(file.name),
            preview: (cat === 'image' || cat === 'video') ? URL.createObjectURL(file) : null
        };
    });
    attachments = attachments.concat(toAdd);
    renderAttachments();
}

function removeAttachment(idx) {
    if (attachments[idx] && attachments[idx].preview) URL.revokeObjectURL(attachments[idx].preview);
    attachments.splice(idx, 1);
    renderAttachments();
}

function clearAllAttachments() {
    attachments.forEach(function (a) {
        if (a.preview) URL.revokeObjectURL(a.preview);
    });
    attachments = [];
    renderAttachments();
}
var fileErrorTimer = null;

function showFileError(msg) {
    var ex = document.querySelector('.ci-error');
    if (ex) ex.remove();
    var container = chatInputWrapper.style.display !== 'none' ? chatInputWrapper.querySelector('.ci-container') : document.querySelector('#landingCiWrapper .ci-container');
    if (!container) return;
    var errDiv = document.createElement('div');
    errDiv.className = 'ci-error';
    errDiv.innerHTML = '<span>\u26A0\uFE0F ' + escapeHtml(msg) + '</span><button class="ci-error-x" onclick="this.parentElement.remove()">\u00D7</button>';
    var box = container.querySelector('.ci-box');
    container.insertBefore(errDiv, box);
    clearTimeout(fileErrorTimer);
    fileErrorTimer = setTimeout(function () {
        errDiv.remove();
    }, 4000);
}

function renderAttachments() {
    var strips = [document.getElementById('landingAttachments'), document.getElementById('chatAttachments')];
    var badges = [document.getElementById('landingBadge'), document.getElementById('chatBadge')];
    strips.forEach(function (strip) {
        if (!strip) return;
        if (attachments.length === 0) {
            strip.style.display = 'none';
            strip.innerHTML = '';
            return;
        }
        strip.style.display = 'flex';
        var html = attachments.map(function (att, i) {
            var th;
            if (att.category === 'image' && att.preview) {
                th = '<img src="' + att.preview + '" alt="' + escapeHtml(att.name) + '">';
            } else if (att.category === 'video' && att.preview) {
                th = '<div class="ci-att-vid"><video src="' + att.preview + '" muted preload="metadata"></video><div class="ci-att-play"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></div></div>';
            } else {
                th = '<div class="ci-att-icon" style="color:' + getCategoryColor(att.category) + '">' + fileIconSvg(att.category) + '</div>';
            }
            var eh = att.extension ? '<span class="ci-att-ext" style="background:' + getCategoryColor(att.category) + '22;color:' + getCategoryColor(att.category) + '">' + att.extension + '</span>' : '';
            return '<div class="ci-att-card"><div class="ci-att-thumb">' + th + '</div><div class="ci-att-info"><span class="ci-att-name" title="' + escapeHtml(att.name) + '">' + escapeHtml(att.name) + '</span><div class="ci-att-meta">' + eh + '<span class="ci-att-size">' + fmtSize(att.size) + '</span></div></div><button class="ci-att-rm" onclick="removeAttachment(' + i + ')" title="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
        }).join('');
        if (attachments.length > 1) html += '<button class="ci-att-clear" onclick="clearAllAttachments()">Clear all</button>';
        strip.innerHTML = html;
    });
    badges.forEach(function (badge) {
        if (!badge) return;
        if (attachments.length > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = attachments.length;
        } else {
            badge.style.display = 'none';
        }
    });
    var lta = document.getElementById('landingTextarea');
    var cta = document.getElementById('chatTextarea');
    updateSendBtn('landingSendBtn', lta ? lta.value : '');
    updateSendBtn('chatSendBtn', cta ? cta.value : '');
}

function attachmentsToBase64(list) {
    return Promise.all(list.map(function (att) {
        return new Promise(function (resolve) {
            var r = new FileReader();
            r.onloadend = function () {
                resolve({
                    name: att.name,
                    type: att.type,
                    size: att.size,
                    category: att.category,
                    extension: att.extension,
                    data: r.result
                });
            };
            r.readAsDataURL(att.file);
        });
    }));
}

function buildMenuHTML() {
    var items = [{
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 2v7h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        bg: 'rgba(96,165,250,.12)',
        color: '#60a5fa',
        label: 'Upload file',
        hint: 'Documents, code, data, any file',
        action: "pickFile('any')"
    }, {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        bg: 'rgba(34,109,180,.12)',
        color: '#226DB4',
        label: 'Upload image',
        hint: 'PNG, JPG, GIF, WebP, SVG',
        action: "pickFile('image')"
    }, {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="15" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M17 8l5-3v14l-5-3V8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        bg: 'rgba(244,114,182,.12)',
        color: '#f472b6',
        label: 'Upload video',
        hint: 'MP4, WebM, MOV, AVI',
        action: "pickFile('video')"
    }, {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',
        bg: 'rgba(52,211,153,.12)',
        color: '#34d399',
        label: 'Upload audio',
        hint: 'MP3, WAV, OGG, AAC, FLAC',
        action: "pickFile('audio')"
    }, {
        divider: true
    }, {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',
        bg: 'rgba(251,191,36,.12)',
        color: '#fbbf24',
        label: 'Take a screenshot',
        hint: 'Capture your screen',
        action: 'doScreenshot()'
    }, {
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.8"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        bg: 'rgba(251,191,36,.12)',
        color: '#fbbf24',
        label: 'Paste from clipboard',
        hint: 'Or press Ctrl+V',
        action: 'doClipboard()'
    }];
    return items.map(function (item) {
        if (item.divider) return '<div class="ci-menu-divider"></div>';
        return '<button type="button" class="ci-menu-item" onclick="' + item.action + '"><div class="ci-menu-icon" style="background:' + item.bg + ';color:' + item.color + '">' + item.icon + '</div><div class="ci-menu-text"><span class="ci-menu-label">' + item.label + '</span><span class="ci-menu-hint">' + item.hint + '</span></div></button>';
    }).join('');
}

function toggleMenu(target) {
    var menu = document.getElementById('ciMenu');
    if (menuOpen) {
        closeMenu();
        return;
    }
    activeMenuTarget = target;
    var btnId = target === 'landing' ? 'landingPlusBtn' : 'chatPlusBtn';
    var btn = document.getElementById(btnId);
    if (!btn) return;
    menu.innerHTML = buildMenuHTML();
    menu.style.display = 'block';
    var rect = btn.getBoundingClientRect();
    menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    menu.style.left = rect.left + 'px';
    menuOpen = true;
    btn.classList.add('ci-icon-btn--active');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
}

function closeMenu() {
    var menu = document.getElementById('ciMenu');
    menu.style.display = 'none';
    menuOpen = false;
    ['landingPlusBtn', 'chatPlusBtn'].forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('ci-icon-btn--active');
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
        }
    });
    activeMenuTarget = null;
}

function pickFile(type) {
    var prefix = chatInputWrapper.style.display !== 'none' ? 'chat' : 'landing';
    var map = {
        any: 'FileAny',
        image: 'FileImage',
        video: 'FileVideo',
        audio: 'FileAudio'
    };
    var inp = document.getElementById(prefix + (map[type] || 'FileAny'));
    if (inp) inp.click();
    closeMenu();
}

function doScreenshot() {
    var screenshotPromise = navigator.mediaDevices.getDisplayMedia({
        video: true
    });
    closeMenu();
    screenshotPromise.then(function (stream) {
        var v = document.createElement('video');
        v.srcObject = stream;
        v.play().then(function () {
            var c = document.createElement('canvas');
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0);
            stream.getTracks().forEach(function (t) {
                t.stop();
            });
            c.toBlob(function (b) {
                if (b) addFiles([new File([b], 'screenshot-' + Date.now() + '.png', {
                    type: 'image/png'
                })]);
            }, 'image/png');
        });
    }).catch(function () { });
}

function doClipboard() {
    var clipPromise = navigator.clipboard.read();
    closeMenu();
    clipPromise.then(function (items) {
        var files = [],
            promises = [];
        items.forEach(function (item) {
            item.types.forEach(function (type) {
                if (type !== 'text/plain' && type !== 'text/html') {
                    promises.push(item.getType(type).then(function (blob) {
                        var ext = type.split('/')[1];
                        if (ext) ext = ext.split(';')[0];
                        ext = ext || 'bin';
                        files.push(new File([blob], 'pasted-' + Date.now() + '.' + ext, {
                            type: type
                        }));
                    }).catch(function () { }));
                }
            });
        });
        Promise.all(promises).then(function () {
            if (files.length) addFiles(files);
            else showFileError('No file content in clipboard.');
        });
    }).catch(function () {
        showFileError('Cannot read clipboard. Use Ctrl+V instead.');
    });
}

function setupDragDrop(el) {
    if (!el) return;
    el.addEventListener('dragenter', function (e) {
        e.preventDefault();
        el.classList.add('ci-dragover');
    });
    el.addEventListener('dragleave', function (e) {
        e.preventDefault();
        if (!el.contains(e.relatedTarget)) el.classList.remove('ci-dragover');
    });
    el.addEventListener('dragover', function (e) {
        e.preventDefault();
    });
    el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('ci-dragover');
        var f = Array.from(e.dataTransfer.files);
        if (f.length) addFiles(f);
    });
}

function handlePaste(e) {
    var items = e.clipboardData ? e.clipboardData.items : null;
    if (!items) return;
    var files = [];
    for (var i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            var f = items[i].getAsFile();
            if (f) files.push(f);
        }
    }
    if (files.length) {
        e.preventDefault();
        addFiles(files);
    }
}

var sidebar = document.getElementById('sidebar'),
    sessionList = document.getElementById('sessionList'),
    chatArea = document.getElementById('chatArea'),
    chatLanding = document.getElementById('chatLanding'),
    chatMessages = document.getElementById('chatMessages'),
    messagesList = document.getElementById('messagesList'),
    chatInputWrapper = document.getElementById('chatInputWrapper'),
    stopWrapper = document.getElementById('stopWrapper'),
    landingGreeting = document.getElementById('landingGreeting'),
    profileName = document.getElementById('profileName'),
    profileAvatar = document.getElementById('profileAvatar'),
    mobileTitle = document.getElementById('mobileTitle');

if (user) {
    var fname = user.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1).split(/[\s@._-]/)[0] : '';
    if (landingGreeting && fname) landingGreeting.innerHTML = 'Good to see you, <span class="landing-name">' + escapeHtml(fname) + '</span>';
    if (profileName) profileName.textContent = user.username || 'User';
    if (profileAvatar) profileAvatar.textContent = user.username ? user.username.substring(0, 2).toUpperCase() : 'NA';
}

function apiHeaders() {
    var h = {
        'Content-Type': 'application/json'
    };
    if (token) h['Authorization'] = 'Bearer ' + token;
    if (user && user.user_id) h['X-User-Id'] = String(user.user_id);
    else if (user && user.id) h['X-User-Id'] = String(user.id);
    return h;
}

function apiFetch(path, options) {
    options = options || {};
    return fetch(API_BASE + path, {
        method: options.method || 'GET',
        headers: apiHeaders(),
        body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (res) {
        if (res.status === 401) {
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        if (options.method === 'DELETE') return res;
        if (res.status === 204) return null;
        var ct = res.headers.get('content-type') || '';
        if (!res.ok) {
            if (ct.includes('application/json')) {
                return res.json().then(function (data) {
                    throw new Error(data.error || data.message || 'Server error (' + res.status + ')');
                }).catch(function (parseErr) {
                    if (parseErr.message && parseErr.message.indexOf('Server error') === 0) throw parseErr;
                    throw new Error('Server error (' + res.status + ')');
                });
            }
            throw new Error('Server error (' + res.status + ')');
        }
        if (!ct.includes('application/json')) {
            return null;
        }
        return res.json().then(function (data) {
            if (data.success === false) throw new Error(data.error || 'Request failed');
            return data.data !== undefined ? data.data : data;
        });
    });
}

function fetchSessions() {
    document.getElementById('sessionsLoading').style.display = 'flex';
    return apiFetch('/api/sessions').then(function (data) {
        sessions = Array.isArray(data) ? data : (data && data.sessions ? data.sessions : []);
        renderSessionList();
        if (activeSessionId) {
            var exists = sessions.some(function (s) {
                return String(s.session_id) === String(activeSessionId);
            });
            if (exists) return loadSession(activeSessionId);
            else {
                activeSessionId = null;
                sessionStorage.removeItem('zenith_active_session_id');
                showLanding();
            }
        } else {
            showLanding();
        }
    }).catch(function (err) {
        console.error('Failed to fetch sessions:', err);
        showLanding();
    }).finally(function () {
        document.getElementById('sessionsLoading').style.display = 'none';
    });
}

function createSession() {
    return apiFetch('/api/sessions', {
        method: 'POST',
        body: {
            title: 'New conversation'
        }
    }).then(function (data) {
        sessions.unshift(data);
        renderSessionList();
        return data;
    });
}

function deleteSession(sessionId) {
    return apiFetch('/api/sessions/' + sessionId, {
        method: 'DELETE'
    }).then(function () {
        sessions = sessions.filter(function (s) {
            return String(s.session_id) !== String(sessionId);
        });
        if (String(activeSessionId) === String(sessionId)) {
            activeSessionId = sessions.length > 0 ? sessions[0].session_id : null;
            if (activeSessionId) return loadSession(activeSessionId);
            else showLanding();
        }
        renderSessionList();
    });
}

function loadSession(sessionId) {
    activeSessionId = String(sessionId);
    sessionStorage.setItem('zenith_active_session_id', activeSessionId);
    return apiFetch('/api/messages/' + sessionId).then(function (data) {
        messages = Array.isArray(data) ? data : (data && data.messages ? data.messages : []);
    }).catch(function () {
        messages = [];
    }).then(function () {
        showChat();
        renderMessages();
        renderSessionList();
        scrollToBottom();
    });
}

function renderSessionList() {
    var filtered = searchQuery ? sessions.filter(function (s) {
        return (s.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    }) : sessions;
    filtered.sort(function (a, b) {
        return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
    var rl = document.getElementById('recentsLabel'),
        se = document.getElementById('sessionsEmpty');
    if (filtered.length === 0 && sessions.length === 0) {
        sessionList.innerHTML = '';
        rl.style.display = 'none';
        se.style.display = 'flex';
        return;
    }
    se.style.display = 'none';
    rl.style.display = sessions.length > 0 ? 'block' : 'none';
    sessionList.innerHTML = filtered.map(function (s) {
        var ia = String(s.session_id) === String(activeSessionId);
        return '<li><div class="session-item ' + (ia ? 'session-active' : '') + '" onclick="loadSession(\'' + s.session_id + '\')"><div class="session-info"><span class="session-title">' + escapeHtml(s.title || 'New conversation') + '</span></div><div class="session-actions-right"><button class="session-delete-btn" onclick="event.stopPropagation();deleteSession(\'' + s.session_id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V3h4v1M3 4l.7 8h6.6L11 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div></li>';
    }).join('');
}

function showLanding() {
    chatArea.classList.add('chat-area--empty');
    chatLanding.style.display = 'flex';
    chatMessages.style.display = 'none';
    chatInputWrapper.style.display = 'none';
    stopWrapper.style.display = 'none';
    mobileTitle.textContent = 'Zenith';
    clearAllAttachments();
    closeMenu();
}

function showChat() {
    chatArea.classList.remove('chat-area--empty');
    chatLanding.style.display = 'none';
    chatMessages.style.display = 'block';
    chatInputWrapper.style.display = 'block';
    var session = sessions.find(function (s) {
        return String(s.session_id) === String(activeSessionId);
    });
    mobileTitle.textContent = session ? (session.title || 'Zenith') : 'Zenith';
}

function buildMessageHtml(msg, idx) {
    var isUser = msg.role === 'user',
        isLast = idx === messages.length - 1;
    var timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }) : '';
    if (isUser) {
        var imagesHtml = '';
        if (msg.images && msg.images.length > 0) {
            imagesHtml = '<div class="message-images">' + msg.images.map(function (img) {
                if (img.category === 'image' || (img.type && img.type.startsWith('image/'))) {
                    return '<div class="message-image-wrapper"><img class="message-image" src="' + (img.data || '') + '" alt="' + escapeHtml(img.name || 'image') + '"><span class="message-image-label">' + escapeHtml(img.name || '') + '</span></div>';
                }
                var cat = img.category || 'file',
                    color = getCategoryColor(cat),
                    ext = img.extension || getExt(img.name || '');
                return '<div class="ci-att-card" style="pointer-events:none;margin:2px 0"><div class="ci-att-thumb"><div class="ci-att-icon" style="color:' + color + '">' + fileIconSvg(cat) + '</div></div><div class="ci-att-info"><span class="ci-att-name" title="' + escapeHtml(img.name || '') + '">' + escapeHtml(img.name || 'file') + '</span><div class="ci-att-meta">' + (ext ? '<span class="ci-att-ext" style="background:' + color + '22;color:' + color + '">' + ext + '</span>' : '') + '<span class="ci-att-size">' + fmtSize(img.size || 0) + '</span></div></div></div>';
            }).join('') + '</div>';
        }
        var ub = msg.content ? '<div class="message-bubble message-bubble-user">' + escapeHtml(msg.content) + '</div>' : '';
        var uf = timeStr ? '<div class="message-footer message-footer-user"><span class="message-meta">' + timeStr + '</span></div>' : '';
        return '<div class="message-row message-row-user ' + (isLast ? 'message-last' : '') + '" data-msg-idx="' + idx + '"><div class="message-body message-body-user">' + imagesHtml + ub + uf + '</div><div class="message-avatar message-avatar-user"><svg width="20" height="20" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="11" r="5.5" fill="white" opacity="0.9"/><path d="M5 28.5C5 22.15 9.92 17 16 17C22.08 17 27 22.15 27 28.5" stroke="white" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.85"/></svg></div></div>';
    }
    var html = renderMarkdown(msg.content || '');
    var tc = msg.tool_calls || [];
    var th = '';
    if (tc.length > 0) {
        th = '<div class="claude-activity-summary">' + tc.map(function (t) {
            var cfg = TOOL_SUMMARY[t.tool] || {
                icon: '\uD83D\uDD27',
                label: t.tool
            };
            var done = t.status === 'done';
            return '<div class="claude-activity-indicator ' + (done ? 'claude-activity-done' : 'claude-activity-live') + '">' + (done ? '<span class="claude-tool-status-dot claude-tool-status-dot-ok"></span>' : '<span class="claude-activity-spinner"></span>') + '<span class="claude-activity-icon">' + cfg.icon + '</span><span class="claude-activity-label">' + cfg.label + '</span></div>';
        }).join('') + '</div>';
    }
    var ca = (msg.content || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
    var bc;
    if (msg.isStreaming && !msg.content) {
        bc = '<div class="mb-typing-dots"><span></span><span></span><span></span></div>';
    } else {
        bc = '<div class="message-bubble message-bubble-assistant"><div class="message-content-html">' + html + '</div>' + (msg.isStreaming && msg.content ? '<span class="streaming-cursor"></span>' : '') + '</div>';
    }
    var fc = '';
    if (timeStr && !msg.isStreaming) {
        fc = '<div class="message-footer"><span class="message-meta">' + timeStr + '</span><button class="message-copy-btn" onclick="copyMessage(this)" data-content="' + ca + '" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>';
    }
    return '<div class="message-row message-row-assistant ' + (isLast ? 'message-last' : '') + '" data-msg-idx="' + idx + '"><div class="message-avatar message-avatar-assistant"><img src="images/zenith.png" alt="Zenith" width="24" height="24" style="border-radius:50%;object-fit:cover;"></div><div class="message-body message-body-assistant"><div class="message-sender">Zenith</div>' + th + bc + fc + '</div></div>';
}

function renderMessages() {
    messagesList.innerHTML = messages.map(function (msg, idx) {
        return buildMessageHtml(msg, idx);
    }).join('');
}

function updateLastAssistantMessage() {
    var idx = messages.length - 1;
    if (idx < 0) return;
    var msg = messages[idx];
    var existing = messagesList.querySelector('[data-msg-idx="' + idx + '"]');
    if (!existing) {
        var t = document.createElement('div');
        t.innerHTML = buildMessageHtml(msg, idx);
        if (t.firstElementChild) messagesList.appendChild(t.firstElementChild);
        return;
    }
    if (msg.isStreaming && msg.content) {
        var cn = existing.querySelector('.message-content-html');
        if (cn) {
            cn.innerHTML = renderMarkdown(msg.content);
            var dots = existing.querySelector('.mb-typing-dots');
            if (dots) dots.remove();
            var bubble = existing.querySelector('.message-bubble-assistant');
            if (!bubble) {
                var body = existing.querySelector('.message-body-assistant');
                if (body) {
                    var d2 = body.querySelector('.mb-typing-dots');
                    if (d2) d2.remove();
                    var bd = document.createElement('div');
                    bd.className = 'message-bubble message-bubble-assistant';
                    bd.innerHTML = '<div class="message-content-html">' + renderMarkdown(msg.content) + '</div><span class="streaming-cursor"></span>';
                    var ins = body.querySelector('.claude-activity-summary') || body.querySelector('.message-sender');
                    if (ins && ins.nextSibling) body.insertBefore(bd, ins.nextSibling);
                    else body.appendChild(bd);
                }
            }
            return;
        }
    }
    var t2 = document.createElement('div');
    t2.innerHTML = buildMessageHtml(msg, idx);
    if (t2.firstElementChild) existing.replaceWith(t2.firstElementChild);
}
var _scrollRAF = null;

function scrollToBottom(instant) {
    if (_scrollRAF) return;
    _scrollRAF = requestAnimationFrame(function () {
        _scrollRAF = null;
        var bottom = document.getElementById('messagesBottom');
        if (bottom) bottom.scrollIntoView({
            behavior: instant ? 'instant' : 'smooth'
        });
    });
}

function sendMessage(content, images) {
    images = images || [];
    if ((!content.trim() && images.length === 0) || isStreaming) 
        return;
    console.log(images);
    function doSend() {
        messages.push({
            role: 'user',
            content: content.trim(),
            images: images.length > 0 ? images : undefined,
            created_at: new Date().toISOString()
        });
        messages.push({
            role: 'assistant',
            content: '',
            isStreaming: true,
            tool_calls: []
        });
        renderMessages();
        scrollToBottom();
        isStreaming = true;
        updateStreamingUI();
        var assistantMsg = messages[messages.length - 1];
        var requestBody = {
            message: content.trim()
        };
        if (images.length > 0) 
            requestBody.images = images.map(function (img) {
            return {
                name: img.name,
                type: img.type,
                data: img.data
            };
        });
        abortController = new AbortController();
        fetch(API_BASE + '/api/chat/' + activeSessionId + '/send', {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify(requestBody),
            signal: abortController.signal
        }).then(function (res) {
            if (res.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            if (!res.ok) return res.json().catch(function () {
                return {};
            }).then(function (d) {
                throw new Error(d.error || d.message || 'Chat failed');
            });
            var reader = res.body.getReader(),
                decoder = new TextDecoder(),
                buffer = '',
                currentEvent = '';

            function processStream() {
                return reader.read().then(function (result) {
                    if (result.done) return;
                    buffer += decoder.decode(result.value, {
                        stream: true
                    });
                    buffer = buffer.replace(/\}(event:)/g, '}\n$1');
                    buffer = buffer.replace(/\b(token|tool_start|tool_result|thinking|status|iteration|artifact|done|error)(data:)/g, '$1\n$2');
                    buffer = buffer.replace(/\}(data:)/g, '}\n$1');
                    var lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (var li = 0; li < lines.length; li++) {
                        var trimmed = lines[li].trim();
                        if (!trimmed) {
                            currentEvent = '';
                            continue;
                        }
                        if (trimmed.indexOf('event:') === 0) {
                            currentEvent = trimmed.slice(6).trim();
                            continue;
                        }
                        if (trimmed.indexOf('data:') === 0 && currentEvent) {
                            var jsonStr = trimmed.slice(5).trim();
                            if (!jsonStr) continue;
                            try {
                                var data = JSON.parse(jsonStr);
                                switch (currentEvent) {
                                    case 'token':
                                        assistantMsg.content += (data.content || '');
                                        break;
                                    case 'tool_start':
                                        assistantMsg.tool_calls = assistantMsg.tool_calls || [];
                                        assistantMsg.tool_calls.push({
                                            tool: data.tool,
                                            input: data.input,
                                            status: 'running',
                                            tool_use_id: data.tool_use_id
                                        });
                                        break;
                                    case 'tool_result':
                                        var tc = (assistantMsg.tool_calls || []).find(function (t) {
                                            return t.tool_use_id === data.tool_use_id;
                                        });
                                        if (tc) {
                                            tc.status = 'done';
                                            tc.result = data.result;
                                        }
                                        break;
                                    case 'done':
                                        assistantMsg.isStreaming = false;
                                        assistantMsg.created_at = new Date().toISOString();
                                        if (data.session_title) {
                                            var sess = sessions.find(function (s) {
                                                return String(s.session_id) === String(activeSessionId);
                                            });
                                            if (sess) {
                                                sess.title = data.session_title;
                                                renderSessionList();
                                            }
                                            mobileTitle.textContent = data.session_title;
                                        }
                                        break;
                                    case 'error':
                                        assistantMsg.isStreaming = false;
                                        assistantMsg.isError = true;
                                        assistantMsg.content = data.error || 'An error occurred';
                                        break;
                                }
                            } catch (pe) { }
                            currentEvent = '';
                            updateLastAssistantMessage();
                            scrollToBottom(true);
                        }
                    }
                    return processStream();
                });
            }
            return processStream().then(function () {
                if (buffer.trim()) {
                    var remaining = buffer.replace(/\}(event:)/g, '}\n$1').replace(/\}(data:)/g, '}\n$1');
                    var remLines = remaining.split('\n');
                    for (var ri = 0; ri < remLines.length; ri++) {
                        var tr = remLines[ri].trim();
                        if (tr.indexOf('event:') === 0) currentEvent = tr.slice(6).trim();
                        else if (tr.indexOf('data:') === 0 && currentEvent) {
                            try {
                                var d = JSON.parse(tr.slice(5).trim());
                                if (currentEvent === 'token') assistantMsg.content += (d.content || '');
                                else if (currentEvent === 'done') {
                                    assistantMsg.isStreaming = false;
                                    assistantMsg.created_at = new Date().toISOString();
                                }
                            } catch (e2) { }
                            currentEvent = '';
                        }
                    }
                }
                assistantMsg.isStreaming = false;
                if (!assistantMsg.created_at) assistantMsg.created_at = new Date().toISOString();
            });
        }).catch(function (err) {
            if (err.name !== 'AbortError') {
                assistantMsg.isStreaming = false;
                assistantMsg.isError = true;
                assistantMsg.content = assistantMsg.content || (err.message || 'Failed to generate response');
            } else {
                assistantMsg.isStreaming = false;
            }
        }).finally(function () {
            isStreaming = false;
            abortController = null;
            updateStreamingUI();
            renderMessages();
            scrollToBottom();
        });
    }
    if (!activeSessionId) {
        createSession().then(function (session) {
            activeSessionId = session.session_id;
            sessionStorage.setItem('zenith_active_session_id', activeSessionId);
            showChat();
            doSend();
        });
    } else {
        doSend();
    }
}

function cancelStream() {
    if (abortController) abortController.abort();
}

function updateStreamingUI() {
    stopWrapper.style.display = isStreaming ? 'flex' : 'none';
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMarkdown(text) {
    if (!text) return '';
    var h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, function (match, lang, code) {
        var ll = lang ? '<span class="code-lang">' + lang + '</span>' : '';
        return '<div class="code-block-wrapper">' + ll + '<pre class="code-block"><code>' + code.trim() + '</code></pre></div>';
    });
    h = h.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
    h = h.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>.*<\/li>\n?)+/g, function (m) {
        return '<ul class="md-list">' + m + '</ul>';
    });
    h = h.replace(/\n\n/g, '</p><p class="md-p">');
    if (h.indexOf('<h') !== 0 && h.indexOf('<ul') !== 0 && h.indexOf('<pre') !== 0 && h.indexOf('<div') !== 0) h = '<p class="md-p">' + h + '</p>';
    return h;
}

function copyMessage(btn) {
    var text = (btn.getAttribute('data-content') || '').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    navigator.clipboard.writeText(text).then(function () {
        btn.classList.add('message-copy-btn--copied');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        setTimeout(function () {
            btn.classList.remove('message-copy-btn--copied');
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
        }, 2000);
    });
}
var TOOL_SUMMARY = {
    web_search: {
        icon: '\uD83C\uDF10',
        label: 'Searched the web'
    },
    web_fetch: {
        icon: '\uD83C\uDF10',
        label: 'Searched the web'
    },
    execute_code: {
        icon: '\u26A1',
        label: 'Executed code'
    },
    execute_command: {
        icon: '\u26A1',
        label: 'Ran a command'
    },
    create_project: {
        icon: '\uD83D\uDCC1',
        label: 'Created a project'
    },
    create_file: {
        icon: '\uD83D\uDCC4',
        label: 'Created files'
    },
    read_file: {
        icon: '\uD83D\uDCD6',
        label: 'Read files'
    },
    update_file: {
        icon: '\u270F\uFE0F',
        label: 'Updated files'
    },
    schedule_task: {
        icon: '\u23F0',
        label: 'Scheduled a task'
    },
    list_files: {
        icon: '\uD83D\uDCC2',
        label: 'Listed files'
    },
    browser_launch: {
        icon: '\uD83D\uDDA5\uFE0F',
        label: 'Used browser'
    },
    memory_store: {
        icon: '\uD83E\uDDE0',
        label: 'Used memory'
    }
};
document.addEventListener('DOMContentLoaded', function () {
    fetchSessions();
    document.getElementById('newChatBtn').addEventListener('click', function () {
        activeSessionId = null;
        sessionStorage.removeItem('zenith_active_session_id');
        messages = [];
        showLanding();
        renderSessionList();
        closeMobileSidebar();
    });
    var esb = document.getElementById('emptyStartBtn');
    if (esb) esb.addEventListener('click', function () {
        var ta = document.getElementById('landingTextarea');
        if (ta) ta.focus();
    });
    var sc = document.getElementById('searchContainer');
    document.getElementById('searchBtn').addEventListener('click', function () {
        var v = sc.style.display !== 'none';
        sc.style.display = v ? 'none' : 'block';
        if (!v) document.getElementById('searchInput').focus();
        else {
            searchQuery = '';
            document.getElementById('searchInput').value = '';
            renderSessionList();
        }
    });
    document.getElementById('searchInput').addEventListener('input', function (e) {
        searchQuery = e.target.value;
        document.getElementById('searchClear').style.display = searchQuery ? 'block' : 'none';
        renderSessionList();
    });
    document.getElementById('searchClear').addEventListener('click', function () {
        searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('searchClear').style.display = 'none';
        renderSessionList();
    });
    document.querySelectorAll('.sidebar-nav-btn[data-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.sidebar-nav-btn[data-tab]').forEach(function (b) {
                b.classList.remove('sidebar-nav-active');
            });
            btn.classList.add('sidebar-nav-active');
            document.getElementById('tasksPanel').style.display = currentTab === 'tasks' ? 'block' : 'none';
            [document.getElementById('recentsLabel'), sessionList, document.getElementById('sessionsEmpty')].forEach(function (el) {
                if (el) el.style.display = currentTab === 'chats' ? '' : 'none';
            });
        });
    });
    document.getElementById('collapseBtn').addEventListener('click', function () {
        sidebarCollapsed = !sidebarCollapsed;
        sidebar.classList.toggle('sidebar-collapsed', sidebarCollapsed);
        document.getElementById('chatMain').classList.toggle('chat-main-expanded', sidebarCollapsed);
        document.getElementById('sidebarBrandText').style.display = sidebarCollapsed ? 'none' : '';
        document.getElementById('sidebarActions').style.display = sidebarCollapsed ? 'none' : '';
        document.getElementById('sidebarNav').style.display = sidebarCollapsed ? 'none' : '';
        document.getElementById('sidebarContent').style.display = sidebarCollapsed ? 'none' : '';
    });
    document.getElementById('landingInputForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var ta = document.getElementById('landingTextarea');
        var txt = ta.value;
        if (attachments.length) {
            attachmentsToBase64(attachments).then(function (imgs) {
                clearAllAttachments();
                sendMessage(txt, imgs);
            });
        } else {
            sendMessage(txt, []);
        }
        ta.value = '';
        ta.style.height = 'auto';
        updateSendBtn('landingSendBtn', '');
        closeMenu();
    });
    document.getElementById('chatInputForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var ta = document.getElementById('chatTextarea');
        var txt = ta.value;
        if (attachments.length) {
            attachmentsToBase64(attachments).then(function (imgs) {
                clearAllAttachments();
                sendMessage(txt, imgs);
            });
        } else {
            sendMessage(txt, []);
        }
        ta.value = '';
        ta.style.height = 'auto';
        updateSendBtn('chatSendBtn', '');
        closeMenu();
    });
    ['landingTextarea', 'chatTextarea'].forEach(function (id) {
        var ta = document.getElementById(id);
        if (!ta) return;
        var btnId = id === 'landingTextarea' ? 'landingSendBtn' : 'chatSendBtn';
        ta.addEventListener('input', function () {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
            updateSendBtn(btnId, ta.value);
        });
        ta.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ta.closest('form').dispatchEvent(new Event('submit', {
                    bubbles: true,
                    cancelable: true
                }));
            }
        });
        ta.addEventListener('paste', handlePaste);
    });
    var lp = document.getElementById('landingPlusBtn');
    if (lp) lp.addEventListener('click', function () {
        toggleMenu('landing');
    });
    var cp = document.getElementById('chatPlusBtn');
    if (cp) cp.addEventListener('click', function () {
        toggleMenu('chat');
    });
    ['landingFileAny', 'landingFileImage', 'landingFileVideo', 'landingFileAudio', 'chatFileAny', 'chatFileImage', 'chatFileVideo', 'chatFileAudio'].forEach(function (id) {
        var inp = document.getElementById(id);
        if (!inp) return;
        inp.addEventListener('change', function (e) {
            if (e.target.files && e.target.files.length) addFiles(Array.from(e.target.files));
            e.target.value = '';
        });
    });
    setupDragDrop(document.getElementById('landingCiWrapper'));
    setupDragDrop(document.getElementById('chatInputWrapper'));
    document.addEventListener('mousedown', function (e) {
        if (!menuOpen) return;
        var menu = document.getElementById('ciMenu');
        var lb = document.getElementById('landingPlusBtn');
        var cb = document.getElementById('chatPlusBtn');
        if (menu && !menu.contains(e.target) && (!lb || !lb.contains(e.target)) && (!cb || !cb.contains(e.target))) closeMenu();
    });
    document.getElementById('stopBtn').addEventListener('click', cancelStream);
    var mmb = document.getElementById('mobileMenuBtn');
    if (mmb) mmb.addEventListener('click', openMobileSidebar);
    var mo = document.getElementById('mobileOverlay');
    if (mo) mo.addEventListener('click', closeMobileSidebar);
    initProfileMenu();
});

/* ═══════════════════════════════════════════════════════════
   PROFILE MENU — popup + modals (Profile, Settings, Help)
   ═══════════════════════════════════════════════════════════ */
function initProfileMenu() {
    var pmUser = getUser();
    var pmInitials = (pmUser && pmUser.username) ? pmUser.username.substring(0, 2).toUpperCase() : 'NA';
    var pmName = (pmUser && pmUser.username) ? pmUser.username : 'User';
    var pmEmail = (pmUser && pmUser.email) ? pmUser.email : 'user@example.com';

    /* ── Populate user info in all locations ── */
    var avatarEls = ['profileAvatar', 'pmMenuAvatar', 'pmMenuItemAvatar', 'pmProfileAvatarLarge'];
    avatarEls.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = pmInitials;
    });
    var el;
    el = document.getElementById('profileName'); if (el) el.textContent = pmName;
    el = document.getElementById('pmMenuName'); if (el) el.textContent = pmName;
    el = document.getElementById('pmMenuHandle'); if (el) el.textContent = '@' + pmName;
    el = document.getElementById('pmDisplayName'); if (el) el.value = pmName;
    el = document.getElementById('pmUsername'); if (el) el.value = pmName;
    el = document.getElementById('pmAccountEmail'); if (el) el.textContent = pmEmail;
    el = document.getElementById('pmAccountUsername'); if (el) el.textContent = '@' + pmName;

    /* ── State ── */
    var pmMenuOpen = false;
    var pmActiveModal = null; // 'profile' | 'settings' | 'help' | 'upgrade'
    var pmSettingsTab = 'personalization';
    var pmProfileSaved = false;

    /* ── Connector catalogue ── */
    var PM_CONNECTORS = [
        { id: 'zoho', name: 'Zoho', desc: 'Zoho suite — CRM, Cliq, Projects, Meeting & more', type: 'zoho', docsUrl: 'https://www.zoho.com/developer/help/api-overview.html' },
        { id: 'github', name: 'GitHub', desc: 'Code hosting & version control', type: 'others', authType: 'header', icon: 'github', docsUrl: 'https://docs.github.com/en/rest' },
        { id: 'google_drive', name: 'Google Drive', desc: 'Cloud storage & file sharing', type: 'others', icon: 'gdrive', docsUrl: 'https://developers.google.com/drive/api' },
        { id: 'slack', name: 'Slack', desc: 'Messaging & workflow automation', type: 'others', icon: 'slack', docsUrl: 'https://api.slack.com/methods' },
        { id: 'jira', name: 'Jira', desc: 'Project & issue tracking', type: 'others', icon: 'jira', docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/' }
    ];
    var pmConnectedIds = [];
    var pmConnectingId = null;
    var pmConnectorForms = {};
    var pmConnectorSaved = null;
    var pmApiReferOpen = {};

    /* ── Connector icon SVGs ── */
    function connectorIconSvg(icon) {
        switch (icon) {
            case 'github':
                return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/></svg>';
            case 'gdrive':
                return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8.267 14.68l-1.6 2.769H16.8l1.6-2.769H8.267z" fill="#3777E3"/><path d="M15.467 5.232H8.533L2 16.68l1.6 2.769L10.133 7.999l5.334.001z" fill="#FFCF63"/><path d="M21.6 16.68L15.467 5.232l-5.334-.001L16.4 16.68h5.2z" fill="#11A861"/></svg>';
            case 'slack':
                return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.194 14.644a1.903 1.903 0 01-1.902 1.903 1.903 1.903 0 01-1.903-1.903 1.903 1.903 0 011.903-1.902h1.902v1.902zm.957 0a1.903 1.903 0 011.902-1.902 1.903 1.903 0 011.903 1.902v4.762a1.903 1.903 0 01-1.903 1.903 1.903 1.903 0 01-1.902-1.903v-4.762z" fill="#E01E5A"/><path d="M9.053 6.194a1.903 1.903 0 01-1.902-1.902 1.903 1.903 0 011.902-1.903 1.903 1.903 0 011.903 1.903v1.902H9.053zm0 .963a1.903 1.903 0 011.903 1.902 1.903 1.903 0 01-1.903 1.903H4.29a1.903 1.903 0 01-1.903-1.903 1.903 1.903 0 011.903-1.902h4.762z" fill="#36C5F0"/><path d="M17.806 9.06a1.903 1.903 0 011.902-1.903A1.903 1.903 0 0121.612 9.06a1.903 1.903 0 01-1.903 1.902h-1.903V9.059zm-.957 0a1.903 1.903 0 01-1.903 1.902 1.903 1.903 0 01-1.902-1.903V4.29a1.903 1.903 0 011.902-1.903 1.903 1.903 0 011.903 1.903V9.06z" fill="#2EB67D"/><path d="M14.946 17.806a1.903 1.903 0 011.903 1.902 1.903 1.903 0 01-1.903 1.903 1.903 1.903 0 01-1.902-1.903v-1.902h1.902zm0-.957a1.903 1.903 0 01-1.902-1.903 1.903 1.903 0 011.902-1.902h4.762a1.903 1.903 0 011.903 1.902 1.903 1.903 0 01-1.903 1.903h-4.762z" fill="#ECB22E"/></svg>';
            case 'jira':
                return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12.005 2L5.235 8.77l3.18 3.18L12.005 8.36l3.59 3.59 3.18-3.18L12.005 2z" fill="#2684FF"/><path d="M8.415 11.95L5.235 15.13 12.005 21.9l6.77-6.77-3.18-3.18-3.59 3.59-3.59-3.59z" fill="#2684FF"/><path d="M12.005 8.36L8.415 11.95l3.59 3.59 3.59-3.59-3.59-3.59z" fill="#2684FF" fill-opacity="0.4"/></svg>';
            default:
                return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        }
    }

    function getDefaultFormFields(conn) {
        if (conn && conn.type === 'zoho') return { client_id: '', client_secret: '', redirect_url: '' };
        if (conn && conn.authType === 'header') return { api_key: '', header_type: '' };
        return { api_key: '', provider: '', header_type: '' };
    }

    /* ── DOM references ── */
    var pmTrigger = document.getElementById('profileTrigger');
    var pmMenuOverlay = document.getElementById('pmMenuOverlay');
    var pmPopup = document.getElementById('pmPopupMenu');

    /* ── Toggle popup menu ── */
    function openPmMenu() {
        if (!pmTrigger) return;
        var rect = pmTrigger.getBoundingClientRect();
        pmPopup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
        pmPopup.style.left = rect.left + 'px';
        pmMenuOverlay.style.display = '';
        /* Re-trigger slide-up animation */
        pmPopup.style.animation = 'none';
        pmPopup.offsetHeight; /* force reflow */
        pmPopup.style.animation = '';
        pmMenuOpen = true;
    }

    function closePmMenu() {
        pmMenuOverlay.style.display = 'none';
        pmMenuOpen = false;
    }

    if (pmTrigger) {
        pmTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (pmMenuOpen) closePmMenu();
            else openPmMenu();
        });
    }

    /* Close menu on outside click */
    if (pmMenuOverlay) {
        pmMenuOverlay.addEventListener('mousedown', function (e) {
            if (pmPopup && !pmPopup.contains(e.target)) closePmMenu();
        });
    }

    /* ── Open / close modals ── */
    function openPmModal(name) {
        closePmMenu();
        pmActiveModal = name;
        var overlays = { profile: 'pmProfileOverlay', settings: 'pmSettingsOverlay', help: 'pmHelpOverlay', upgrade: 'pmUpgradeOverlay' };
        var ov = document.getElementById(overlays[name]);
        if (ov) {
            ov.style.display = '';
            /* Re-trigger fade-in animation */
            ov.style.animation = 'none';
            ov.offsetHeight;
            ov.style.animation = '';
            var modal = ov.querySelector('.pm-modal');
            if (modal) {
                modal.style.animation = 'none';
                modal.offsetHeight;
                modal.style.animation = '';
            }
        }
        if (name === 'settings') {
            pmSettingsTab = 'personalization';
            switchSettingsTab('personalization');
        }
        if (name === 'profile') {
            pmProfileSaved = false;
            document.getElementById('pmProfileSave').textContent = 'Save';
        }
    }

    function closePmModal() {
        var ids = ['pmProfileOverlay', 'pmSettingsOverlay', 'pmHelpOverlay', 'pmUpgradeOverlay'];
        ids.forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = 'none'; });
        pmActiveModal = null;
    }

    /* Escape key */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (pmActiveModal) closePmModal();
            else if (pmMenuOpen) closePmMenu();
        }
    });

    /* Modal overlay click to close */
    ['pmProfileOverlay', 'pmSettingsOverlay', 'pmHelpOverlay', 'pmUpgradeOverlay'].forEach(function (id) {
        var ov = document.getElementById(id);
        if (!ov) return;
        ov.addEventListener('mousedown', function (e) {
            if (e.target === ov) closePmModal();
        });
    });

    /* Prevent click propagation inside modals */
    ['pmProfileModal', 'pmSettingsModal', 'pmHelpModal', 'pmUpgradeModal'].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) m.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    });

    /* ── Menu item handlers ── */
    document.getElementById('pmBtnProfile').addEventListener('click', function () { openPmModal('profile'); });
    document.getElementById('pmBtnSettings').addEventListener('click', function () { openPmModal('settings'); });
    document.getElementById('pmBtnHelp').addEventListener('click', function () { openPmModal('help'); });
    document.getElementById('pmBtnLogout').addEventListener('click', function () {
        closePmMenu();
        removeCookie('zenith_token');
        removeCookie('zenith_user');
        sessionStorage.removeItem('zenith_active_session_id');
        window.location.href = 'login.html';
    });

    /* ── Close buttons ── */
    document.getElementById('pmSettingsClose').addEventListener('click', closePmModal);
    document.getElementById('pmHelpClose').addEventListener('click', closePmModal);
    document.getElementById('pmUpgradeClose').addEventListener('click', closePmModal);
    document.getElementById('pmProfileCancel').addEventListener('click', closePmModal);

    /* ── Profile save ── */
    document.getElementById('pmProfileSave').addEventListener('click', function () {
        var btn = this;
        btn.textContent = '✓ Saved';
        pmProfileSaved = true;
        setTimeout(function () { btn.textContent = 'Save'; pmProfileSaved = false; }, 2000);
    });

    /* ── Settings tabs ── */
    function switchSettingsTab(tab) {
        pmSettingsTab = tab;
        ['personalization', 'connectors', 'account'].forEach(function (t) {
            var panel = document.getElementById('pmPanel' + t.charAt(0).toUpperCase() + t.slice(1));
            var btn = document.getElementById('pmTab' + t.charAt(0).toUpperCase() + t.slice(1));
            if (panel) panel.style.display = (t === tab) ? '' : 'none';
            if (btn) {
                if (t === tab) btn.classList.add('pm-settings-tab-active');
                else btn.classList.remove('pm-settings-tab-active');
            }
        });
        if (tab === 'connectors') renderConnectors();
    }

    document.getElementById('pmTabPersonalization').addEventListener('click', function () { switchSettingsTab('personalization'); });
    document.getElementById('pmTabConnectors').addEventListener('click', function () { switchSettingsTab('connectors'); });
    document.getElementById('pmTabAccount').addEventListener('click', function () { switchSettingsTab('account'); });

    /* ── Personalization textarea counter ── */
    var pmPText = document.getElementById('pmPersonalizationText');
    var pmPCount = document.getElementById('pmPersonalizationCount');
    if (pmPText && pmPCount) {
        pmPText.addEventListener('input', function () {
            pmPCount.textContent = pmPText.value.length + '/1500 characters';
        });
    }

    /* ── Connectors rendering ── */
    function renderConnectors() {
        var list = document.getElementById('pmConnectorsList');
        if (!list) return;
        var html = '';
        PM_CONNECTORS.forEach(function (conn) {
            var isConnected = pmConnectedIds.indexOf(conn.id) !== -1;
            var isFormOpen = pmConnectingId === conn.id;
            var justSaved = pmConnectorSaved === conn.id;
            var isApiOpen = !!pmApiReferOpen[conn.id];
            var form = pmConnectorForms[conn.id] || getDefaultFormFields(conn);

            var blurCls = (!isConnected && !isFormOpen) ? ' pm-connector-logo-blurred' : '';
            var infoBlurCls = (!isConnected && !isFormOpen) ? ' pm-connector-info-blurred' : '';
            var cardCls = 'pm-connector-card';
            if (isConnected) cardCls += ' pm-connector-connected';
            else cardCls += ' pm-connector-disconnected';
            if (isFormOpen) cardCls += ' pm-connector-expanded';

            var logoHtml = '';
            if (conn.type === 'zoho') {
                logoHtml = '<img src="images/ZenithLogo.webp" alt="Zoho">';
            } else {
                logoHtml = connectorIconSvg(conn.icon);
            }

            /* Actions */
            var actionsHtml = '';
            if (isConnected) {
                actionsHtml = '<span class="pm-connector-badge"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Connected</span>' +
                    '<button class="pm-btn pm-btn-sm pm-btn-disconnect" data-conn-disconnect="' + conn.id + '">Disconnect</button>';
            } else if (isFormOpen) {
                actionsHtml = '<button class="pm-btn pm-btn-sm pm-btn-cancel" data-conn-cancel="' + conn.id + '">Cancel</button>';
            } else {
                actionsHtml = '<button class="pm-btn pm-btn-sm pm-btn-connect" data-conn-connect="' + conn.id + '">Connect</button>';
            }

            html += '<div class="' + cardCls + '" data-conn-id="' + conn.id + '">';
            html += '<div class="pm-connector-row">';
            html += '<div class="pm-connector-logo' + blurCls + '">' + logoHtml + '</div>';
            html += '<div class="pm-connector-info' + infoBlurCls + '"><span class="pm-connector-name">' + conn.name + '</span><span class="pm-connector-desc">' + conn.desc + '</span></div>';
            html += '<div class="pm-connector-actions">' + actionsHtml + '</div>';
            html += '</div>';

            /* Expanded form */
            if (isFormOpen) {
                html += '<div class="pm-connector-form">';
                html += '<div class="pm-connector-form-divider"></div>';
                html += '<div class="pm-connector-form-body">';

                var clockSvg = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v5l3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/></svg>';

                if (conn.type === 'zoho') {
                    html += '<p class="pm-connector-form-title">' + clockSvg + ' Zoho OAuth Credentials</p>';
                    html += '<div class="pm-connector-fields-grid">';
                    html += '<div class="pm-form-group"><label class="pm-form-label">Client ID <span class="pm-field-required">*</span></label><input type="text" class="pm-form-input" data-conn-field="' + conn.id + '.client_id" placeholder="Enter Client ID" value="' + (form.client_id || '') + '"></div>';
                    html += '<div class="pm-form-group"><label class="pm-form-label">Client Secret <span class="pm-field-required">*</span></label><input type="password" class="pm-form-input" data-conn-field="' + conn.id + '.client_secret" placeholder="Enter Client Secret" value="' + (form.client_secret || '') + '"></div>';
                    html += '<div class="pm-form-group pm-form-group-full"><label class="pm-form-label">Redirect URL <span class="pm-field-required">*</span></label><input type="url" class="pm-form-input" data-conn-field="' + conn.id + '.redirect_url" placeholder="https://yourdomain.com/callback" value="' + (form.redirect_url || '') + '"></div>';
                    html += '</div>';
                } else if (conn.authType === 'header') {
                    html += '<p class="pm-connector-form-title">' + clockSvg + ' API Credentials (Header Auth)</p>';
                    html += '<div class="pm-connector-fields-grid">';
                    html += '<div class="pm-form-group pm-form-group-full"><label class="pm-form-label">API Key <span class="pm-field-required">*</span></label><input type="password" class="pm-form-input" data-conn-field="' + conn.id + '.api_key" placeholder="Enter API Key" value="' + (form.api_key || '') + '"></div>';
                    html += '<div class="pm-form-group pm-form-group-full"><label class="pm-form-label">Header Type <span class="pm-field-required">*</span></label><input type="text" class="pm-form-input" data-conn-field="' + conn.id + '.header_type" placeholder="e.g. Bearer, token" value="' + (form.header_type || '') + '"></div>';
                    html += '</div>';
                } else {
                    html += '<p class="pm-connector-form-title">' + clockSvg + ' API Credentials</p>';
                    html += '<div class="pm-connector-fields-grid">';
                    html += '<div class="pm-form-group pm-form-group-full"><label class="pm-form-label">API Key <span class="pm-field-required">*</span></label><input type="password" class="pm-form-input" data-conn-field="' + conn.id + '.api_key" placeholder="Enter API Key" value="' + (form.api_key || '') + '"></div>';
                    html += '<div class="pm-form-group"><label class="pm-form-label">Provider</label><input type="text" class="pm-form-input" data-conn-field="' + conn.id + '.provider" placeholder="e.g. ' + conn.name.toLowerCase() + '" value="' + (form.provider || '') + '"></div>';
                    html += '<div class="pm-form-group"><label class="pm-form-label">Header Type</label><input type="text" class="pm-form-input" data-conn-field="' + conn.id + '.header_type" placeholder="e.g. Bearer" value="' + (form.header_type || '') + '"></div>';
                    html += '</div>';
                }

                html += '</div>'; /* end form-body */

                /* API Reference section */
                html += '<div class="pm-api-refer">';
                html += '<button class="pm-api-refer-toggle" data-conn-apiref="' + conn.id + '">';
                html += '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v4M7 10v.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
                html += ' API Reference ';
                html += '<svg class="pm-api-refer-chevron' + (isApiOpen ? ' pm-api-refer-chevron-open' : '') + '" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                html += '</button>';
                if (isApiOpen) {
                    html += '<div class="pm-api-refer-content">';
                    html += '<p>Refer to the official API documentation for authentication details and available endpoints:</p>';
                    html += '<a href="' + conn.docsUrl + '" target="_blank" rel="noopener noreferrer" class="pm-api-refer-link">';
                    html += '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 2.5H3a1 1 0 00-1 1v7.5a1 1 0 001 1h7.5a1 1 0 001-1V8.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M8 2h4v4M7 7l5-5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                    html += ' ' + conn.name + ' API Documentation</a>';
                    html += '<div class="pm-api-refer-note"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v4l2.5 2.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.1"/></svg>';
                    html += (conn.type === 'zoho') ? 'Generate OAuth credentials from the Zoho API Console and paste them above.' : "Generate an API key from your provider's dashboard and paste it above.";
                    html += '</div></div>';
                }
                html += '</div>'; /* end api-refer */

                /* Save button */
                var disabled = '';
                if (conn.type === 'zoho') {
                    if (!(form.client_id || '').trim() || !(form.client_secret || '').trim() || !(form.redirect_url || '').trim()) disabled = ' disabled';
                } else if (conn.authType === 'header') {
                    if (!(form.api_key || '').trim() || !(form.header_type || '').trim()) disabled = ' disabled';
                } else {
                    if (!(form.api_key || '').trim()) disabled = ' disabled';
                }
                html += '<div class="pm-connector-form-actions"><button class="pm-btn pm-btn-save pm-btn-sm" data-conn-save="' + conn.id + '"' + disabled + '>' + (justSaved ? '✓ Connected' : 'Save &amp; Connect') + '</button></div>';
                html += '</div>'; /* end pm-connector-form */
            }

            html += '</div>'; /* end card */
        });

        list.innerHTML = html;

        /* Event delegation for connector actions */
        list.querySelectorAll('[data-conn-connect]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cid = this.getAttribute('data-conn-connect');
                var c = PM_CONNECTORS.filter(function (x) { return x.id === cid; })[0];
                if (!pmConnectorForms[cid]) pmConnectorForms[cid] = getDefaultFormFields(c);
                pmConnectingId = cid;
                renderConnectors();
            });
        });
        list.querySelectorAll('[data-conn-cancel]').forEach(function (btn) {
            btn.addEventListener('click', function () { pmConnectingId = null; renderConnectors(); });
        });
        list.querySelectorAll('[data-conn-disconnect]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cid = this.getAttribute('data-conn-disconnect');
                pmConnectedIds = pmConnectedIds.filter(function (id) { return id !== cid; });
                delete pmConnectorForms[cid];
                renderConnectors();
            });
        });
        list.querySelectorAll('[data-conn-field]').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var parts = this.getAttribute('data-conn-field').split('.');
                var cid = parts[0], field = parts[1];
                if (!pmConnectorForms[cid]) pmConnectorForms[cid] = {};
                pmConnectorForms[cid][field] = this.value;
                /* Re-check disabled state of save button */
                var saveBtn = list.querySelector('[data-conn-save="' + cid + '"]');
                if (saveBtn) {
                    var c = PM_CONNECTORS.filter(function (x) { return x.id === cid; })[0];
                    var f = pmConnectorForms[cid] || {};
                    var dis = false;
                    if (c.type === 'zoho') dis = !(f.client_id || '').trim() || !(f.client_secret || '').trim() || !(f.redirect_url || '').trim();
                    else if (c.authType === 'header') dis = !(f.api_key || '').trim() || !(f.header_type || '').trim();
                    else dis = !(f.api_key || '').trim();
                    saveBtn.disabled = dis;
                }
            });
        });
        list.querySelectorAll('[data-conn-apiref]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cid = this.getAttribute('data-conn-apiref');
                pmApiReferOpen[cid] = !pmApiReferOpen[cid];
                renderConnectors();
            });
        });
        list.querySelectorAll('[data-conn-save]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cid = this.getAttribute('data-conn-save');
                if (pmConnectedIds.indexOf(cid) === -1) pmConnectedIds.push(cid);
                pmConnectorSaved = cid;
                renderConnectors();
                setTimeout(function () { pmConnectorSaved = null; pmConnectingId = null; renderConnectors(); }, 1500);
            });
        });
    }
}

function updateSendBtn(btnId, value) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    var hasContent = value.trim().length > 0 || attachments.length > 0;
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
