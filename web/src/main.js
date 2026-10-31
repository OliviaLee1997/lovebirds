import './style.css';
import { configureWiki, mountWikiChrome, enhanceReader, clearReader, revealSection, applyCollectionLayout, getView, getReadingSize } from './wiki.js';
import { configureBites, renderBites, renderBite } from './bites.js';

const app = document.querySelector('#app');
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#main')?.focus();
});
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const icons = {
  book: '<path d="M12 7C9 4 5 4 2 5v14c4-1 7-1 10 2 3-3 6-3 10-2V5c-3-1-7-1-10 2Zm0 0v14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  grammar: '<path d="m4 17 5-12 5 12M6 13h6M16 8h5m-5 4h5m-5 4h3M3 21h18"/>',
  speech: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 1.5-6A8 8 0 1 1 21 11Z"/><path d="M7 9h10M7 13h6"/>',
  file: '<path d="M14 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-7-7ZM14 2v7h7M7 13h10M7 17h7"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6 6-6-6 6-6"/>',
  tag: '<path d="M21 13 13 21 2 10V2h8l11 11Z"/><circle cx="7" cy="7" r="1"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let catalog;
let renderId = 0;
let readerSize = getReadingSize();
let menuOpen = false;
let filtersOpen = false;
const cache = new Map();
const config = {
  courses: { label: 'All courses', english: 'THE COURSE COLLECTION', title: 'Course library', description: 'Browse complete lesson notes, or follow a topic across the course.', icon: 'book' },
  'cue-cards': { label: 'Cue cards', english: 'MY SPEAKING COLLECTION', title: 'Cue card collection', description: 'Extended speaking models, linking language and personal grammar notes.', icon: 'speech' },
  topics: { label: 'My topic collections', english: 'MY TOPIC COLLECTIONS', title: 'My topic collections', description: 'Your existing notes, brought together by subject. Read a summary or explore its lessons.', icon: 'layers' },
  grammar: { label: 'Personal grammar', english: 'MY GRAMMAR REVIEW', title: 'Personal grammar review', description: 'Corrections, explanations and exercises organised by grammatical structure.', icon: 'grammar' },
  bites: { label: 'Language Bites', english: 'ONE IDEA AT A TIME', title: 'Language Bites', description: 'Short explanations, useful examples and a little recall practice.', icon: 'grid' },
  resources: { label: 'Reference shelf', english: 'THE REFERENCE SHELF', title: 'Reference shelf', description: 'Reusable IELTS templates and linking-word practice.', icon: 'file' },
};
function currentRoute() {
  const raw = location.hash.slice(1) || '/courses';
  const [pathname, query = ''] = raw.split('?');
  const parts = pathname.split('/').filter(Boolean);
  return { page: parts[0] || 'courses', id: parts[1], params: new URLSearchParams(query) };
}
function url(page, params = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return `#/${page}${search.size ? `?${search}` : ''}`;
}
function readUrl(id, section = '', back = location.hash.slice(1) || '/courses') {
  return url(`read/${id}`, { section, back });
}
function navigate(hash) {
  clearTimeout(queryTimer);
  if (location.hash !== hash) history.pushState(null, '', hash);
  render();
}
function countFor(page) {
  if (page === 'bites') return catalog.bites.length;
  if (page === 'courses') return catalog.documents.filter(d => d.kind === 'lesson').length;
  if (page === 'topics') return catalog.categories.length;
  if (page === 'resources') return catalog.documents.filter(d => d.kind === 'resource').length;
  if (page === 'cue-cards') return catalog.documents.filter(d => d.kind === 'cue-card').length;
  return catalog.documents.find(d => d.id === page)?.groups.length || 0;
}
function activePage(route) {
  if (route.page === 'bite') return 'bites';
  if (route.page !== 'read') return config[route.page] ? route.page : 'courses';
  const kind = catalog.documents.find(d => d.id === route.id)?.kind;
  return ({ lesson: 'courses', topic: 'topics', resource: 'resources', 'cue-card': 'cue-cards', 'cue-reference': 'cue-cards' })[kind] || kind || 'courses';
}
function sidebar(active) {
  return `<aside class="sidebar" id="sidebar" aria-label="Library navigation">
    <a class="brand" href="#/courses"><span class="brand-mark">${icon('book')}</span><span>English Library<small>PERSONAL LEARNING WIKI</small></span></a>
    <p class="nav-caption">COLLECTIONS <span>LIBRARY</span></p>
    <nav>${Object.entries(config).map(([key, value]) => `<a class="nav-link ${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''} href="#/${key}">${icon(value.icon)}<span>${value.label}</span><span class="nav-count">${countFor(key)}</span></a>`).join('')}</nav>
    <div class="sidebar-note"><span class="note-line"></span><p>A place for everything<br>you are learning.</p><small>Read. Connect. Make it yours.</small></div>
    <div class="sidebar-bottom"><span class="status-dot"></span>Personal learning wiki<span>EN</span></div>
  </aside>`;
}
function shell(active) {
  app.innerHTML = `${sidebar(active)}<button class="menu-overlay" aria-label="Close navigation" data-action="menu-close"></button><div class="workspace"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><span class="breadcrumb">Library <span>/</span> <strong>${config[active].label}</strong></span></div><button class="global-search-trigger" data-wiki="search" aria-label="Search all notes">${icon('search')}<span>Search all notes</span><kbd>⌘ K</kbd></button></header><main id="main" tabindex="-1"></main><footer class="site-footer"><span>ENGLISH LIBRARY</span><span>Read. Connect. Revisit.</span></footer></div>`;
  setMenu(false);
  mountWikiChrome();
}
function hero(page) {
  const c = config[page];
  return `<header class="collection-header"><div><p class="eyebrow">PERSONAL ENGLISH WIKI</p><h1>${c.title}</h1><p>${c.description}</p></div><span class="collection-total">${countFor(page)}<small>${page === 'courses' ? 'lessons' : page === 'topics' ? 'collections' : page === 'grammar' ? 'categories' : page === 'cue-cards' ? 'topics' : page === 'bites' ? 'notes' : 'documents'}</small></span></header>`;
}
function queryControls(page, params) {
  const query = params.get('q') || '';
  return `<div class="collection-toolbar"><label class="search-box">${icon('search')}<input id="library-search" type="search" value="${escape(query)}" placeholder="${page === 'courses' ? 'Search lesson titles or full text…' : 'Search titles or content…'}" aria-label="Search ${config[page].label}" autocomplete="off"/><kbd>/</kbd></label><div class="toolbar-controls"><span id="result-count" class="result-count" aria-live="polite"></span>${page === 'courses' ? `<label class="sort-select"><span class="sr-only">Sort lessons</span><select id="sort"><option value="asc" ${params.get('sort') !== 'desc' ? 'selected' : ''}>First to last</option><option value="desc" ${params.get('sort') === 'desc' ? 'selected' : ''}>Last to first</option></select></label><div class="view-switch" role="group" aria-label="Course layout"><button data-wiki="view-list" aria-label="List view" aria-pressed="${getView() === 'list'}">${icon('file')}</button><button data-wiki="view-cards" aria-label="Card view" aria-pressed="${getView() === 'cards'}">${icon('grid')}</button></div>` : ''}</div></div>`;
}
function selectedTags(params) { return (params.get('tags') || '').split(',').filter(t => catalog.categories.some(c => c.id === t)); }
function filters(params) {
  const tags = selectedTags(params);
  return `<details class="filter-panel" ${filtersOpen ? 'open' : ''}><summary>${icon('tag')} <span>Filter by topic</span><span class="filter-selection">${tags.length ? `${tags.length} selected` : 'All topics'}</span>${icon('chevron')}</summary><div class="filter-body"><div class="filter-heading"><span>A lesson can belong to several topics.</span><select id="match-mode" aria-label="Topic matching"><option value="all" ${params.get('mode') !== 'any' ? 'selected' : ''}>Match all selected</option><option value="any" ${params.get('mode') === 'any' ? 'selected' : ''}>Match any selected</option></select></div><div class="filter-tags"><button class="filter-tag ${!tags.length ? 'selected' : ''}" data-action="all-tags" aria-pressed="${!tags.length}">All lessons <span>${countFor('courses')}</span></button>${catalog.categories.map(c => `<button class="filter-tag ${tags.includes(c.id) ? 'selected' : ''}" data-action="tag" data-tag="${c.id}" aria-pressed="${tags.includes(c.id)}">${tags.includes(c.id) ? icon('check') : ''}${escape(c.label)}<span>${c.count}</span></button>`).join('')}</div></div></details><div id="filter-summary" class="filter-summary"></div>`;
}
function courseMatches(d, params) {
  const query = (params.get('q') || '').trim().toLowerCase();
  const tags = selectedTags(params);
  const tagText = d.tags.map(id => catalog.categories.find(t => t.id === id)?.label || '').join(' ');
  return (!query || `${d.searchText} ${tagText}`.includes(query)) && (!tags.length || (params.get('mode') === 'any' ? tags.some(t => d.tags.includes(t)) : tags.every(t => d.tags.includes(t))));
}
function tagLinks(tags, limit = tags.length) {
  return `${tags.slice(0, limit).map(id => { const c = catalog.categories.find(c => c.id === id); return c ? `<a class="small-tag tag-${id}" href="${url('courses', { tags: id })}">${c.label}</a>` : ''; }).join('')}${tags.length > limit ? `<span class="tag-overflow" title="${escape(tags.slice(limit).map(id => catalog.categories.find(c => c.id === id)?.label).join(', '))}">+${tags.length - limit}</span>` : ''}`;
}
function courseCard(d) {
  return `<article class="course-card"><a class="card-main" href="${readUrl(d.id)}"><span class="lesson-number"><span>LESSON</span> ${String(d.number).padStart(2, '0')}</span><div class="course-description"><h3>${escape(d.title)}</h3><p class="card-description">${escape(d.description)}</p></div></a><div class="card-bottom"><div class="card-tags">${d.tags.length ? tagLinks(d.tags, 2) : '<span class="small-tag">Uncategorised</span>'}</div><span class="card-footnote">${d.sections} sections</span></div><a class="row-arrow" href="${readUrl(d.id)}" aria-label="Read lesson ${d.number}">${icon('chevron')}</a></article>`;
}
function topicCard(c) {
  const d = catalog.documents.find(d => d.id === c.docId);
  return `<article class="topic-card"><span class="topic-symbol tone-${Number(c.id) % 3}">${icon(['book', 'grammar', 'file', 'speech'][Number(c.id) % 4])}</span><span class="topic-index">${c.id}</span><h3>${c.label}</h3><p class="topic-english">${escape(d.title)}</p><p class="topic-description">${c.description}</p><div class="topic-actions"><a href="${readUrl(c.docId)}">Read collection ${icon('arrow')}</a><a class="subtle-link" href="${url('courses', { tags: c.id })}">${c.count} related lessons ${icon('chevron')}</a></div></article>`;
}
function groupCard(group, d, index) {
  return `<a class="group-card" href="${readUrl(d.id, d.kind === 'cue-card' ? '' : group.id)}"><span class="group-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escape(group.label)}</h3>${d.kind === 'cue-card' ? '<p>Model answer · Linking language · Grammar</p>' : ''}</div><span class="group-arrow">${icon('arrow')}</span></a>`;
}
function emptyState(query) {
  return `<div class="empty-state">${icon('search')}<h3>No matching notes</h3><p>${query ? `Try a shorter search or select fewer topics.` : 'Try a different combination of topics.'}</p><button class="text-button" data-action="reset">Clear filters</button></div>`;
}
function updateResults() {
  const { page, params } = currentRoute();
  const target = document.querySelector('#results');
  if (!target || !config[page]) return;
  const query = (params.get('q') || '').trim().toLowerCase();
  if (page === 'bites') { renderBites(params); return; }
  let items = [];
  if (page === 'courses') {
    items = catalog.documents.filter(d => d.kind === 'lesson' && courseMatches(d, params)).sort((a, b) => params.get('sort') === 'desc' ? b.number - a.number : a.number - b.number);
    target.className = 'course-grid';
    target.innerHTML = items.map(courseCard).join('');
    const summary = document.querySelector('#filter-summary');
    const tags = selectedTags(params);
    summary.innerHTML = tags.length || query ? `<span>${tags.length ? `${tags.length} topics selected${query ? ' · Full-text search' : ''}` : 'Full-text search'}</span><button class="text-button" data-action="reset">Clear filters ${icon('close')}</button>` : '';
    summary.hidden = !tags.length && !query;
  } else if (page === 'topics') {
    items = catalog.categories.filter(c => !query || `${c.label} ${c.description} ${catalog.documents.find(d => d.id === c.docId).searchText}`.toLowerCase().includes(query));
    target.className = 'topic-grid';
    target.innerHTML = items.map(topicCard).join('');
  } else if (page === 'cue-cards') {
    items = catalog.documents.filter(d => d.kind === 'cue-card' && (!query || d.searchText.includes(query))).sort((a, b) => a.number - b.number);
    target.className = 'group-grid';
    target.innerHTML = items.map(d => groupCard({ label: d.title }, d, d.number - 1)).join('');
  } else if (page === 'grammar') {
    const d = catalog.documents.find(d => d.id === page);
    items = d.groups.map((g, i) => ({ ...g, originalIndex: i })).filter(g => !query || `${g.title} ${g.label}`.toLowerCase().includes(query));
    target.className = 'group-grid';
    target.innerHTML = items.map(g => groupCard(g, d, g.originalIndex)).join('');
  } else {
    items = catalog.documents.filter(d => d.kind === 'resource' && (!query || d.searchText.includes(query)));
    target.className = 'resource-grid';
    target.innerHTML = items.map(d => `<a class="resource-card" href="${readUrl(d.id)}">${icon('file')}<div><h3>${escape(d.label)}</h3><p>${escape(d.title)}</p><span>${d.sections} sections</span></div>${icon('arrow')}</a>`).join('');
  }
  document.querySelector('#result-count').textContent = `${items.length} ${page === 'courses' ? '/ ' + countFor(page) + ' lessons' : ' entries'}`;
  if (!items.length) { target.className = 'results-empty'; target.innerHTML = emptyState(query); }
  applyCollectionLayout();
}
function collection(route) {
  const { page, params } = route;
  const main = document.querySelector('#main');
  main.className = 'collection-main';
  main.innerHTML = `${hero(page)}${queryControls(page, params)}${page === 'courses' ? filters(params) : ''}${page === 'bites' ? '<div id="bite-filters" class="bite-filters" aria-label="Language Bites categories"></div>' : ''}${page === 'grammar' || page === 'cue-cards' ? `<div class="collection-intro"><span>${page === 'grammar' ? 'Corrections and practice, organised by structure' : 'Complete notes, organised by speaking topic'}</span><a href="${readUrl(page)}">Read the full collection ${icon('arrow')}</a></div>` : ''}<div id="results" aria-live="polite"></div>`;
  if (page === 'grammar') document.querySelector('#library-search').placeholder = 'Search category names…';
  if (page === 'cue-cards') {
    document.querySelector('.collection-intro > span').textContent = 'One topic per page · prompt, answer and review';
    document.querySelector('.collection-intro').insertAdjacentHTML('beforeend', `<a href="${readUrl('cue-card-guide')}">Practice guide</a><a href="${readUrl('cue-card-grammar')}">Shared grammar review</a>`);
  }
  updateResults();
}
async function getDocument(id) {
  if (cache.has(id)) return cache.get(id);
  const response = await fetch(new URL(`content/${encodeURIComponent(id)}.json`, base), { cache: 'no-cache' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('These notes could not be loaded. Refresh the library and try again.');
  const doc = await response.json();
  if (doc.id !== id || typeof doc.html !== 'string' || !Array.isArray(doc.headings)) throw new Error('These notes are incomplete. Refresh the library and try again.');
  cache.set(id, doc);
  return doc;
}
async function reader(route, request) {
  const main = document.querySelector('#main');
  const metadata = catalog.documents.find(d => d.id === route.id);
  if (!metadata) { main.innerHTML = '<div class="error-state"><h1>Document not found</h1><p>This document may have moved. Return to the course library to continue.</p><a href="#/courses">Back to courses</a></div>'; return; }
  main.className = 'reader-main';
  main.innerHTML = '<div class="loading-state" role="status">Opening the complete notes…</div>';
  try {
    const doc = await getDocument(route.id);
    if (renderId !== request) return;
    const active = activePage(route);
    const proposed = route.params.get('back') || `/${active}`;
    const back = /^\/(courses|topics|grammar|cue-cards|resources|bites)(\?|$)/.test(proposed) ? `#${proposed}` : `#/${active}`;
    const topHeading = doc.headings.find(h => h.depth === 1);
    const html = doc.html.replace(/^<h1[^>]*>.*?<\/h1>\s*/s, '');
    main.innerHTML = `<div class="reading-progress" aria-hidden="true"><span></span></div><div class="reader-toolbar"><a class="back-link" href="${escape(back)}">${icon('back')} ${config[active].label}</a><div class="reader-tools"><button class="tool-button" data-wiki="focus" aria-pressed="false">Focus mode</button><button class="tool-button" data-wiki="copy-link">Copy link</button><button class="type-button" data-action="font-down" aria-label="Decrease text size">A−</button><button class="type-button" data-action="font-up" aria-label="Increase text size">A+</button></div></div><header class="reader-heading"><p class="eyebrow">${doc.kind === 'lesson' ? `LESSON ${String(doc.number).padStart(2, '0')}` : config[active].english}</p><h1 id="${escape(topHeading?.id || 'document-title')}">${escape(doc.title)}</h1><div class="reader-tags">${tagLinks(doc.tags)}<span class="reader-sections">${doc.sections} sections</span></div></header><div class="reader-layout"><article class="document" lang="en" style="--reading-size:${readerSize}px">${html}</article><aside class="reader-aside"><details class="reader-index" ${matchMedia('(min-width: 1101px)').matches ? 'open' : ''}><summary>On this page <span>${doc.headings.filter(h => h.depth === 2).length}</span></summary><nav aria-label="On this page">${doc.headings.filter(h => h.depth === 2).map(h => `<a href="${readUrl(doc.id, h.id, proposed)}" data-section="${escape(h.id)}">${escape(h.title.replace(/^\d+[. —]+/, ''))}</a>`).join('')}</nav></details>${doc.kind === 'lesson' ? `<div class="related-review"><p>Related collections</p>${doc.tags.map(id => { const c = catalog.categories.find(c => c.id === id); return `<a href="${readUrl(c.docId, '', `/${active}`)}">${escape(c.label)}${icon('chevron')}</a>`; }).join('')}</div>` : doc.kind === 'topic' ? `<a class="related-courses-link" href="${url('courses', { tags: doc.tags.join(',') })}">Browse related lessons ${icon('arrow')}</a>` : ''}</aside></div><div class="reader-end"><a class="back-link" href="${escape(back)}">${icon('back')} Back to ${config[active].label.toLowerCase()}</a><button class="text-button" data-wiki="top">Back to top ↑</button></div>`;
    enhanceReader(doc, route);
    if (route.params.get('section')) scrollToSection(route.params.get('section'));
  } catch (error) {
    if (renderId !== request) return;
    main.innerHTML = `<div class="error-state"><h1>Unable to open these notes</h1><p>${escape(error.message)}</p><button class="text-button" data-action="retry">Try again</button></div>`;
  }
}
function scrollToSection(section) {
  revealSection(section);
}
function changeParams(changes, full = false) {
  const route = currentRoute();
  const input = document.querySelector('#library-search');
  if (input && !Object.hasOwn(changes, 'q')) {
    if (input.value) route.params.set('q', input.value);
    else route.params.delete('q');
  }
  for (const [key, value] of Object.entries(changes)) { if (value) route.params.set(key, value); else route.params.delete(key); }
  const next = url(route.page, Object.fromEntries(route.params));
  if (full) { clearTimeout(queryTimer); history.pushState(null, '', next); render(); }
  else { history.replaceState(null, '', next); updateResults(); }
}
function setMenu(open) {
  menuOpen = open;
  document.body.classList.toggle('menu-open', open);
  document.querySelector('.mobile-menu')?.setAttribute('aria-expanded', String(open));
  const sidebar = document.querySelector('.sidebar');
  const mobile = matchMedia('(max-width: 800px)').matches;
  if (sidebar) sidebar.inert = mobile && !open;
  const workspace = document.querySelector('.workspace');
  if (workspace) workspace.inert = mobile && open;
}
async function render() {
  if (!catalog) return;
  const request = ++renderId;
  const route = currentRoute();
  clearReader();
  shell(activePage(route));
  window.scrollTo(0, 0);
  if (route.page === 'read') await reader(route, request);
  else if (route.page === 'bite') renderBite(route);
  else if (config[route.page]) collection(route);
  else { history.replaceState(null, '', '#/courses'); collection(currentRoute()); }
  if (request !== renderId) return;
  document.title = `${route.page === 'read' ? catalog.documents.find(d => d.id === route.id)?.title || 'Notes' : route.page === 'bite' ? catalog.bites.find(b => b.id === route.id)?.title || 'Language Bite' : config[activePage(route)].label} · English Library`;
}

app.addEventListener('click', event => {
  const section = event.target.closest('[data-section]');
  if (section && currentRoute().page === 'read') {
    event.preventDefault();
    const route = currentRoute(); route.params.set('section', section.dataset.section);
    history.replaceState(null, '', url(`read/${route.id}`, Object.fromEntries(route.params)));
    scrollToSection(section.dataset.section);
    return;
  }
  const link = event.target.closest('a[href^="#/"]');
  if (link && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !link.target && !link.hasAttribute('download')) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
    return;
  }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'menu') { setMenu(!menuOpen); if (menuOpen) document.querySelector('.sidebar .brand')?.focus(); }
  if (action === 'menu-close') setMenu(false);
  if (action === 'retry') render();
  if (action === 'tag') { const tags = selectedTags(currentRoute().params); const id = control.dataset.tag; changeParams({ tags: tags.includes(id) ? tags.filter(t => t !== id).join(',') : [...tags, id].join(',') }, true); }
  if (action === 'all-tags') changeParams({ tags: '' }, true);
  if (action === 'reset') changeParams({ tags: '', q: '', mode: '' }, true);
  if (action === 'font-up' || action === 'font-down') { readerSize = Math.max(15, Math.min(23, readerSize + (action === 'font-up' ? 1 : -1))); try { localStorage.setItem('wiki-reading-size', String(readerSize)); } catch {} document.querySelector('.document')?.style.setProperty('--reading-size', `${readerSize}px`); }
});
let queryTimer;
app.addEventListener('input', event => {
  if (event.target.id !== 'library-search') return;
  clearTimeout(queryTimer);
  const page = currentRoute().page;
  const value = event.target.value;
  queryTimer = setTimeout(() => { if (currentRoute().page === page) changeParams({ q: value }); }, 120);
});
app.addEventListener('toggle', event => { if (event.target.matches('.filter-panel')) filtersOpen = event.target.open; }, true);
app.addEventListener('change', event => {
  if (event.target.id === 'sort') changeParams({ sort: event.target.value });
  if (event.target.id === 'match-mode') changeParams({ mode: event.target.value });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuOpen) { setMenu(false); document.querySelector('.mobile-menu')?.focus(); }
  if (event.key === 'Tab' && menuOpen && matchMedia('(max-width: 800px)').matches) {
    const links = [...document.querySelectorAll('.sidebar a')];
    const first = links[0], last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('hashchange', () => { clearTimeout(queryTimer); render(); });
window.addEventListener('resize', () => setMenu(menuOpen));

try {
  const response = await fetch(new URL('content/catalog.json', base), { cache: 'no-cache' });
  if (!response.ok) throw new Error('The library could not be loaded. Please try again.');
  catalog = await response.json();
  configureWiki({ catalog, icon, escape, readUrl, getDocument, closeMenu: () => setMenu(false) });
  configureBites({ catalog, icon, escape, url });
  await render();
} catch (error) {
  app.innerHTML = `<main class="error-state"><h1>Unable to open the library</h1><p>${escape(error.message)}</p><button id="reload" class="text-button">Try again</button></main>`;
  document.querySelector('#reload').addEventListener('click', () => location.reload());
}
