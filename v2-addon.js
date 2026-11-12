/* Shobdo Aura v2 static enhancements. No backend, accounts, or cloud sync. */
(function () {
  'use strict';
  const DATA = window.SHOBDO_DATA || { words: [], phrases: [], exams: [] };
  const words = DATA.words || [];
  const phrases = DATA.phrases || [];
  const exams = DATA.exams || [];
  const root = document.getElementById('view');
  const sidebar = document.getElementById('sidebar');
  const appShell = document.querySelector('.app-shell');
  const topbar = document.querySelector('.topbar');
  const topbarPage = document.getElementById('topbarPage');
  const globalSearch = document.getElementById('globalSearch');
  const suggestions = document.getElementById('searchSuggestions');
  const LEGACY_KEY = 'shobdoAuraPreviewV1';
  const V2_KEY = 'shobdoAuraV2';
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const safeParse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; } };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getLegacy = () => {
    const v = safeParse(localStorage.getItem(LEGACY_KEY), {});
    return {
      saved: Array.isArray(v.saved) ? v.saved : [],
      difficult: Array.isArray(v.difficult) ? v.difficult : [],
      learned: v.learned && typeof v.learned === 'object' ? v.learned : {},
      history: Array.isArray(v.history) ? v.history : []
    };
  };
  const defaultState = () => ({
    schemaVersion: 2,
    settings: { theme:'light', fontScale:1.04, navPosition:'left', navCollapsed:false, reminders:true, reminderTime:'19:00', defaultInterval:7 },
    collections: [],
    phraseLearned: {},
    reviewHistory: [],
    study: {},
    reports: [],
    quizHistory: [],
    lastReminderDay: '',
    lastReminderAt: '',
    sessionStartedAt: new Date().toISOString()
  });
  const initial = safeParse(localStorage.getItem(V2_KEY), {});
  const state = Object.assign(defaultState(), initial || {});
  state.settings = Object.assign(defaultState().settings, initial.settings || {});
  state.collections = Array.isArray(state.collections) ? state.collections : [];
  state.phraseLearned = state.phraseLearned && typeof state.phraseLearned === 'object' ? state.phraseLearned : {};
  state.reviewHistory = Array.isArray(state.reviewHistory) ? state.reviewHistory : [];
  state.study = state.study && typeof state.study === 'object' ? state.study : {};
  state.reports = Array.isArray(state.reports) ? state.reports : [];
  state.quizHistory = Array.isArray(state.quizHistory) ? state.quizHistory : [];
  const persist = () => localStorage.setItem(V2_KEY, JSON.stringify(state));
  const wordById = id => words.find(w => w.id === id);
  const phraseById = id => phrases.find(p => p.id === id);
  const examById = id => exams.find(e => e.id === id);
  const dueLegacy = () => Object.entries(getLegacy().learned).filter(([,v]) => v && v.nextReview && v.nextReview <= today()).map(([id,v]) => ({ type:'word', id, info:v }));
  const duePhrases = () => Object.entries(state.phraseLearned).filter(([,v]) => v && v.nextReview && v.nextReview <= today()).map(([id,v]) => ({ type:'phrase', id, info:v }));
  const allDue = () => [...dueLegacy(), ...duePhrases()].filter(x => x.type === 'word' ? !!wordById(x.id) : !!phraseById(x.id));
  const countTime = sec => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
    return h ? `${h}h ${String(m).padStart(2,'0')}m` : m ? `${m}m` : `${s}s`;
  };
  const friendlyDate = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const toast = message => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(window.__saToastTimer); window.__saToastTimer = setTimeout(()=>el.classList.remove('show'),2600);
  };
  const currentViewLabel = () => (topbarPage?.textContent || 'Overview').trim();
  const categoryForTime = () => {
    const label = currentViewLabel().toLowerCase();
    if (label.includes('dictionary') || label.includes('word')) {
      const y=Math.min(window.innerHeight-20,Math.max(110,window.innerHeight*.48));
      const focus=document.elementFromPoint(Math.max(10,window.innerWidth*.5),y);
      const card=focus?.closest('.definition-card');
      const heading=card?.querySelector('h3')?.textContent?.toLowerCase()||'';
      if(heading.includes('synonym')||heading.includes('antonym')) return 'Synonyms & Antonyms';
      if(heading.includes('collocation')||heading.includes('usage')) return 'Collocations & Usage';
      if(heading.includes('example')) return 'Examples & Usage';
      return 'Aura Dictionary';
    }
    if (label.includes('pyq') || label.includes('exam')) return 'Aura PYQ';
    if (label.includes('idiom') || label.includes('phrase')) return 'Idioms & Phrases';
    if (label.includes('recall') || label.includes('flashcard')) return 'Recall & Flashcards';
    if (label.includes('arena') || label.includes('quiz')) return 'Word Arena';
    if (label.includes('collection') || label.includes('lexicon') || label.includes('difficult')) return 'My Lexicon';
    if (label.includes('insight') || label.includes('study time')) return 'Aura Insights';
    return 'Overview & Settings';
  };

  // Main navigation controls and extra destinations.
  const toggle = document.createElement('button');
  toggle.className = 'sa-nav-toggle'; toggle.id = 'saNavToggle'; toggle.type = 'button';
  toggle.title = 'Hide or show navigation'; toggle.setAttribute('aria-label','Hide or show navigation'); toggle.textContent = '☰';
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) mobileMenu.replaceWith(toggle);
  else topbar?.insertBefore(toggle, topbar.firstChild);
  const actionWrap = document.querySelector('.topbar-actions');
  const reminderBtn = document.createElement('button');
  reminderBtn.className = 'sa-top-action'; reminderBtn.type = 'button'; reminderBtn.id = 'saReminderBell';
  reminderBtn.title = 'Review reminders'; reminderBtn.textContent = '♢';
  actionWrap?.insertBefore(reminderBtn, actionWrap.firstChild);
  const navGroup = document.createElement('div');
  navGroup.className = 'v2-nav-group';
  navGroup.innerHTML = `
    <div class="nav-label">PERSONAL SPACE</div>
    <nav class="nav-list" aria-label="Personal and settings navigation">
      <button class="nav-item" data-v2-view="collections"><span class="nav-icon">▤</span><span>My Collections</span></button>
      <button class="nav-item" data-v2-view="insights"><span class="nav-icon">◫</span><span>Aura Insights</span></button>
      <button class="nav-item" data-v2-view="settings"><span class="nav-icon">⚙</span><span>Settings</span></button>
    </nav>`;
  const sidebarBottom = sidebar?.querySelector('.sidebar-bottom');
  if (sidebarBottom) sidebar.insertBefore(navGroup, sidebarBottom);
  const openNav = document.createElement('button');
  openNav.className = 'sa-nav-open-float'; openNav.type='button'; openNav.title='Show navigation'; openNav.textContent='☰';
  document.body.appendChild(openNav);

  function applySettings() {
    document.documentElement.dataset.theme = state.settings.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.style.setProperty('--sa-font-scale', String(state.settings.fontScale || 1.04));
    document.body.style.fontSize = `calc(15px * ${state.settings.fontScale || 1.04})`;
    appShell.dataset.navPosition = state.settings.navPosition || 'left';
    appShell.dataset.navCollapsed = state.settings.navCollapsed ? 'true' : 'false';
    openNav.style.display = state.settings.navCollapsed ? 'grid' : 'none';
    // Side navigation starts off-canvas on small screens; the menu control opens it on demand.
    if (state.settings.navCollapsed || window.matchMedia('(max-width: 820px)').matches) sidebar?.classList.remove('open');
    else sidebar?.classList.remove('open');
    persist();
  }
  applySettings();

  function setV2View(view, label) {
    state.uiView = view; persist();
    const labels = { phrases:'Idioms & Phrases', recall:'Recall', insights:'Aura Insights', collections:'My Collections', settings:'Settings', developer:'Developer', privacy:'Privacy Policy', terms:'Terms of Use', sources:'Sources & References', disclaimer:'Examination Data Disclaimer', accuracy:'Content Accuracy Policy', contact:'Contact & Feedback' };
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const active = document.querySelector(`[data-v2-view="${view}"]`) || document.querySelector(`.nav-item[data-view="${view}"]`);
    active?.classList.add('active');
    if (view === 'phrases' || view === 'recall' || view === 'insights' || view === 'collections' || view === 'settings' || view === 'developer' || ['privacy','terms','sources','disclaimer','accuracy','contact'].includes(view)) {
      topbarPage.textContent = label || labels[view] || 'Shobdo Aura';
      sidebar?.classList.remove('open');
      root.classList.remove('sa-reading-mode');
      if (view === 'phrases') renderPhrases();
      else if (view === 'recall') renderRecallHome();
      else if (view === 'insights') renderInsights();
      else if (view === 'collections') renderCollections();
      else if (view === 'settings') renderSettings();
      else if (view === 'developer') renderDeveloper();
      else renderInfo(view);
      window.scrollTo({top:0,behavior:'smooth'});
    }
  }
  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-v2-view]');
    const existingNav = event.target.closest('.nav-item[data-view="phrases"], .nav-item[data-view="recall"]');
    const oldShortcut = event.target.closest('[data-action="go"][data-view="phrases"], [data-action="go"][data-view="recall"]');
    if (nav) { event.preventDefault(); event.stopImmediatePropagation(); setV2View(nav.dataset.v2View); return; }
    if (existingNav) { event.preventDefault(); event.stopImmediatePropagation(); setV2View(existingNav.dataset.view); return; }
    if (oldShortcut) { event.preventDefault(); event.stopImmediatePropagation(); setV2View(oldShortcut.dataset.view); return; }
  }, true);
  toggle.addEventListener('click', () => {
    const mobileSide = window.matchMedia('(max-width: 820px)').matches && !['top','bottom'].includes(state.settings.navPosition);
    if(mobileSide && state.settings.navCollapsed){
      state.settings.navCollapsed = false; applySettings(); sidebar?.classList.add('open'); return;
    }
    if(mobileSide){ sidebar?.classList.toggle('open'); return; }
    state.settings.navCollapsed = !state.settings.navCollapsed; applySettings();
  });
  openNav.addEventListener('click', () => {
    state.settings.navCollapsed = false; applySettings();
    if(window.matchMedia('(max-width: 820px)').matches && !['top','bottom'].includes(state.settings.navPosition)) sidebar?.classList.add('open');
  });
  reminderBtn.addEventListener('click', () => setV2View('recall'));

  // Search ranking: exact, prefix, contains, then small spelling distance.
  function editDistance(a,b) {
    if (Math.abs(a.length-b.length)>2) return 9;
    const row = Array.from({length:b.length+1},(_,i)=>i);
    for (let i=1;i<=a.length;i++) {
      let prev=row[0]; row[0]=i;
      for(let j=1;j<=b.length;j++) {
        const temp=row[j];
        row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
        prev=temp;
      }
    }
    return row[b.length];
  }
  const searchEntries = () => [
    ...words.map(w=>({type:'word',id:w.id,label:w.word,sub:w.banglaMeaning,terms:[w.word,...(w.synonyms||[])]})),
    ...phrases.map(p=>({type:'phrase',id:p.id,label:p.phrase,sub:p.bangla,terms:[p.phrase]}))
  ];
  function smartSearch(query) {
    const q=query.trim().toLowerCase(); if (!q) return [];
    return searchEntries().map(e=>{
      const label=e.label.toLowerCase();
      let score=99;
      if (label===q) score=0;
      else if (label.startsWith(q)) score=1;
      else if (label.includes(q)) score=2;
      else if ((e.terms||[]).some(t=>t.toLowerCase().startsWith(q))) score=3;
      else {
        const d=Math.min(...e.terms.map(t=>editDistance(q,t.toLowerCase())));
        if (d<= (q.length>7?2:1)) score=4+d;
      }
      return {...e,score};
    }).filter(e=>e.score<99).sort((a,b)=>a.score-b.score || a.label.localeCompare(b.label)).slice(0,8);
  }
  globalSearch?.addEventListener('input', () => {
    const q=globalSearch.value;
    if (!q.trim()) return;
    const matches=smartSearch(q);
    if (!suggestions) return;
    suggestions.innerHTML=matches.length ? matches.map(m=>`<button class="suggestion" data-action="${m.type==='word'?'open-word':'open-phrase'}" data-id="${esc(m.id)}"><strong>${esc(m.label)}</strong><small>${esc(m.sub || (m.type==='word'?'Dictionary word':'Phrase'))}</small></button>`).join('') : `<div class="suggestion"><span>No close match found</span><small>Try another spelling</small></div>`;
    suggestions.classList.add('open');
  });
  document.addEventListener('input', event => {
    if(event.target!==globalSearch) return;
    const q=globalSearch.value.trim(); if(!q){suggestions?.classList.remove('open');return;}
    const matches=smartSearch(q);
    if(!suggestions)return;
    suggestions.innerHTML=matches.length?matches.map(m=>`<button class="suggestion" data-action="${m.type==='word'?'open-word':'open-phrase'}" data-id="${esc(m.id)}"><strong>${esc(m.label)}</strong><small>${esc(m.sub || (m.type==='word'?'Dictionary word':'Phrase'))}</small></button>`).join(''):`<div class="suggestion"><span>No close match found</span><small>Try another spelling</small></div>`;
    suggestions.classList.add('open');
  });
  document.addEventListener('keydown', event => {
    if (event.target === globalSearch && event.key === 'Enter') {
      const matches=smartSearch(globalSearch.value);
      if (matches.length && matches[0].score>0 && matches[0].score<99) {
        event.preventDefault(); event.stopImmediatePropagation();
        const m=matches[0]; suggestions?.classList.remove('open'); globalSearch.value='';
        if (m.type==='word') { const target=document.querySelector(`[data-action="open-word"][data-id="${CSS.escape(m.id)}"]`); if(target) target.click(); else { const trigger=document.createElement('button'); trigger.dataset.action='open-word'; trigger.dataset.id=m.id; trigger.hidden=true; document.body.appendChild(trigger); trigger.click(); trigger.remove(); } }
        else { const trigger=document.createElement('button'); trigger.dataset.action='open-phrase'; trigger.dataset.id=m.id; trigger.hidden=true; document.body.appendChild(trigger); trigger.click(); trigger.remove(); }
      }
    }
  }, true);

  // Alphabetical phrase library, separate from the dictionary.
  let phraseLetter = '';
  let phraseQuery = '';
  function renderPhrases() {
    const sorted=[...phrases].sort((a,b)=>a.phrase.localeCompare(b.phrase));
    const list=sorted.filter(p=>(!phraseLetter || p.phrase.toUpperCase().startsWith(phraseLetter)) && (!phraseQuery || `${p.phrase} ${p.meaning} ${p.bangla}`.toLowerCase().includes(phraseQuery.toLowerCase())));
    const alpha='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    root.innerHTML=`<div class="page-head"><div><div class="eyebrow">AURA LANGUAGE LIBRARY</div><h1>Idioms & Phrases</h1><p>A dedicated alphabetical library for idioms, phrasal verbs and useful expressions. These entries remain separate from the main word dictionary.</p></div><div class="inline-search"><input id="saPhraseSearch" class="sa-field" type="search" placeholder="Search idioms or phrases..." value="${esc(phraseQuery)}"></div></div>
      <div class="sa-panel"><div class="sa-section-title" style="margin-top:0"><h2>Browse by first letter</h2><span class="sa-pill">A–Z</span></div><div class="sa-letter-grid">${alpha.map(l=>{const n=sorted.filter(p=>p.phrase.toUpperCase().startsWith(l)).length;return `<button class="sa-letter-tile ${phraseLetter===l?'active':''}" data-v2-action="phrase-letter" data-letter="${l}">${l}<small>${n} entries</small></button>`}).join('')}</div><div class="sa-toolbar" style="margin-top:12px"><button class="btn btn-secondary btn-small" data-v2-action="phrase-clear">All letters</button><span class="sa-muted">${list.length} entries</span></div></div>
      <div class="sa-section-title"><h2>${phraseLetter?`Phrases beginning with ${phraseLetter}`:'All phrases and idioms'}</h2><span class="card-kicker">SORTED A–Z</span></div>
      ${list.length?`<div class="phrase-grid">${list.map(p=>`<article class="card phrase-card sa-fade"><div class="word-card-top"><span class="pill gold">${esc(p.type)}</span><span class="card-kicker">PHRASE LIBRARY</span></div><h3>${esc(p.phrase)}</h3><p>${esc(p.meaning)}</p><p class="bn-phrase">${esc(p.bangla)}</p><div class="phrase-example">“${esc(p.example||'')}”</div><div style="margin-top:12px"><button class="btn btn-secondary btn-small" data-v2-action="open-phrase-detail" data-id="${esc(p.id)}">Explore phrase ↗</button></div></article>`).join('')}</div>`:`<div class="sa-empty">No phrases match this letter or search yet.</div>`}`;
  }
  function renderPhraseDetail(id) {
    const p=phraseById(id); if(!p) return;
    const linked=(p.relatedExamIds||[]).map(examById).filter(Boolean);
    const learned=state.phraseLearned[id];
    root.innerHTML=`<div class="breadcrumb"><button data-v2-action="back-phrases">Idioms & Phrases</button><span>›</span><strong>${esc(p.phrase)}</strong></div>
      <div class="page-head"><div><div class="eyebrow">PHRASE EXPLORER</div><h1>${esc(p.phrase)}</h1><p>${esc(p.type)} · Dedicated phrase library</p></div><div class="sa-toolbar"><button class="btn btn-secondary" data-v2-action="toggle-phrase-save" data-id="${esc(id)}">${state.collections.some(c=>(c.phraseIds||[]).includes(id))?'Saved in a collection':'Add to collection'}</button><button class="btn btn-secondary" data-v2-action="report" data-kind="phrase" data-id="${esc(id)}">Report an issue</button></div></div>
      <div class="grid grid-2"><section class="sa-panel"><div class="eyebrow">ENGLISH EXPLANATION</div><h2>${esc(p.meaning)}</h2><p class="sa-muted">${esc(p.example||'')}</p><button class="btn btn-secondary btn-small" data-v2-action="speak" data-text="${esc(p.phrase)}">▶ Hear phrase</button></section><section class="sa-panel"><div class="eyebrow">বাংলা অর্থ ও ব্যাখ্যা</div><h2 class="bn">${esc(p.bangla)}</h2><p class="sa-muted">Try using this expression in your own sentence.</p></section></div>
      <div class="sa-section-title"><h2>Where It Appeared</h2><span class="sa-pill">${linked.length} linked records</span></div>
      ${linked.length?linked.map(e=>`<div class="list-row"><div class="list-row-main"><strong>${esc(e.exam)}</strong><small>${esc(e.session)} · ${esc(e.unit)} · ${esc(e.kind)} · ${esc(e.status)}</small></div><div class="sa-toolbar"><button class="btn btn-secondary btn-small" data-action="open-question" data-id="${esc(e.id)}">View question ↗</button><a href="${esc(e.source||'#')}" target="_blank" rel="noopener" class="btn btn-secondary btn-small">Source ↗</a></div></div>`).join(''):`<div class="sa-empty">No linked examination records in this starter dataset.</div>`}
      <div class="sa-section-title"><h2>Recall this phrase</h2></div><div class="sa-panel"><p class="sa-muted">Add this expression to your Recall sessions so it can return for practice.</p><button class="btn btn-primary" data-v2-action="review-one" data-type="phrase" data-id="${esc(id)}">Start flashcard ↗</button>${learned?`<span class="small-note">Next review: ${friendlyDate(learned.nextReview)}</span>`:''}</div>`;
  }

  // Collections and personal lists.
  function renderCollections() {
    const legacy=getLegacy();
    const selected=state.selectedCollection || '';
    const collection=state.collections.find(c=>c.id===selected);
    root.innerHTML=`<div class="page-head"><div><div class="eyebrow">YOUR PERSONAL VOCABULARY</div><h1>My Collections</h1><p>Create your own vocabulary folders, for example BCS words, medical admission vocabulary, or words you frequently forget.</p></div><button class="btn btn-primary" data-v2-action="create-collection">＋ New collection</button></div>
      <div class="grid grid-3"><div class="card stat-card"><div class="stat-icon">◆</div><div><div class="stat-value">${legacy.saved.length}</div><div class="stat-label">Saved words</div></div></div><div class="card stat-card"><div class="stat-icon red">⚑</div><div><div class="stat-value">${legacy.difficult.length}</div><div class="stat-label">Difficult words</div></div></div><div class="card stat-card"><div class="stat-icon gold">▤</div><div><div class="stat-value">${state.collections.length}</div><div class="stat-label">Custom collections</div></div></div></div>
      ${collection?`<div class="sa-section-title"><h2>${esc(collection.name)}</h2><button class="btn btn-secondary btn-small" data-v2-action="close-collection">← All collections</button></div><div class="sa-toolbar"><button class="btn btn-primary btn-small" data-v2-action="add-collection-words" data-id="${esc(collection.id)}">＋ Add words</button><button class="btn btn-secondary btn-small" data-v2-action="review-collection" data-id="${esc(collection.id)}">Review collection</button><button class="btn btn-danger-soft btn-small" data-v2-action="delete-collection" data-id="${esc(collection.id)}">Delete collection</button></div><div class="sa-section-title"><h3>Words</h3><span class="sa-pill">${(collection.wordIds||[]).length}</span></div>${(collection.wordIds||[]).map(id=>wordById(id)).filter(Boolean).map(w=>`<div class="list-row"><div class="list-row-main"><strong>${esc(w.word)}</strong><small>${esc(w.banglaMeaning)}</small></div><button class="btn btn-secondary btn-small" data-action="open-word" data-id="${esc(w.id)}">Open ↗</button></div>`).join('')}${(collection.phraseIds||[]).map(id=>phraseById(id)).filter(Boolean).map(p=>`<div class="list-row"><div class="list-row-main"><strong>${esc(p.phrase)}</strong><small>Idiom / phrase</small></div><button class="btn btn-secondary btn-small" data-v2-action="open-phrase-detail" data-id="${esc(p.id)}">Open ↗</button></div>`).join('')||''}${(collection.wordIds||[]).length+(collection.phraseIds||[]).length===0?'<div class="sa-empty">This collection is empty.</div>':''}`:`<div class="sa-section-title"><h2>Your collections</h2><span class="card-kicker">LOCAL TO THIS DEVICE</span></div>${state.collections.length?`<div class="grid grid-3">${state.collections.map(c=>`<button class="sa-mini-card" data-v2-action="open-collection" data-id="${esc(c.id)}" style="text-align:left"><strong>${esc(c.name)}</strong><p>${(c.wordIds||[]).length} words · ${(c.phraseIds||[]).length} phrases</p><span class="text-link">Open collection ↗</span></button>`).join('')}</div>`:'<div class="sa-empty">No custom collections yet. Create a folder to start organising your vocabulary.</div>'}
      <div class="sa-section-title"><h2>Quick collections</h2></div><div class="grid grid-2"><button class="sa-mini-card" data-v2-action="quick-collection" data-kind="saved"><strong>All Saved Words</strong><p>${legacy.saved.length} saved entries</p></button><button class="sa-mini-card" data-v2-action="quick-collection" data-kind="difficult"><strong>Difficult Words</strong><p>${legacy.difficult.length} entries to practise</p></button></div>`}`;
  }

  function showCollectionPicker(wordId) {
    const choices=state.collections.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    if (!state.collections.length) { const name=prompt('Name your first vocabulary collection:'); if(name) {const c={id:'col-'+Date.now(),name:name.trim(),wordIds:[wordId],phraseIds:[],createdAt:new Date().toISOString()};state.collections.push(c);persist();toast('Collection created and word added.');} return; }
    const id=prompt(`Choose a collection by entering its number:\n${state.collections.map((c,i)=>`${i+1}. ${c.name}`).join('\n')}`);
    const index=Number(id)-1, c=state.collections[index];
    if(c){c.wordIds=Array.isArray(c.wordIds)?c.wordIds:[];if(!c.wordIds.includes(wordId))c.wordIds.push(wordId);persist();toast(`Added to ${c.name}.`);}
  }

  // Recall supports due reviews, manual sessions and phrases.
  let reviewSession=null;
  function allEntries() { return [...words.map(w=>({type:'word',id:w.id,label:w.word})),...phrases.map(p=>({type:'phrase',id:p.id,label:p.phrase}))]; }
  function getDueEntries() { return allDue().map(x=>({type:x.type,id:x.id,label:x.type==='word'?wordById(x.id).word:phraseById(x.id).phrase})); }
  function startReview(items) {
    const clean=items.filter(x=>x.type==='word'?wordById(x.id):phraseById(x.id));
    if(!clean.length){toast('There are no entries in this review selection yet.');return;}
    reviewSession={items:clean,index:0,revealed:false,startedAt:new Date().toISOString()};
    setV2View('recall'); renderReviewCard();
  }
  function renderRecallHome() {
    const due=getDueEntries(), legacy=getLegacy();
    const upcoming=[...Object.values(legacy.learned).filter(x=>x?.nextReview>today()),...Object.values(state.phraseLearned).filter(x=>x?.nextReview>today())].length;
    root.innerHTML=`<div class="page-head"><div><div class="eyebrow">SMART REVISION · RECALL</div><h1>Bring your words back.</h1><p>Start a scheduled review or practise any word or phrase whenever you want. Your flashcards reveal the full entry after you have tried to recall it.</p></div><button class="btn btn-primary" data-v2-action="start-due">Start due review ↗</button></div>
      <div class="grid grid-3"><div class="card stat-card"><div class="stat-icon red">◷</div><div><div class="stat-value">${due.length}</div><div class="stat-label">Due today or overdue</div></div></div><div class="card stat-card"><div class="stat-icon gold">⌛</div><div><div class="stat-value">${upcoming}</div><div class="stat-label">Upcoming reviews</div></div></div><div class="card stat-card"><div class="stat-icon">✓</div><div><div class="stat-value">${Object.keys(legacy.learned).length+Object.keys(state.phraseLearned).length}</div><div class="stat-label">Scheduled entries</div></div></div></div>
      <div class="sa-section-title"><h2>Review whenever you like</h2><span class="card-kicker">QUICK REVISION</span></div><div class="grid grid-3"><button class="sa-mini-card" data-v2-action="quick-review" data-count="5"><strong>Quick 5</strong><p>Five random words or phrases.</p></button><button class="sa-mini-card" data-v2-action="quick-review" data-count="10"><strong>Quick 10</strong><p>Ten entries for a short session.</p></button><button class="sa-mini-card" data-v2-action="quick-review" data-count="20"><strong>Quick 20</strong><p>A longer vocabulary workout.</p></button></div>
      <div class="sa-section-title"><h2>Choose what to revise</h2></div><div class="grid grid-2"><button class="sa-mini-card" data-v2-action="review-pool" data-pool="saved"><strong>My Saved Words</strong><p>${legacy.saved.length} entries</p></button><button class="sa-mini-card" data-v2-action="review-pool" data-pool="difficult"><strong>Difficult Words</strong><p>${legacy.difficult.length} entries</p></button><button class="sa-mini-card" data-v2-action="review-pool" data-pool="all"><strong>Entire Starter Library</strong><p>${words.length+phrases.length} entries</p></button><button class="sa-mini-card" data-v2-action="review-pool" data-pool="phrases"><strong>Idioms & Phrases</strong><p>${phrases.length} expressions</p></button></div>
      <div class="sa-section-title"><h2>Upcoming and due</h2><span class="sa-pill">${due.length} due</span></div>${due.length?due.slice(0,12).map(x=>`<div class="list-row"><div class="list-row-main"><strong>${esc(x.label)}</strong><small>${x.type==='word'?'Dictionary word':'Idiom or phrase'}</small></div><button class="btn btn-secondary btn-small" data-v2-action="review-one" data-type="${x.type}" data-id="${esc(x.id)}">Review now</button></div>`).join(''):'<div class="sa-empty">Nothing is due today. You can still start a manual review above.</div>'}
      <p class="small-note" style="margin-top:14px">Review schedules are saved locally in this browser. Export a backup before changing devices.</p>`;
  }
  function fullEntry(entry) {
    if(entry.type==='word'){
      const w=wordById(entry.id); if(!w)return '';
      const appearances=exams.filter(e=>e.wordId===w.id);
      return `<div class="sa-flashcard-back"><div class="sa-section-title" style="margin-top:0"><h3>English definition</h3><span class="sa-pill">${esc(w.pos)}</span></div><p>${esc(w.english)}</p><h3>Bengali definition</h3><p class="bn">${esc(w.banglaDefinition)}</p><h3>বাংলা অর্থ</h3><p class="bn"><strong>${esc(w.banglaMeaning)}</strong></p><h3>Pronunciation</h3><p>${esc(w.ipa||'Not supplied')} · <button class="text-link" data-v2-action="speak" data-text="${esc(w.word)}">Hear it</button></p><h3>Synonyms</h3><div class="sa-chip-row">${(w.synonyms||[]).map(s=>`<span class="sa-chip">${esc(s)}</span>`).join('')||'Not supplied'}</div><h3 style="margin-top:12px">Antonyms</h3><div class="sa-chip-row">${(w.antonyms||[]).map(s=>`<span class="sa-chip" style="background:var(--red-soft);color:var(--red)">${esc(s)}</span>`).join('')||'Not supplied'}</div><h3 style="margin-top:12px">Example and collocations</h3><p>${esc(w.example||'No example added yet.')}</p>${collocationText(w.id)}<h3 style="margin-top:12px">Examination history</h3><p>${appearances.length?appearances.map(e=>`${esc(e.exam)} · ${esc(e.session)} · ${esc(e.unit)} (${esc(e.status)})`).join('<br>'):'No linked records in this starter archive.'}</p></div>`;
    }
    const p=phraseById(entry.id);if(!p)return '';
    return `<div class="sa-flashcard-back"><h3>English explanation</h3><p>${esc(p.meaning)}</p><h3>বাংলা অর্থ ও ব্যাখ্যা</h3><p class="bn">${esc(p.bangla)}</p><h3>Example</h3><p><em>${esc(p.example||'No example supplied.')}</em></p><h3>Examination history</h3><p>${(p.relatedExamIds||[]).map(id=>examById(id)).filter(Boolean).map(e=>`${esc(e.exam)} · ${esc(e.session)} · ${esc(e.unit)}`).join('<br>')||'No linked records.'}</p></div>`;
  }
  function collocationText(id) {
    const w=wordById(id), items=collocations[id]||[];
    return `<div class="sa-chip-row">${items.map(s=>`<span class="sa-chip">${esc(s)}</span>`).join('')||'<span class="sa-muted">No collocations added yet.</span>'}</div>`;
  }
  function renderReviewCard() {
    if(!reviewSession)return renderRecallHome();
    const entry=reviewSession.items[reviewSession.index];
    if(!entry){reviewSession=null;renderRecallHome();toast('Revision session completed.');return;}
    const item=entry.type==='word'?wordById(entry.id):phraseById(entry.id);
    const title=entry.type==='word'?item?.word:item?.phrase;
    root.innerHTML=`<div class="page-head"><div><div class="eyebrow">RECALL · FLASHCARD SESSION</div><h1>Think first. Reveal when ready.</h1><p>Card ${reviewSession.index+1} of ${reviewSession.items.length}. Try to recall the meaning before revealing the full entry.</p></div><button class="btn btn-secondary" data-v2-action="end-review">End session</button></div><div class="sa-panel sa-flashcard"><div class="card-kicker">${entry.type==='word'?'DICTIONARY WORD':'IDIOM / PHRASE'}</div><div class="sa-flashcard-front">${esc(title||'')}</div>${!reviewSession.revealed?`<p class="sa-muted">What does this mean in English and Bangla?</p><button class="btn btn-primary" data-v2-action="reveal-card">Reveal Answer</button>`:`${fullEntry(entry)}<div class="sa-toolbar" style="justify-content:center;margin-top:18px"><label class="small-note">Next review <select class="sa-field" id="saReviewInterval"><option value="1">1 day</option><option value="3">3 days</option><option value="7" selected>7 days</option><option value="14">14 days</option><option value="28">28 days</option><option value="custom">Custom</option></select></label><input id="saCustomReviewInterval" class="sa-field" type="number" min="1" max="365" value="7" style="width:90px;display:none"><button class="btn btn-soft" data-v2-action="review-known">✓ I Know This</button><button class="btn btn-secondary" data-v2-action="review-again">Review Again</button></div>`}</div>`;
  }
  function finishOneReview(entry, known) {
    const sel=document.getElementById('saReviewInterval');
    let interval=known?Number(sel?.value||state.settings.defaultInterval):1;
    if(sel?.value==='custom') interval=Number(document.getElementById('saCustomReviewInterval')?.value||7);
    interval=Math.max(1,Math.min(365,interval||1));
    const next=new Date(); next.setHours(0,0,0,0); next.setDate(next.getDate()+interval);
    const data={learnedAt:today(),intervalDays:interval,nextReview:`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`,reviews:1};
    if(entry.type==='word'){
      const legacy=getLegacy();
      const prior=legacy.learned[entry.id]; data.reviews=(prior?.reviews||0)+1; legacy.learned[entry.id]=data; localStorage.setItem(LEGACY_KEY,JSON.stringify(legacy));
    } else state.phraseLearned[entry.id]=data;
    state.reviewHistory.unshift({type:entry.type,id:entry.id,known,reviewedAt:new Date().toISOString(),intervalDays:interval});
    state.reviewHistory=state.reviewHistory.slice(0,1000); persist();
    reviewSession.index++; reviewSession.revealed=false;
    if(reviewSession.index>=reviewSession.items.length){reviewSession=null;renderRecallHome();toast('Revision session completed.');}
    else renderReviewCard();
  }

  // Insights: active study time, exam frequency and data diagnostics.
  function formatStudyCategory(key) { return key; }
  function runIntegrityChecks() {
    const issues=[];
    const seenWordIds=new Set(),seenWordNames=new Set();
    words.forEach(w=>{
      if(seenWordIds.has(w.id))issues.push({level:'error',title:`Duplicate word ID: ${w.id}`,detail:'Two dictionary entries share the same ID.'}); seenWordIds.add(w.id);
      const n=w.word.toLowerCase(); if(seenWordNames.has(n))issues.push({level:'warning',title:`Duplicate word: ${w.word}`,detail:'Check whether the entries should be merged.'}); seenWordNames.add(n);
      if(!w.english||!w.banglaDefinition||!w.banglaMeaning)issues.push({level:'warning',title:`Incomplete dictionary entry: ${w.word}`,detail:'One or more definition/translation fields are empty.'});
      if(!Array.isArray(w.synonyms)||!Array.isArray(w.antonyms))issues.push({level:'warning',title:`Missing relationship arrays: ${w.word}`,detail:'Synonym or antonym data is not structured as a list.'});
    });
    const seenPhrases=new Set();
    phrases.forEach(p=>{const n=p.phrase.toLowerCase();if(seenPhrases.has(n))issues.push({level:'warning',title:`Duplicate phrase: ${p.phrase}`,detail:'Check duplicate phrase records.'});seenPhrases.add(n);if(!p.meaning||!p.bangla)issues.push({level:'warning',title:`Incomplete phrase: ${p.phrase}`,detail:'English or Bengali explanation is missing.'});});
    exams.forEach(e=>{
      if(!e.source)issues.push({level:'warning',title:`Missing source: ${e.id}`,detail:'This examination record does not include a source URL.'});
      if(e.wordId&&!wordById(e.wordId))issues.push({level:'error',title:`Broken word link: ${e.id}`,detail:`Cannot find dictionary word ID ${e.wordId}.`});
      if(e.phraseId&&!phraseById(e.phraseId))issues.push({level:'error',title:`Broken phrase link: ${e.id}`,detail:`Cannot find phrase ID ${e.phraseId}.`});
      if(!e.wordId&&!e.phraseId)issues.push({level:'warning',title:`Unlinked question: ${e.id}`,detail:'Question is not linked to a word or phrase.'});
      if(!Array.isArray(e.options)||e.options.length!==4)issues.push({level:'warning',title:`Options need checking: ${e.id}`,detail:'This record does not have exactly four supplied options.'});
      if(e.answer!==null && e.answer!==undefined && (!Array.isArray(e.options)||e.answer<0||e.answer>=e.options.length))issues.push({level:'error',title:`Invalid answer index: ${e.id}`,detail:'The stored correct-answer index does not match the options.'});
      if(e.status==='Answer disputed')issues.push({level:'warning',title:`Disputed answer: ${e.id}`,detail:'Published answer key needs independent review.'});
      if(!['official_paper_checked','answer_key_checked','Officially verified','Verified'].includes(e.status))issues.push({level:'info',title:`Not fully verified: ${e.id}`,detail:`Current status: ${e.status||'unspecified'}. Do not count this as verified.`});
    });
    return issues;
  }
  function verifiedExam(e) { return ['official_paper_checked','answer_key_checked','Officially verified','Verified'].includes(e.status); }
  function getStudyDay(day) { return state.study[day] || {totalSeconds:0,categories:{}}; }
  function renderInsights() {
    const day=today(), todayData=getStudyDay(day), last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {day:k,data:getStudyDay(k)};});
    const weekSeconds=last7.reduce((s,x)=>s+x.data.totalSeconds,0);
    const categories=Object.entries(todayData.categories||{}).sort((a,b)=>b[1]-a[1]);
    const max=Math.max(1,...last7.map(x=>x.data.totalSeconds));
    const frequencies=words.map(w=>{const ap=exams.filter(e=>e.wordId===w.id);return {word:w,verified:ap.filter(verifiedExam).length,provisional:ap.filter(e=>!verifiedExam(e)).length};}).filter(x=>x.verified||x.provisional).sort((a,b)=>b.provisional-a.provisional||b.verified-a.verified);
    const issues=runIntegrityChecks();
    root.innerHTML=`<div class="page-head"><div><div class="eyebrow">YOUR LEARNING ANALYTICS</div><h1>Aura Insights</h1><p>See how much active time you spend learning, which parts of the platform you use, and how complete the examination archive is.</p></div><span class="sa-pill">Stored locally</span></div>
      <div class="grid grid-3"><div class="card stat-card"><div class="stat-icon">◷</div><div><div class="stat-value">${countTime(todayData.totalSeconds)}</div><div class="stat-label">Active study time today</div></div></div><div class="card stat-card"><div class="stat-icon gold">▤</div><div><div class="stat-value">${countTime(weekSeconds)}</div><div class="stat-label">Active study time, last 7 days</div></div></div><div class="card stat-card"><div class="stat-icon blue">✓</div><div><div class="stat-value">${state.reviewHistory.length}</div><div class="stat-label">Flashcard reviews recorded</div></div></div></div>
      <div class="sa-settings-grid" style="margin-top:15px"><section class="sa-panel"><div class="sa-section-title" style="margin-top:0"><h2>Today by activity</h2><span class="card-kicker">${friendlyDate(day)}</span></div>${categories.length?`<div class="sa-activity-bars">${categories.map(([name,sec])=>`<div class="sa-activity-row"><span>${esc(formatStudyCategory(name))}</span><div class="sa-bar"><span style="width:${Math.max(2,sec/Math.max(1,todayData.totalSeconds)*100)}%"></span></div><strong>${countTime(sec)}</strong></div>`).join('')}</div>`:'<div class="sa-empty">Your active study time will appear here as you use the website.</div>'}</section>
      <section class="sa-panel"><div class="sa-section-title" style="margin-top:0"><h2>Last 7 days</h2><span class="card-kicker">ACTIVE TIME</span></div><div style="display:flex;align-items:end;gap:10px;height:170px">${last7.map(x=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%;justify-content:end"><strong style="font-size:10px">${Math.round(x.data.totalSeconds/60)}m</strong><div style="width:100%;height:${Math.max(5,x.data.totalSeconds/max*100)}%;background:#6e987c;border-radius:7px 7px 2px 2px"></div><small class="muted">${x.day.slice(8)}</small></div>`).join('')}</div><div style="margin-top:12px">${last7.slice().reverse().map(x=>`<div class="list-row"><div class="list-row-main"><strong>${friendlyDate(x.day)}</strong><small>Local date</small></div><strong>${countTime(x.data.totalSeconds)}</strong></div>`).join('')}</div><p class="small-note" style="margin-top:10px">Only visible, recently active use is counted. A tab that stays open in the background or idle is not treated as study time.</p></section></div>
      <div class="sa-section-title"><h2>Examination frequency & trends</h2><span class="card-kicker">VERIFIED RECORDS ONLY</span></div><div class="sa-notice"><span class="sa-notice-icon">ⓘ</span><div><strong>${exams.filter(verifiedExam).length} verified appearances</strong><br><span class="sa-muted">The current starter archive mostly contains draft transcriptions. Provisional records are listed separately and are not used as verified frequency counts.</span></div></div>
      <div class="sa-panel"><div class="sa-section-title" style="margin-top:0"><h3>Words with examination records</h3><span class="sa-pill warn">Provisional counts separate</span></div>${frequencies.length?frequencies.map(x=>`<div class="list-row"><div class="list-row-main"><strong>${esc(x.word.word)}</strong><small>${esc(x.word.banglaMeaning)}</small></div><div style="text-align:right"><strong>${x.verified} verified</strong><div class="small-note">${x.provisional} provisional</div></div></div>`).join(''):'<div class="sa-empty">No linked examination appearances in the current dataset.</div>'}</div>
      <div class="sa-section-title"><h2>Data Integrity Checker</h2><span class="sa-pill ${issues.some(i=>i.level==='error')?'warn':'good'}">${issues.length} findings</span></div><div class="sa-panel"><div class="sa-toolbar"><strong>${words.length} words · ${phrases.length} phrases · ${exams.length} PYQ records</strong><button class="btn btn-secondary btn-small" data-v2-action="run-integrity">Run checks again</button></div><div style="margin-top:10px">${issues.slice(0,80).map(i=>`<div class="list-row"><div class="list-row-main"><strong>${esc(i.title)}</strong><small>${esc(i.detail)}</small></div><span class="sa-pill ${i.level==='error'?'warn':i.level==='warning'?'warn':''}">${i.level}</span></div>`).join('')||'<div class="sa-empty">No issues detected in the current local data.</div>'}</div><p class="small-note" style="margin-top:12px">The checker reports issues but does not change or delete any dictionary or examination records.</p></div>`;
  }

  // Active time tracker. It only increments while the page is visible and recently active.
  let lastActivity=Date.now(), lastTick=Date.now();
  const noteActivity=()=>{lastActivity=Date.now();};
  ['pointerdown','keydown','touchstart','wheel','scroll'].forEach(ev=>document.addEventListener(ev,noteActivity,{passive:true}));
  function trackTick() {
    const now=Date.now(), delta=Math.min(20,Math.max(0,(now-lastTick)/1000)); lastTick=now;
    if(document.visibilityState==='visible' && now-lastActivity<180000 && delta>0){
      const day=today(), key=categoryForTime();
      if(!state.study[day])state.study[day]={totalSeconds:0,categories:{}};
      state.study[day].totalSeconds=(state.study[day].totalSeconds||0)+delta;
      state.study[day].categories[key]=(state.study[day].categories[key]||0)+delta;
      persist();
    }
  }
  setInterval(trackTick,15000);
  document.addEventListener('visibilitychange',()=>{lastTick=Date.now();if(document.visibilityState==='visible')noteActivity();});

  // Settings and local-first data management.
  function renderSettings() {
    const s=state.settings;
    root.innerHTML=`<div class="page-head"><div><div class="eyebrow">PERSONALISE YOUR EXPERIENCE</div><h1>Settings</h1><p>Adjust the appearance, navigation, reminders and local data tools for this browser.</p></div><span class="sa-pill">Static release · Local data</span></div>
      <div class="sa-settings-grid"><section class="sa-panel"><h2>Appearance</h2><div class="sa-setting-row"><div><label for="saTheme">Dark mode</label><div class="small-note">Switch between light and dark themes.</div></div><input id="saTheme" type="checkbox" ${s.theme==='dark'?'checked':''}></div><div class="sa-setting-row"><div><label for="saFontScale">Text size</label><div class="small-note">A modest adjustment to improve reading comfort.</div></div><strong id="saFontValue">${Math.round(s.fontScale*100)}%</strong></div><input id="saFontScale" type="range" min="1" max="1.16" step="0.02" value="${s.fontScale}" style="width:100%"><div class="sa-muted" style="font-size:12px">Default is slightly larger than the first prototype. Larger options remain restrained.</div></section>
      <section class="sa-panel"><h2>Navigation</h2><div class="sa-setting-row"><label for="saNavPosition">Navigation panel position</label><select id="saNavPosition" class="sa-field"><option value="left" ${s.navPosition==='left'?'selected':''}>Left</option><option value="right" ${s.navPosition==='right'?'selected':''}>Right</option><option value="top" ${s.navPosition==='top'?'selected':''}>Top</option><option value="bottom" ${s.navPosition==='bottom'?'selected':''}>Bottom</option></select></div><div class="sa-setting-row"><div><label for="saNavCollapsed">Hide navigation panel</label><div class="small-note">Use the floating menu button to bring it back.</div></div><input id="saNavCollapsed" type="checkbox" ${s.navCollapsed?'checked':''}></div></section>
      <section class="sa-panel"><h2>Review reminders</h2><div class="sa-setting-row"><div><label for="saReminders">Enable reminders</label><div class="small-note">Show an in-app reminder and browser notification when reviews are due.</div></div><input id="saReminders" type="checkbox" ${s.reminders?'checked':''}></div><div class="sa-setting-row"><label for="saReminderTime">Daily reminder time</label><input id="saReminderTime" class="sa-field" type="time" value="${esc(s.reminderTime)}"></div><button class="btn btn-secondary btn-small" data-v2-action="enable-notifications">Enable browser notifications</button><p class="small-note" style="margin-top:10px">Browser notifications work only where the browser supports them and permission is granted. With this static site, reminders can run while the site is open, not when the browser is fully closed.</p></section>
      <section class="sa-panel"><h2>Revision preferences</h2><div class="sa-setting-row"><label for="saDefaultInterval">Default next review interval</label><select id="saDefaultInterval" class="sa-field"><option value="1" ${s.defaultInterval==1?'selected':''}>1 day</option><option value="3" ${s.defaultInterval==3?'selected':''}>3 days</option><option value="7" ${s.defaultInterval==7?'selected':''}>7 days</option><option value="14" ${s.defaultInterval==14?'selected':''}>14 days</option><option value="28" ${s.defaultInterval==28?'selected':''}>28 days</option></select></div><p class="small-note">You can still choose a different interval on individual flashcards.</p></section></div>
      <div class="sa-section-title"><h2>Data Management</h2><span class="card-kicker">BACKUP & RESTORE</span></div><section class="sa-panel"><div class="grid grid-2"><div><h3>Export My Data</h3><p class="sa-muted">Download saved words, difficult words, learned status, review schedules, collections, study time, reports, quiz history and preferences as a versioned JSON backup.</p><button class="btn btn-primary" data-v2-action="export-data">↓ Export backup</button></div><div><h3>Import My Data</h3><p class="sa-muted">Restore a previous backup on this device. Existing information is merged carefully, not silently overwritten.</p><label class="btn btn-secondary" for="saImportFile">↑ Choose backup file</label><input id="saImportFile" type="file" accept=".json,application/json" style="display:none"></div></div><p class="small-note" style="margin-top:14px">Your data is stored in this browser. Export a backup before clearing browser data or moving to another device.</p></section>
      <div class="sa-section-title"><h2>Information & Legal</h2></div><div class="grid grid-3"><button class="sa-mini-card" data-v2-action="info" data-view="privacy"><strong>Privacy Policy</strong><p>How local data is handled.</p></button><button class="sa-mini-card" data-v2-action="info" data-view="terms"><strong>Terms of Use</strong><p>Use of the static prototype.</p></button><button class="sa-mini-card" data-v2-action="info" data-view="sources"><strong>Sources & References</strong><p>Question and dictionary references.</p></button><button class="sa-mini-card" data-v2-action="info" data-view="disclaimer"><strong>Examination Data Disclaimer</strong><p>Source and verification status.</p></button><button class="sa-mini-card" data-v2-action="info" data-view="accuracy"><strong>Content Accuracy Policy</strong><p>How issues are flagged.</p></button><button class="sa-mini-card" data-v2-action="info" data-view="contact"><strong>Contact & Feedback</strong><p>Suggest corrections and improvements.</p></button><button class="sa-mini-card" data-v2-action="info" data-view="developer"><strong>Developer & Credits</strong><p>Developer, contributors and acknowledgements.</p></button></div>`;
  }
  function renderDeveloper() {
    root.innerHTML=`<div class="breadcrumb"><button data-v2-action="info" data-view="settings">Settings</button><span>›</span><strong>Developer</strong></div><div class="page-head"><div><div class="eyebrow">ABOUT THE PEOPLE BEHIND THE PROJECT</div><h1>Developer & Credits</h1><p>This section is reserved for the developer, contributors and honourable mentions. The placeholders can be filled in when the details are ready.</p></div></div><div class="grid grid-2"><section class="sa-panel"><div class="eyebrow">DEVELOPER</div><h2>Developer Information</h2><div class="sa-empty">Developer name, profile, biography and contact details will be added here.</div></section><section class="sa-panel"><div class="eyebrow">CONTRIBUTORS</div><h2>Development Team</h2><div class="sa-empty">Contributor names and roles will be added here.</div></section><section class="sa-panel"><div class="eyebrow">ACKNOWLEDGEMENTS</div><h2>Honourable Mentions</h2><div class="sa-empty">Honourable mentions and special thanks will be added here.</div></section><section class="sa-panel"><div class="eyebrow">TECHNOLOGY & RESOURCES</div><h2>Credits</h2><div class="sa-empty">Technology, design and data-source credits will be added here.</div></section></div>`;
  }
  function renderInfo(view) {
    const content={
      privacy:['Privacy Policy','This is a static prototype. Vocabulary preferences, personal collections, saved words, review schedules, study time and reports are stored locally in this browser. This release does not provide user accounts, cloud storage or cross-device synchronisation. Export a backup before clearing browser data. Browser notifications require your permission.'],
      terms:['Terms of Use','Use this learning prototype for personal educational practice. Examination records may be draft transcriptions and should be checked against original papers and official answer keys. Do not treat provisional records as official copies. Dictionary explanations should be checked against authoritative references for high-stakes use.'],
      sources:['Sources & References','Examination record sources are linked from individual Aura PYQ entries. Dictionary meanings, Bengali explanations and examples are starter educational content and should be reviewed before publication. This page will later include a structured bibliography and source attribution.'],
      disclaimer:['Examination Data Disclaimer','Question records in this prototype are provisional unless explicitly marked as verified. Some answer options may be incomplete and some answer keys are disputed. Exam frequency counts in Aura Insights include only records explicitly marked as verified. A missing record does not mean a word never appeared in an examination.'],
      accuracy:['Content Accuracy Policy','Shobdo Aura aims to keep definitions, translations, examination details and answer keys accurate. Users can report problems. The Data Integrity Checker identifies incomplete or inconsistent records but does not automatically change source data. Reports are stored locally in this static release.'],
      contact:['Contact & Feedback','Use the Report an Issue control on a word or question to save a correction report locally. A public contact address or feedback channel can be added when the project has one. No contact address is invented in this prototype.']
    };
    if(view==='developer'){renderDeveloper();return;}
    const c=content[view]||['Information',''];
    const sourceList=view==='sources'?[...new Set(exams.map(e=>e.source).filter(Boolean))]:[];
    root.innerHTML=`<div class="breadcrumb"><button data-v2-action="info" data-view="settings">Settings</button><span>›</span><strong>${esc(c[0])}</strong></div><div class="page-head"><div><div class="eyebrow">SHOBDO AURA · INFORMATION</div><h1>${esc(c[0])}</h1><p>Project information for the current static release.</p></div></div><section class="sa-panel"><p class="sa-muted" style="font-size:15px;line-height:1.9">${esc(c[1])}</p>${sourceList.length?`<div class="sa-section-title"><h3>Question archive references</h3><span class="sa-pill">${sourceList.length} sources</span></div>${sourceList.map(url=>`<div class="list-row"><div class="list-row-main"><strong>${esc(new URL(url).hostname)}</strong><small>${esc(url)}</small></div><a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-small">Open ↗</a></div>`).join('')}`:''}</section><div style="margin-top:16px"><button class="btn btn-secondary" data-v2-action="info" data-view="settings">← Back to Settings</button></div>`;
  }

  // Import/export is versioned and additive. Existing local data is not silently replaced.
  function exportData() {
    const backup={app:'Shobdo Aura',backupVersion:2,exportedAt:new Date().toISOString(),description:'Local-first backup for the Shobdo Aura static website.',legacy:getLegacy(),v2:state};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`shobdo-aura-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Backup exported. Keep the JSON file somewhere safe.');
  }
  function mergeUnique(a,b,keyFn=x=>x) { const out=[...(Array.isArray(a)?a:[])];const seen=new Set(out.map(keyFn));(Array.isArray(b)?b:[]).forEach(x=>{const k=keyFn(x);if(!seen.has(k)){seen.add(k);out.push(x);}});return out; }
  function importData(file) {
    const reader=new FileReader();
    reader.onload=()=>{
      try {
        const backup=JSON.parse(reader.result);
        if(backup.app!=='Shobdo Aura'||!backup.legacy||!backup.v2||![1,2].includes(Number(backup.backupVersion)))throw new Error('This does not appear to be a supported Shobdo Aura backup.');
        const incoming=backup.legacy, current=getLegacy();
        const saved=mergeUnique(current.saved,incoming.saved);const difficult=mergeUnique(current.difficult,incoming.difficult);
        const learned={...incoming.learned,...current.learned};
        const history=mergeUnique(current.history,incoming.history,x=>`${x.type}|${x.id}|${x.at}`);
        const mergedLegacy={saved,difficult,learned,history};
        localStorage.setItem(LEGACY_KEY,JSON.stringify(mergedLegacy));
        const v=backup.v2;
        const importPreferences=confirm('Also apply the appearance, navigation and reminder preferences from this backup?\nChoose Cancel to keep your current preferences.');
        if(importPreferences && v.settings) state.settings=Object.assign(state.settings,v.settings);
        state.collections=mergeUnique(state.collections,v.collections,c=>c.id||c.name);
        state.phraseLearned={...(v.phraseLearned||{}),...state.phraseLearned};
        state.reviewHistory=mergeUnique(state.reviewHistory,v.reviewHistory,x=>`${x.type}|${x.id}|${x.reviewedAt}`);
        state.reports=mergeUnique(state.reports,v.reports,x=>x.id||`${x.createdAt}|${x.targetId}`);
        state.quizHistory=mergeUnique(state.quizHistory,v.quizHistory,x=>x.id||x.completedAt);
        Object.entries(v.study||{}).forEach(([day,incomingDay])=>{
          if(!state.study[day])state.study[day]={totalSeconds:0,categories:{}};
          state.study[day].totalSeconds=Math.max(state.study[day].totalSeconds||0,incomingDay.totalSeconds||0);
          Object.entries(incomingDay.categories||{}).forEach(([k,s])=>{state.study[day].categories[k]=Math.max(state.study[day].categories[k]||0,s||0);});
        });
        // Keep current preferences by default; import does not silently change the user's interface.
        persist();
        alert(`Backup imported and merged.\nSaved words: ${saved.length}\nDifficult words: ${difficult.length}\nCollections: ${state.collections.length}\nExisting entries were preserved. The page will reload to refresh the imported data.`);
        window.location.reload();
      } catch(err) { alert(`Import failed: ${err.message}`); }
    };
    reader.onerror=()=>alert('Could not read that backup file.');
    reader.readAsText(file);
  }

  // Issue reporting for word, phrase and question records.
  function openReport(kind,id) {
    const item=kind==='word'?wordById(id):kind==='phrase'?phraseById(id):examById(id);
    const label=kind==='word'?item?.word:kind==='phrase'?item?.phrase:item?.exam+' · '+item?.id;
    const rootModal=document.getElementById('modalRoot');
    rootModal.innerHTML=`<div class="sa-modal-backdrop" data-v2-action="close-modal"><div class="sa-modal-card" role="dialog" aria-modal="true" aria-labelledby="saReportTitle" onclick="event.stopPropagation()"><div class="modal-head"><h3 id="saReportTitle">Report an issue</h3><button class="icon-btn" data-v2-action="close-modal">×</button></div><p class="sa-muted">Report an incorrect definition, translation, exam detail, option or answer.</p><form id="saReportForm" class="sa-report-form"><input type="hidden" id="saReportKind" value="${esc(kind)}"><input type="hidden" id="saReportId" value="${esc(id)}"><strong>${esc(label||'Unknown record')}</strong><label>Problem type<select id="saReportType" class="sa-field"><option>Incorrect English definition</option><option>Incorrect Bengali definition or meaning</option><option>Incorrect synonym or antonym</option><option>Incorrect question or options</option><option>Incorrect answer key</option><option>Incorrect examination metadata</option><option>Missing or broken source</option><option>Other</option></select></label><label>Details<textarea id="saReportDetails" class="sa-field" rows="4" placeholder="Describe what should be checked..."></textarea></label><div class="sa-modal-actions"><button type="button" class="btn btn-secondary" data-v2-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Save report</button></div></form></div></div>`;
  }
  function saveReport(form) {
    const kind=form.querySelector('#saReportKind').value,id=form.querySelector('#saReportId').value;
    state.reports.unshift({id:`report-${Date.now()}`,kind,targetId:id,type:form.querySelector('#saReportType').value,details:form.querySelector('#saReportDetails').value.trim(),createdAt:new Date().toISOString(),status:'Pending local review'});
    persist();document.getElementById('modalRoot').innerHTML='';toast('Issue report saved on this device.');
  }

  // Word page enhancements are inserted without replacing the first prototype's detail layout.
  const collocations={
    immoral:['immoral act','immoral behaviour','morally immoral conduct'],irritable:['irritable mood','irritable person','become irritable'],bankrupt:['go bankrupt','declare bankruptcy','bankrupt company'],ideal:['ideal solution','ideal candidate','ideal conditions'],mobilized:['mobilize resources','mobilize support','mobilize public opinion'],habit:['form a habit','break a habit','daily habit'],pernicious:['pernicious effect','pernicious influence','pernicious consequences'],volatile:['volatile situation','volatile market','volatile substance'],lacuna:['significant lacuna','legal lacuna','a lacuna in the record'],destitute:['destitute family','destitute condition','destitute people'],resentment:['deep resentment','harbour resentment','feel resentment'],percipience:['keen percipience','perceptive insight'],hangar:['aircraft hangar','hangar facility'],crepuscular:['crepuscular animals','crepuscular activity'],abolish:['abolish a law','abolish a system','abolish a practice'],concur:['concur with someone','concur that','fully concur'],prudent:['prudent decision','prudent approach','prudent measure'],reluctant:['reluctant to agree','reluctant participant','reluctant decision'],benign:['benign influence','benign nature','benign condition'],mitigate:['mitigate risk','mitigate effects','mitigate damage'],scarcity:['scarcity of resources','water scarcity','food scarcity'],authentic:['authentic document','authentic source','authentic account'],barter:['barter goods','barter system','barter with someone']
  };
  function enhanceWordDetail() {
    const head=root.querySelector('.word-detail-head');
    const layout=root.querySelector('.detail-layout');
    if(!head||!layout||layout.dataset.v2Enhanced==='true')return;
    const wordName=head.querySelector('h1')?.textContent?.trim();
    const w=words.find(x=>x.word.toLowerCase()===wordName?.toLowerCase()); if(!w)return;
    layout.dataset.v2Enhanced='true';
    const actionBar=head.querySelector('.detail-actions');
    if(actionBar){
      actionBar.insertAdjacentHTML('beforeend',`<button class="btn btn-secondary" data-v2-action="report" data-kind="word" data-id="${esc(w.id)}">Report an Issue</button><button class="btn btn-secondary" data-v2-action="reading-mode">Reading Mode</button>`);
    }
    const mainCol=layout.querySelector(':scope > div');
    const aside=layout.querySelector(':scope > aside');
    const cols=collocations[w.id]||[];
    const related=words.filter(other=>other.id!==w.id && (other.synonyms||[]).some(s=>(w.synonyms||[]).some(t=>t.toLowerCase()===s.toLowerCase())));
    if(mainCol){
      mainCol.insertAdjacentHTML('beforeend',`<section class="card definition-card"><h3><span class="definition-index">08</span> Collocations & Usage</h3><p class="sa-muted">Common combinations that help you use the word naturally.</p><div class="sa-chip-row">${cols.map(x=>`<span class="sa-chip">${esc(x)}</span>`).join('')}</div></section><section class="card definition-card"><h3><span class="definition-index">09</span> Synonym Cluster</h3><p class="sa-muted">Related vocabulary entries connected through shared synonym relationships.</p><div class="sa-chip-row">${related.length?related.map(x=>`<button class="chip syn" data-action="open-word" data-id="${esc(x.id)}">${esc(x.word)}</button>`).join(''):'<span class="muted">No linked dictionary entries in this starter dataset yet.</span>'}</div></section>`);
    }
    if(aside){
      const appearances=exams.filter(e=>e.wordId===w.id);
      const verified=appearances.filter(verifiedExam).length;
      const provisional=appearances.length-verified;
      aside.insertAdjacentHTML('beforeend',`<section class="card side-card"><h3>Examination Frequency</h3><div style="display:flex;gap:18px;align-items:center"><div><div class="stat-value">${verified}</div><small>Verified</small></div><div><div class="stat-value">${provisional}</div><small>Provisional</small></div></div><p class="small-note" style="margin-top:8px">Only records marked verified count towards official frequency trends.</p></section><section class="card side-card"><h3>Add to My Collections</h3>${state.collections.length?`<select class="sa-field" id="saAddCollectionSelect" style="width:100%">${state.collections.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-primary btn-small" style="margin-top:9px;width:100%" data-v2-action="add-word-to-collection" data-id="${esc(w.id)}">Add word to collection</button>`:`<p class="small-note">Create a personal collection first.</p><button class="btn btn-secondary btn-small" data-v2-action="create-collection-from-word" data-id="${esc(w.id)}">＋ Create collection with this word</button>`}</section>`);
    }
  }
  const observer=new MutationObserver(()=>{enhanceWordDetail(); addQuestionReportButtons();});
  observer.observe(root,{childList:true,subtree:true});
  function addQuestionReportButtons() {
    root.querySelectorAll('.question-card').forEach(card=>{
      if(card.querySelector('[data-v2-action="report-question"]'))return;
      const id=card.querySelector('.question-id')?.textContent?.trim(); if(!id)return;
      const footer=card.querySelector('.question-foot');
      footer?.insertAdjacentHTML('beforeend',`<button class="text-link" data-v2-action="report" data-kind="question" data-id="${esc(id)}">Report this question</button>`);
    });
  }

  // Review due reminder banner and browser notification. Requires the page to remain open.
  function checkReminders() {
    if(!state.settings.reminders)return;
    const due=allDue(); if(!due.length)return;
    const now=new Date(),time=state.settings.reminderTime||'19:00',parts=time.split(':').map(Number),mins=now.getHours()*60+now.getMinutes(),target=(parts[0]||0)*60+(parts[1]||0);
    if(mins<target || state.lastReminderDay===today())return;
    state.lastReminderDay=today();state.lastReminderAt=now.toISOString();persist();
    if('Notification' in window && Notification.permission==='granted'){
      try { const n=new Notification('Shobdo Aura · Review reminder',{body:`You have ${due.length} vocabulary item${due.length===1?'':'s'} due. Start a Recall session.`});n.onclick=()=>{window.focus();setV2View('recall');n.close();}; } catch(_){toast(`${due.length} items are due for revision.`);}
    } else toast(`${due.length} items are due for revision. Open Recall to review them.`);
  }
  checkReminders();setInterval(checkReminders,60000);

  // Local activity links, forms, settings changes and flashcards.
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-v2-action]');if(!b)return;
    const a=b.dataset.v2Action,id=b.dataset.id;
    if(a==='phrase-letter'){phraseLetter=b.dataset.letter;phraseQuery='';renderPhrases();}
    else if(a==='phrase-clear'){phraseLetter='';phraseQuery='';renderPhrases();}
    else if(a==='open-phrase-detail'){renderPhraseDetail(id);}
    else if(a==='back-phrases'){phraseLetter='';phraseQuery='';setV2View('phrases');}
    else if(a==='create-collection'){const name=prompt('Name your vocabulary collection:');if(name?.trim()){state.collections.push({id:`col-${Date.now()}`,name:name.trim(),wordIds:[],phraseIds:[],createdAt:new Date().toISOString()});persist();renderCollections();toast('Collection created.');}}
    else if(a==='create-collection-from-word'){const name=prompt('Name your new collection:');if(name?.trim()){state.collections.push({id:`col-${Date.now()}`,name:name.trim(),wordIds:[id],phraseIds:[],createdAt:new Date().toISOString()});persist();toast('Collection created and word added.');enhanceWordDetail();}}
    else if(a==='open-collection'){state.selectedCollection=id;persist();renderCollections();}
    else if(a==='toggle-phrase-save'){let c;if(!state.collections.length){const name=prompt('Name your new collection:');if(name?.trim()){c={id:`col-${Date.now()}`,name:name.trim(),wordIds:[],phraseIds:[id],createdAt:new Date().toISOString()};state.collections.push(c);}}else{const idx=Number(prompt(`Add this phrase to which collection?\n${state.collections.map((x,i)=>`${i+1}. ${x.name}`).join('\n')}`))-1;c=state.collections[idx];if(c){c.phraseIds=Array.isArray(c.phraseIds)?c.phraseIds:[];if(!c.phraseIds.includes(id))c.phraseIds.push(id);}}persist();toast(c?'Phrase added to collection.':'No collection selected.');}
    else if(a==='close-collection'){state.selectedCollection='';persist();renderCollections();}
    else if(a==='delete-collection'){if(confirm('Delete this collection? Words themselves will not be deleted.')){state.collections=state.collections.filter(c=>c.id!==id);state.selectedCollection='';persist();renderCollections();}}
    else if(a==='add-word-to-collection'){const cid=document.getElementById('saAddCollectionSelect')?.value,c=state.collections.find(x=>x.id===cid);if(c){c.wordIds=Array.isArray(c.wordIds)?c.wordIds:[];if(!c.wordIds.includes(id))c.wordIds.push(id);persist();toast(`Added to ${c.name}.`);}}
    else if(a==='add-collection-words'){const c=state.collections.find(x=>x.id===id);if(c){const text=prompt('Enter word names separated by commas:');if(text){const ids=text.split(',').map(s=>s.trim().toLowerCase()).map(s=>words.find(w=>w.word.toLowerCase()===s)?.id).filter(Boolean);c.wordIds=mergeUnique(c.wordIds,ids);persist();renderCollections();}}}
    else if(a==='review-collection'){const c=state.collections.find(x=>x.id===id);if(c)startReview((c.wordIds||[]).map(id=>({type:'word',id})).concat((c.phraseIds||[]).map(id=>({type:'phrase',id}))));}
    else if(a==='quick-collection'){const l=getLegacy(),items=b.dataset.kind==='saved'?l.saved:l.difficult;startReview(items.map(id=>({type:'word',id})));}
    else if(a==='start-due'){startReview(getDueEntries());}
    else if(a==='quick-review'){const n=Number(b.dataset.count)||5;const list=[...allEntries()].sort(()=>Math.random()-.5).slice(0,n);startReview(list);}
    else if(a==='review-pool'){const pool=b.dataset.pool,l=getLegacy();let items=pool==='saved'?l.saved.map(id=>({type:'word',id})):pool==='difficult'?l.difficult.map(id=>({type:'word',id})):pool==='phrases'?phrases.map(p=>({type:'phrase',id:p.id})):allEntries();startReview(items);}
    else if(a==='review-one'){startReview([{type:b.dataset.type||'word',id}]);}
    else if(a==='reveal-card'){if(reviewSession){reviewSession.revealed=true;renderReviewCard();}}
    else if(a==='review-known'||a==='review-again'){if(reviewSession){const entry=reviewSession.items[reviewSession.index];finishOneReview(entry,a==='review-known');}}
    else if(a==='end-review'){reviewSession=null;renderRecallHome();}
    else if(a==='speak'){const text=b.dataset.text||'';if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';speechSynthesis.speak(u);}else toast('Speech is not available in this browser.');}
    else if(a==='reading-mode'){root.classList.toggle('sa-reading-mode');toast(root.classList.contains('sa-reading-mode')?'Reading mode enabled.':'Reading mode closed.');}
    else if(a==='report'){openReport(b.dataset.kind||'word',id);}
    else if(a==='close-modal'){document.getElementById('modalRoot').innerHTML='';}
    else if(a==='info'){setV2View(b.dataset.view);}
    else if(a==='run-integrity'){renderInsights();toast('Data integrity checks completed.');}
    else if(a==='export-data'){exportData();}
    else if(a==='enable-notifications'){
      if(!('Notification'in window)){toast('This browser does not support notifications.');}
      else if(!window.isSecureContext){toast('Browser notifications require HTTPS or localhost. In-app reminders remain available.');}
      else Notification.requestPermission().then(p=>toast(p==='granted'?'Browser notifications enabled.': 'Notification permission was not granted.'));
    }
  });

  document.addEventListener('submit',event=>{
    if(event.target.id==='saReportForm'){event.preventDefault();saveReport(event.target);}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='saPhraseSearch'){phraseQuery=event.target.value;renderPhrases();const f=document.getElementById('saPhraseSearch');f?.focus();f?.setSelectionRange(f.value.length,f.value.length);}
    if(event.target.id==='saFontScale'){const val=Number(event.target.value);state.settings.fontScale=val;document.documentElement.style.setProperty('--sa-font-scale',String(val));document.body.style.fontSize=`calc(15px * ${val})`;document.getElementById('saFontValue').textContent=`${Math.round(val*100)}%`;persist();}
  });
  document.addEventListener('change',event=>{
    const t=event.target;
    if(t.id==='saTheme'){state.settings.theme=t.checked?'dark':'light';applySettings();}
    if(t.id==='saNavPosition'){state.settings.navPosition=t.value;applySettings();toast(`Navigation moved to ${t.value}.`);}
    if(t.id==='saNavCollapsed'){state.settings.navCollapsed=t.checked;applySettings();}
    if(t.id==='saReminders'){state.settings.reminders=t.checked;persist();if(t.checked)checkReminders();}
    if(t.id==='saReminderTime'){state.settings.reminderTime=t.value;persist();}
    if(t.id==='saDefaultInterval'){state.settings.defaultInterval=Number(t.value);persist();}
    if(t.id==='saImportFile'&&t.files?.[0])importData(t.files[0]);
    if(t.id==='saReviewInterval'){const custom=document.getElementById('saCustomReviewInterval');if(custom)custom.style.display=t.value==='custom'?'block':'none';}
  });

  // Capture phrase opens from the older first-version UI and route them to the new detail page.
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-action="open-phrase"]');
    if(b){event.preventDefault();event.stopImmediatePropagation();renderPhraseDetail(b.dataset.id);}
  },true);

  // Home-page review nudge and topbar reminder label.
  const homeObserver=new MutationObserver(()=>{
    if(topbarPage?.textContent.trim()==='Overview'){
      const view=root;
      if(!view.querySelector('.sa-home-review-nudge')){
        const due=allDue().length;
        if(due){view.insertAdjacentHTML('afterbegin',`<div class="sa-notice sa-home-review-nudge"><span class="sa-notice-icon">◷</span><div style="flex:1"><strong>${due} items ready for review</strong><br><span class="sa-muted">Your scheduled Recall session is ready.</span></div><button class="btn btn-primary btn-small" data-v2-action="start-due">Review now</button></div>`);}
      }
    }
  });
  homeObserver.observe(root,{childList:true,subtree:true});

  // Start in the existing first-prototype view, preserve the first visual design.
  if(state.uiView && ['insights','settings','collections','phrases','recall'].includes(state.uiView)) {
    // Do not force a previous non-home view on launch. The preference is only for nav layout and theme.
  }
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.view==='dictionary'||b.dataset.view==='pyq'||b.dataset.view==='home'||b.dataset.view==='quiz'||b.dataset.view==='lexicon'||b.dataset.view==='difficult'||b.dataset.view==='history'){state.uiView=b.dataset.view;persist();} }));
  document.getElementById('mobileMenu')?.addEventListener('click',()=>{sidebar?.classList.toggle('open');});
  updateReminderBadge();
  function updateReminderBadge(){const due=allDue().length;reminderBtn.textContent=due?`♢ ${due}`:'♢';reminderBtn.title=due?`${due} review items due`:'Review reminders';}
  setInterval(updateReminderBadge,30000);
  // expose a small diagnostic API for future static admin tooling.
  window.SHOBDO_AURA_V2={runIntegrityChecks,exportData,getState:()=>({settings:state.settings,collections:state.collections,reportCount:state.reports.length})};
})();
