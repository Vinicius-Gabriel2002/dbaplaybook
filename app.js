(() => {
  // ── CONFIG ─────────────────────────────────────────────────────────────
  const ADMIN_PASSWORD = 'Migra#0996';
  const GITHUB_USER    = 'Vinicius-Gabriel2002';
  const GITHUB_REPO    = 'dbaplaybook';
  const GITHUB_FILE    = 'content.js';
  // ───────────────────────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);

  const sidebar       = $('sidebar');
  const overlay       = $('overlay');
  const menuBtn       = $('menuBtn');
  const sidebarToggle = $('sidebarToggle');
  const searchInput   = $('searchInput');
  const searchClear   = $('searchClear');
  const navEl         = $('nav');
  const welcome       = $('welcome');
  const topicView     = $('topicView');
  const searchResults = $('searchResults');
  const welcomeCards  = $('welcomeCards');
  const themeToggle   = $('themeToggle');
  const backBtn       = $('backBtn');

  let activeTopicId = null;
  let activeCatId   = null;
  let isAdmin       = false;

  // ── THEME ──
  const savedTheme = localStorage.getItem('dba-theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('dba-theme', next);
  });

  // ── BACK BUTTON ──
  backBtn.addEventListener('click', () => showWelcomeScreen());
  function setBackBtn(visible) { backBtn.classList.toggle('hidden', !visible); }

  // ── ADMIN SESSION ──
  function checkAdminSession() {
    try {
      const s = JSON.parse(localStorage.getItem('dba-admin-session') || 'null');
      return s && s.expires > Date.now();
    } catch { return false; }
  }
  function saveAdminSession() {
    localStorage.setItem('dba-admin-session',
      JSON.stringify({ expires: Date.now() + 24 * 60 * 60 * 1000 }));
  }
  function clearAdminSession() {
    localStorage.removeItem('dba-admin-session');
  }

  // ── GITHUB COMMIT (via Vercel serverless function) ──
  async function commitToGithub() {
    const content = `const CONTENT = ${JSON.stringify(CONTENT, null, 2)};\n`;
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD, content })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao publicar no GitHub.');
    }
  }

  // ── TOAST ──
  function showToast(msg, type = 'success') {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast toast-${type}`;
    t.classList.remove('hidden');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.add('hidden'), 4000);
  }

  // ── USER DATA (localStorage) ──
  function getUserData() {
    try {
      return JSON.parse(localStorage.getItem('dba-user-data') ||
        '{"customTopics":[],"editedTopics":{},"deletedIds":[]}');
    } catch { return { customTopics: [], editedTopics: {}, deletedIds: [] }; }
  }
  function saveUserData(data) {
    localStorage.setItem('dba-user-data', JSON.stringify(data));
  }

  // ── MERGE CONTENT ──
  function mergeContent() {
    const { customTopics, editedTopics, deletedIds } = getUserData();
    CONTENT.categories.forEach(cat => {
      cat.topics = cat.topics
        .filter(t => !deletedIds.includes(t.id))
        .map(t => editedTopics[t.id] ? { ...t, ...editedTopics[t.id] } : t);
      customTopics
        .filter(c => c.catId === cat.id && !deletedIds.includes(c.topic.id))
        .forEach(c => cat.topics.push(editedTopics[c.topic.id] || c.topic));
    });
  }

  // ── BUILD NAV ──
  function buildNav() {
    navEl.innerHTML = '';
    CONTENT.categories.forEach(cat => {
      const catEl = document.createElement('div');
      catEl.className = 'nav-category';

      const header = document.createElement('div');
      header.className = 'nav-category-header';
      header.innerHTML = `
        <span class="nav-dot" style="background:${cat.color}"></span>
        ${cat.name}
        <span class="nav-chevron">&#9660;</span>
      `;
      header.addEventListener('click', () => catEl.classList.toggle('collapsed'));

      const items = document.createElement('div');
      items.className = 'nav-items';

      cat.topics.forEach(topic => {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.textContent = topic.title;
        item.dataset.topicId = topic.id;
        item.addEventListener('click', () => { showTopic(cat.id, topic.id); closeSidebar(); });
        items.appendChild(item);
      });

      if (isAdmin) {
        const addBtn = document.createElement('button');
        addBtn.className = 'nav-add-btn';
        addBtn.textContent = '+ Novo tópico';
        addBtn.addEventListener('click', e => { e.stopPropagation(); openModal(cat.id, null); });
        items.appendChild(addBtn);
      }

      catEl.appendChild(header);
      catEl.appendChild(items);
      navEl.appendChild(catEl);
    });

    }

  // ── BUILD WELCOME ──
  function buildWelcome() {
    welcomeCards.innerHTML = '';
    CONTENT.categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'welcome-card';
      card.innerHTML = `
        <div class="welcome-card-dot" style="background:${cat.color}"></div>
        <h3>${cat.name}</h3>
        <p>${cat.topics.length} tópico${cat.topics.length !== 1 ? 's' : ''}</p>
      `;
      card.addEventListener('click', () => showTopic(cat.id, cat.topics[0].id));
      welcomeCards.appendChild(card);
    });
  }

  // ── SHOW TOPIC ──
  function showTopic(catId, topicId) {
    const cat   = CONTENT.categories.find(c => c.id === catId);
    const topic = cat?.topics.find(t => t.id === topicId);
    if (!cat || !topic) return;

    activeTopicId = topicId;
    activeCatId   = catId;
    searchInput.value = '';
    searchClear.classList.remove('visible');

    welcome.classList.add('hidden');
    searchResults.classList.add('hidden');
    topicView.classList.remove('hidden');
    setBackBtn(true);

    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.topicId === topicId)
    );

    topicView.innerHTML = renderTopic(cat, topic);
    window.scrollTo(0, 0);
    updateSEO(cat, topic);

    topicView.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.closest('.code-block').querySelector('pre').textContent)
          .then(() => {
            btn.textContent = '✓ Copiado'; btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 1800);
          });
      });
    });

    if (isAdmin) {
      $('adminEditBtn')?.addEventListener('click', () => openModal(catId, topicId));
      $('adminDeleteBtn')?.addEventListener('click', () => deleteTopic(catId, topicId));
    }
  }

  // ── RENDER TOPIC ──
  function renderTopic(cat, topic) {
    const tags = (topic.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const sections = (topic.sections || []).map(s => {
      if (s.type === 'warning') return callout('⚠️', s.text, 'warning');
      if (s.type === 'info')    return callout('ℹ️', s.text, 'info');
      if (s.type === 'tip')     return callout('💡', s.text, 'tip');
      if (s.type === 'result')  return callout('✅', s.text, 'result');
      if (s.type === 'steps') {
        const steps = s.items.map((item, i) => `
          <div class="step">
            <div class="step-num">${i + 1}</div>
            <div class="step-body">
              <div class="step-label">${item.label}</div>
              ${item.command ? codeBlock(item.command) : ''}
            </div>
          </div>`).join('');
        return `<div class="steps-section">
          ${s.title ? `<div class="steps-title">${s.title}</div>` : ''}
          ${steps}</div>`;
      }
      return '';
    }).join('');

    const adminBar = isAdmin ? `
      <div class="admin-topic-bar">
        <button class="admin-topic-btn" id="adminEditBtn">✏️ Editar tópico</button>
        <button class="admin-topic-btn admin-topic-delete" id="adminDeleteBtn">🗑 Excluir</button>
      </div>` : '';

    return `
      <div class="topic-breadcrumb">
        <span onclick="showWelcomeScreen()" style="cursor:pointer">Início</span> ›
        <span style="color:${cat.color}">${cat.name}</span> ›
        <span>${topic.title}</span>
      </div>
      ${adminBar}
      <h1 class="topic-title">${topic.title}</h1>
      <p class="topic-description">${topic.description}</p>
      ${tags ? `<div class="topic-tags">${tags}</div>` : ''}
      ${sections}
    `;
  }

  // ── SEO ──
  function updateSEO(cat, topic) {
    const title = `${topic.title} (${cat.name}) — DBA Playbook`;
    document.title = title;
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', topic.description);

    const steps = (topic.sections || []).find(s => s.type === 'steps');
    const schema = {
      '@context': 'https://schema.org',
      '@type': steps ? 'HowTo' : 'Article',
      'name': topic.title,
      'description': topic.description,
      'inLanguage': 'pt-BR',
      'author': { '@type': 'Person', 'name': 'Vinicius Gabriel Lana' },
      ...(steps ? {
        'step': steps.items.map((item, i) => ({
          '@type': 'HowToStep',
          'position': i + 1,
          'name': item.label,
          'text': item.command || item.label
        }))
      } : {})
    };
    const el = document.getElementById('topicSchema');
    if (el) el.textContent = JSON.stringify(schema);
  }

  function resetSEO() {
    document.title = 'DBA Playbook — Comandos do Dia a Dia para DBAs';
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', 'Guia prático de comandos para DBAs. Oracle, SQL Server, PostgreSQL e MySQL — exemplos prontos para copiar e usar.');
    const el = document.getElementById('topicSchema');
    if (el) el.textContent = '';
  }

  function callout(icon, text, type) {
    return `<div class="callout ${type}"><span class="callout-icon">${icon}</span><span>${text}</span></div>`;
  }
  function codeBlock(code) {
    const esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<div class="code-block"><pre>${esc}</pre><button class="copy-btn">Copiar</button></div>`;
  }

  // ── WELCOME ──
  window.showWelcomeScreen = function() {
    activeTopicId = null; activeCatId = null;
    welcome.classList.remove('hidden');
    topicView.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchInput.value = ''; searchClear.classList.remove('visible');
    setBackBtn(false);
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    window.scrollTo(0, 0);
    resetSEO();
  };

  // ── DELETE ──
  async function deleteTopic(catId, topicId) {
    if (!confirm('Tem certeza que deseja excluir este tópico?')) return;

    const data = getUserData();
    const customIdx = data.customTopics.findIndex(c => c.topic.id === topicId);
    if (customIdx >= 0) data.customTopics.splice(customIdx, 1);
    else if (!data.deletedIds.includes(topicId)) data.deletedIds.push(topicId);
    delete data.editedTopics[topicId];
    saveUserData(data);

    const cat = CONTENT.categories.find(c => c.id === catId);
    if (cat) cat.topics = cat.topics.filter(t => t.id !== topicId);
    buildNav(); buildWelcome(); showWelcomeScreen();

    try {
      await commitToGithub();
      saveUserData({ customTopics: [], editedTopics: {}, deletedIds: [] });
      showToast('Tópico excluído e publicado!');
    } catch (err) {
      showToast('Excluído localmente. Erro ao publicar: ' + err.message, 'error');
    }
  }

  // ── MODAL: EDITOR ──
  let editingCatId   = null;
  let editingTopicId = null;

  function openModal(catId, topicId) {
    editingCatId   = catId;
    editingTopicId = topicId;

    $('formCat').innerHTML = CONTENT.categories
      .map(c => `<option value="${c.id}"${c.id === catId ? ' selected' : ''}>${c.name}</option>`)
      .join('');
    $('formCatGroup').classList.toggle('hidden', !!topicId);
    $('modalTitle').textContent = topicId ? 'Editar Tópico' : 'Novo Tópico';
    $('modalSaveBtn').textContent = 'Salvar e Publicar';
    $('modalSaveBtn').disabled = false;

    if (topicId) {
      const cat   = CONTENT.categories.find(c => c.id === catId);
      const topic = cat?.topics.find(t => t.id === topicId);
      if (!topic) return;
      $('formTitle').value = topic.title;
      $('formDesc').value  = topic.description || '';
      $('formTags').value  = (topic.tags || []).join(', ');
      const intro = (topic.sections || []).find(s => ['warning','info','tip','result'].includes(s.type));
      $('formNoteType').value = intro?.type || '';
      $('formNoteText').value = intro?.text || '';
      buildStepsUI((topic.sections || []).find(s => s.type === 'steps')?.items || []);
    } else {
      ['formTitle','formDesc','formTags'].forEach(id => $(id).value = '');
      $('formNoteType').value = ''; $('formNoteText').value = '';
      buildStepsUI([]);
    }

    toggleNoteText();
    $('modalOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('formTitle').focus(), 50);
  }

  function closeModal() {
    $('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function toggleNoteText() {
    const show = $('formNoteType').value !== '';
    $('formNoteText').style.display   = show ? 'block' : 'none';
    $('formNoteText').style.marginTop = show ? '8px' : '0';
  }

  function buildStepsUI(items) {
    $('stepsContainer').innerHTML = '';
    if (!items.length) addStepRow();
    else items.forEach(i => addStepRow(i.label, i.command || ''));
  }

  function addStepRow(label = '', command = '') {
    const container = $('stepsContainer');
    const num = container.querySelectorAll('.step-form-row').length + 1;
    const row = document.createElement('div');
    row.className = 'step-form-row';

    const numEl = document.createElement('span');
    numEl.className = 'step-form-num';
    numEl.textContent = num;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'step-form-remove';
    removeBtn.textContent = 'Remover';
    removeBtn.addEventListener('click', () => {
      row.remove();
      container.querySelectorAll('.step-form-num').forEach((el, i) => el.textContent = i + 1);
    });

    const hdr = document.createElement('div');
    hdr.className = 'step-form-header';
    hdr.appendChild(numEl); hdr.appendChild(removeBtn);

    const labelEl = document.createElement('input');
    labelEl.type = 'text'; labelEl.className = 'form-input step-form-label';
    labelEl.placeholder = 'Descrição do passo'; labelEl.value = label;

    const cmdEl = document.createElement('textarea');
    cmdEl.className = 'form-textarea step-form-command';
    cmdEl.placeholder = 'Comando SQL ou shell (opcional)';
    cmdEl.rows = 3; cmdEl.value = command;

    row.appendChild(hdr); row.appendChild(labelEl); row.appendChild(cmdEl);
    container.appendChild(row);
  }

  async function saveModalData() {
    const title    = $('formTitle').value.trim();
    const desc     = $('formDesc').value.trim();
    const tagsRaw  = $('formTags').value.trim();
    const noteType = $('formNoteType').value;
    const noteText = $('formNoteText').value.trim();
    const catId    = editingTopicId ? editingCatId : $('formCat').value;

    if (!title) {
      $('formTitle').style.borderColor = 'var(--red)';
      $('formTitle').focus(); return;
    }
    $('formTitle').style.borderColor = '';

    const tags      = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const stepItems = [...$('stepsContainer').querySelectorAll('.step-form-row')]
      .map(row => ({
        label:   row.querySelector('.step-form-label').value.trim(),
        command: row.querySelector('.step-form-command').value.trim()
      })).filter(s => s.label);

    const sections = [];
    if (noteType && noteText) sections.push({ type: noteType, text: noteText });
    if (stepItems.length)     sections.push({ type: 'steps', title: 'Passo a passo', items: stepItems });

    const data = getUserData();
    let resolvedTopicId = editingTopicId;

    if (editingTopicId) {
      const cat   = CONTENT.categories.find(c => c.id === catId);
      const topic = cat?.topics.find(t => t.id === editingTopicId);
      if (!topic) return;
      const updated = { ...topic, title, description: desc, tags, sections };
      const ci = data.customTopics.findIndex(c => c.topic.id === editingTopicId);
      if (ci >= 0) data.customTopics[ci].topic = updated;
      else data.editedTopics[editingTopicId] = updated;
      if (cat) cat.topics = cat.topics.map(t => t.id === editingTopicId ? updated : t);
    } else {
      const newId    = `custom-${Date.now()}`;
      const newTopic = { id: newId, title, description: desc, tags, sections };
      data.customTopics.push({ catId, topic: newTopic });
      const cat = CONTENT.categories.find(c => c.id === catId);
      if (cat) cat.topics.push(newTopic);
      resolvedTopicId = newId;
    }

    saveUserData(data);

    // Publish to GitHub
    const btn = $('modalSaveBtn');
    btn.disabled = true; btn.textContent = 'Publicando...';

    try {
      await commitToGithub();
      saveUserData({ customTopics: [], editedTopics: {}, deletedIds: [] });
      closeModal(); buildNav(); buildWelcome();
      showTopic(catId, resolvedTopicId);
      showToast('Publicado! O site será atualizado em ~30 segundos.');
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar e Publicar';
      showToast(err.message, 'error');
    }
  }

  // ── MODAL: LOGIN ──
  function openLoginModal() {
    $('loginPassword').value = '';
    $('loginError').textContent = '';
    $('loginModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('loginPassword').focus(), 50);
  }

  function closeLoginModal() {
    $('loginModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function attemptLogin() {
    if ($('loginPassword').value === ADMIN_PASSWORD) {
      saveAdminSession();
      closeLoginModal();
      enableAdminMode();
    } else {
      $('loginError').textContent = 'Senha incorreta.';
      $('loginPassword').value = '';
      $('loginPassword').focus();
    }
  }

  function enableAdminMode() {
    isAdmin = true;
    document.body.classList.add('admin-mode');
    $('adminLockBtn').title = 'Sair do modo admin';
    $('adminLockLabel').textContent = 'Sair';
    $('lockIcon').innerHTML = `<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    buildNav(); buildWelcome();
    if (activeTopicId) showTopic(activeCatId, activeTopicId);
  }

  function logout() {
    clearAdminSession();
    location.reload();
  }

  // ── SEARCH ──
  function doSearch(query) {
    query = query.trim().toLowerCase();
    if (!query) {
      searchResults.classList.add('hidden');
      setBackBtn(!!activeTopicId);
      if (!activeTopicId) welcome.classList.remove('hidden');
      else topicView.classList.remove('hidden');
      return;
    }
    welcome.classList.add('hidden'); topicView.classList.add('hidden');
    searchResults.classList.remove('hidden'); setBackBtn(true);

    const hits = [];
    CONTENT.categories.forEach(cat => {
      cat.topics.forEach(topic => {
        const hay = [topic.title, topic.description, ...(topic.tags||[]),
          ...(topic.sections||[]).flatMap(s =>
            s.type==='steps' ? s.items.map(i=>i.label+' '+(i.command||'')) : [s.text||''])
        ].join(' ').toLowerCase();
        if (hay.includes(query)) hits.push({ cat, topic });
      });
    });

    if (!hits.length) {
      searchResults.innerHTML = `<div class="search-no-results"><span class="icon">🔍</span>Nenhum resultado para <strong>"${query}"</strong></div>`;
      return;
    }
    searchResults.innerHTML = `
      <div class="search-results-header"><strong>${hits.length}</strong> resultado${hits.length!==1?'s':''} para "${query}"</div>
      ${hits.map(({cat,topic})=>`
        <div class="search-result-item" onclick="showTopic_('${cat.id}','${topic.id}')">
          <div class="search-result-cat" style="color:${cat.color}">${cat.name}</div>
          <div class="search-result-title">${topic.title}</div>
          <div class="search-result-desc">${topic.description}</div>
        </div>`).join('')}`;
  }

  window.showTopic_ = (catId, topicId) => showTopic(catId, topicId);

  searchInput.addEventListener('input', e => {
    searchClear.classList.toggle('visible', e.target.value.length > 0);
    doSearch(e.target.value);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = ''; searchClear.classList.remove('visible');
    doSearch(''); searchInput.focus();
  });

  // ── WIRE UP EVENTS ──
  // Topic editor modal
  $('modalCloseBtn').addEventListener('click', closeModal);
  $('modalCancelBtn').addEventListener('click', closeModal);
  $('modalSaveBtn').addEventListener('click', saveModalData);
  $('addStepBtn').addEventListener('click', () => addStepRow());
  $('formNoteType').addEventListener('change', toggleNoteText);
  $('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });

  // Login modal
  $('adminLockBtn').addEventListener('click', () => isAdmin ? logout() : openLoginModal());
  $('loginSubmitBtn').addEventListener('click', attemptLogin);
  $('loginCancelBtn').addEventListener('click', closeLoginModal);
  $('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
  $('loginModal').addEventListener('click', e => { if (e.target === $('loginModal')) closeLoginModal(); });

  // Mobile sidebar
  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
  menuBtn.addEventListener('click', openSidebar);
  sidebarToggle.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // ── INJECT ALL HOWTO SCHEMAS ON LOAD ──
  function injectAllSchemas() {
    const schemas = [];
    CONTENT.categories.forEach(cat => {
      cat.topics.forEach(topic => {
        const steps = (topic.sections || []).find(s => s.type === 'steps');
        schemas.push({
          '@context': 'https://schema.org',
          '@type': steps ? 'HowTo' : 'Article',
          'name': topic.title,
          'description': topic.description,
          'inLanguage': 'pt-BR',
          'keywords': (topic.tags || []).join(', '),
          'author': { '@type': 'Person', 'name': 'Vinicius Gabriel Lana' },
          ...(steps ? {
            'step': steps.items.map((item, i) => ({
              '@type': 'HowToStep',
              'position': i + 1,
              'name': item.label,
              'text': item.command || item.label
            }))
          } : {})
        });
      });
    });
    const el = document.getElementById('topicSchema');
    if (el) el.textContent = JSON.stringify(schemas);
  }

  // ── INIT ──
  mergeContent();
  injectAllSchemas();
  if (checkAdminSession()) enableAdminMode();
  buildNav();
  buildWelcome();
})();
