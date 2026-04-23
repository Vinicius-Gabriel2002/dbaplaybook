(() => {
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

  // ── THEME ──
  const savedTheme = localStorage.getItem('dba-theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('dba-theme', next);
  });

  // ── BACK BUTTON ──
  backBtn.addEventListener('click', () => showWelcomeScreen());

  function setBackBtn(visible) {
    backBtn.classList.toggle('hidden', !visible);
  }

  // ── BUILD NAV ──
  function buildNav() {
    navEl.innerHTML = '';
    CONTENT.categories.forEach(cat => {
      const catEl = document.createElement('div');
      catEl.className = 'nav-category';
      catEl.dataset.catId = cat.id;

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
        item.dataset.catId = cat.id;
        item.addEventListener('click', () => {
          showTopic(cat.id, topic.id);
          closeSidebar();
        });
        items.appendChild(item);
      });

      catEl.appendChild(header);
      catEl.appendChild(items);
      navEl.appendChild(catEl);
    });
  }

  // ── BUILD WELCOME CARDS ──
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
    const cat = CONTENT.categories.find(c => c.id === catId);
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

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.topicId === topicId);
    });

    topicView.innerHTML = renderTopic(cat, topic);
    topicView.scrollTop = 0;
    window.scrollTo(0, 0);

    topicView.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.closest('.code-block').querySelector('pre').textContent;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '✓ Copiado';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 1800);
        });
      });
    });
  }

  // ── RENDER TOPIC ──
  function renderTopic(cat, topic) {
    const tags = (topic.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

    const sections = (topic.sections || []).map(section => {
      if (section.type === 'warning') return callout('⚠️', section.text, 'warning');
      if (section.type === 'info')    return callout('ℹ️', section.text, 'info');
      if (section.type === 'tip')     return callout('💡', section.text, 'tip');
      if (section.type === 'result')  return callout('✅', section.text, 'result');

      if (section.type === 'steps') {
        const steps = section.items.map((item, i) => `
          <div class="step">
            <div class="step-num">${i + 1}</div>
            <div class="step-body">
              <div class="step-label">${item.label}</div>
              ${item.command ? codeBlock(item.command) : ''}
            </div>
          </div>
        `).join('');

        return `
          <div class="steps-section">
            ${section.title ? `<div class="steps-title">${section.title}</div>` : ''}
            ${steps}
          </div>
        `;
      }
      return '';
    }).join('');

    return `
      <div class="topic-breadcrumb">
        <span onclick="showWelcomeScreen()" style="cursor:pointer">Início</span>
        ›
        <span style="color:${cat.color}">${cat.name}</span>
        ›
        <span>${topic.title}</span>
      </div>
      <h1 class="topic-title">${topic.title}</h1>
      <p class="topic-description">${topic.description}</p>
      ${tags ? `<div class="topic-tags">${tags}</div>` : ''}
      ${sections}
    `;
  }

  function callout(icon, text, type) {
    return `
      <div class="callout ${type}">
        <span class="callout-icon">${icon}</span>
        <span>${text}</span>
      </div>
    `;
  }

  function codeBlock(code) {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `
      <div class="code-block">
        <pre>${escaped}</pre>
        <button class="copy-btn">Copiar</button>
      </div>
    `;
  }

  // ── WELCOME ──
  window.showWelcomeScreen = function() {
    activeTopicId = null;
    activeCatId   = null;
    welcome.classList.remove('hidden');
    topicView.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchInput.value = '';
    searchClear.classList.remove('visible');
    setBackBtn(false);
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    window.scrollTo(0, 0);
  };

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

    welcome.classList.add('hidden');
    topicView.classList.add('hidden');
    searchResults.classList.remove('hidden');
    setBackBtn(true);

    const hits = [];
    CONTENT.categories.forEach(cat => {
      cat.topics.forEach(topic => {
        const haystack = [
          topic.title,
          topic.description,
          ...(topic.tags || []),
          ...(topic.sections || []).flatMap(s => {
            if (s.type === 'steps') return s.items.map(i => i.label + ' ' + (i.command || ''));
            return [s.text || ''];
          })
        ].join(' ').toLowerCase();

        if (haystack.includes(query)) hits.push({ cat, topic });
      });
    });

    if (hits.length === 0) {
      searchResults.innerHTML = `
        <div class="search-no-results">
          <span class="icon">🔍</span>
          Nenhum resultado para <strong>"${query}"</strong>
        </div>
      `;
      return;
    }

    searchResults.innerHTML = `
      <div class="search-results-header">
        <strong>${hits.length}</strong> resultado${hits.length !== 1 ? 's' : ''} para "${query}"
      </div>
      ${hits.map(({ cat, topic }) => `
        <div class="search-result-item" onclick="showTopic_('${cat.id}','${topic.id}')">
          <div class="search-result-cat" style="color:${cat.color}">${cat.name}</div>
          <div class="search-result-title">${topic.title}</div>
          <div class="search-result-desc">${topic.description}</div>
        </div>
      `).join('')}
    `;
  }

  window.showTopic_ = (catId, topicId) => showTopic(catId, topicId);

  searchInput.addEventListener('input', e => {
    const val = e.target.value;
    searchClear.classList.toggle('visible', val.length > 0);
    doSearch(val);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    doSearch('');
    searchInput.focus();
  });

  // ── MOBILE SIDEBAR ──
  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('open');    }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

  menuBtn.addEventListener('click', openSidebar);
  sidebarToggle.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // ── INIT ──
  buildNav();
  buildWelcome();
})();
