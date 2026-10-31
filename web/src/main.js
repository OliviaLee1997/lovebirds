import './style.css';
import { configureWiki, mountWikiChrome, enhanceReader, clearReader, revealSection, applyCollectionLayout, getView, getReadingSize } from './wiki.js';
import { configureBites, renderBites, renderBite } from './bites.js';
import { collectionItems, selectedTags as getSelectedTags, readingNeighbours } from './collections.js';

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
let menuOpener;
let filtersOpen = false;
const cache = new Map();
const config = {
  courses: { label: 'All courses', english: 'THE COURSE COLLECTION', title: 'Course library', description: 'Browse complete lesson notes, or follow a topic across the course.', icon: 'book' },
  'cue-cards': { label: 'Cue cards', english: 'MY SPEAKING COLLECTION', title: 'Cue card collection', description: 'Extended speaking models, linking language and personal grammar notes.', icon: 'speech' },
  topics: { label: 'My topic collections', english: 'MY TOPIC COLLECTIONS', title: 'My topic collections', description: 'Your existing notes, brought together by subject. Read a summary or explore its lessons.', icon: 'layers' },
  grammar: { label: 'Personal grammar', english: 'MY GRAMMAR REVIEW', title: 'Personal grammar review', description: 'Corrections, explanations and exercises organised by grammatical structure.', icon: 'grammar' },
  'linking-words': { label: 'Linking words', english: 'CONNECT YOUR IDEAS', title: 'Linking words', description: 'Explore connecting phrases by purpose, with examples and read-aloud practice.', icon: 'layers' },
  bites: { label: 'Language Bites', english: 'ONE IDEA AT A TIME', title: 'Language Bites', description: 'Short explanations, useful examples and a little recall practice.', icon: 'grid' },
  resources: { label: 'Reference shelf', english: 'THE REFERENCE SHELF', title: 'Reference shelf', description: 'Reusable IELTS speaking templates for Parts 1, 2 and 3.', icon: 'file' },
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
    <div class="sidebar-header"><a class="brand" href="#/courses"><span class="brand-mark">${icon('book')}</span><span>Olivia’s<br>English Notes<small>PERSONAL LEARNING WIKI</small></span></a><button class="icon-button sidebar-close" data-action="menu-close" aria-label="Close collections">${icon('close')}</button></div>
    <p class="nav-caption">COLLECTIONS <span>${Object.keys(config).length}</span></p>
    <nav>${Object.entries(config).map(([key, value]) => `<a class="nav-link ${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''} href="#/${key}">${icon(value.icon)}<span>${value.label}</span><span class="nav-count">${countFor(key)}</span></a>`).join('')}</nav>
    <div class="sidebar-note"><span class="note-line"></span><p>A place for everything<br>you are learning.</p><small>Read. Connect. Make it yours.</small></div>
    <div class="sidebar-bottom"><span class="status-dot"></span>Personal learning wiki<span>EN</span></div>
  </aside>`;
}
function mobileNavigation(active) {
  const shortcuts = [['courses', 'Courses'], ['cue-cards', 'Cue cards']];
  return `<nav class="mobile-collections" aria-label="Mobile collections">${shortcuts.map(([page, label]) => `<a href="#/${page}" ${active === page ? 'aria-current="page"' : ''}>${icon(config[page].icon)}<span>${label}</span></a>`).join('')}<button data-action="menu" aria-label="All collections" aria-expanded="false" aria-controls="sidebar" class="${shortcuts.some(([page]) => page === active) ? '' : 'active'}"><span class="collections-symbol">${icon('grid')}<span class="collections-badge">${Object.keys(config).length}</span></span><span>All collections</span></button></nav>`;
}
function shell(active) {
  app.innerHTML = `${sidebar(active)}<button class="menu-overlay" aria-label="Close navigation" data-action="menu-close" tabindex="-1"></button><div class="workspace"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open collections" aria-expanded="false" aria-controls="sidebar">${icon('menu')}<span>Collections</span></button><span class="breadcrumb"><span class="breadcrumb-root">Library <span>/</span></span><strong>${config[active].label}</strong></span></div><button class="global-search-trigger" data-wiki="search" aria-label="Search all notes">${icon('search')}<span>Search all notes</span><kbd>⌘ K</kbd></button></header><main id="main" tabindex="-1"></main><footer class="site-footer"><span>OLIVIA’S ENGLISH NOTES</span><span>Read. Connect. Revisit.</span></footer>${mobileNavigation(active)}</div>`;
  setMenu(false);
  mountWikiChrome();
}
function hero(page) {
  const c = config[page];
  return `<header class="collection-header"><div><p class="eyebrow">PERSONAL ENGLISH WIKI</p><h1>${c.title}</h1><p>${c.description}</p></div><span class="collection-total">${countFor(page)}<small>${page === 'courses' ? 'lessons' : page === 'topics' ? 'collections' : page === 'grammar' || page === 'linking-words' ? 'categories' : page === 'cue-cards' ? 'topics' : page === 'bites' ? 'notes' : 'documents'}</small></span></header>`;
}
function queryControls(page, params) {
  const query = params.get('q') || '';
  const sortable = ['courses', 'cue-cards', 'bites'].includes(page);
  const sort = sortable ? `<label class="sort-select"><span class="sr-only">Sort ${config[page].label}</span><select id="sort"><option value="desc" ${params.get('sort') !== 'asc' ? 'selected' : ''}>${page === 'cue-cards' ? 'Newest course first' : 'Newest first'}</option><option value="asc" ${params.get('sort') === 'asc' ? 'selected' : ''}>${page === 'cue-cards' ? 'Oldest course first' : 'Oldest first'}</option></select></label>` : '';
  const view = page === 'courses' ? `<div class="view-switch" role="group" aria-label="Course layout"><button data-wiki="view-list" aria-label="List view" aria-pressed="${getView() === 'list'}">${icon('file')}</button><button data-wiki="view-cards" aria-label="Card view" aria-pressed="${getView() === 'cards'}">${icon('grid')}</button></div>` : '';
  return `<div class="collection-toolbar"><label class="search-box">${icon('search')}<input id="library-search" type="search" value="${escape(query)}" placeholder="${page === 'courses' ? 'Search lesson titles or full text…' : 'Search titles or content…'}" aria-label="Search ${config[page].label}" autocomplete="off"/><kbd>/</kbd></label><div class="toolbar-controls"><span id="result-count" class="result-count" aria-live="polite"></span>${sort}${view}</div></div>`;
}
function selectedTags(params) { return getSelectedTags(catalog, params); }
function filters(params) {
  const tags = selectedTags(params);
  return `<details class="filter-panel" ${filtersOpen ? 'open' : ''}><summary>${icon('tag')} <span>Filter by topic</span><span class="filter-selection">${tags.length ? `${tags.length} selected` : 'All topics'}</span>${icon('chevron')}</summary><div class="filter-body"><div class="filter-heading"><span>A lesson can belong to several topics.</span><select id="match-mode" aria-label="Topic matching"><option value="all" ${params.get('mode') !== 'any' ? 'selected' : ''}>Match all selected</option><option value="any" ${params.get('mode') === 'any' ? 'selected' : ''}>Match any selected</option></select></div><div class="filter-tags"><button class="filter-tag ${!tags.length ? 'selected' : ''}" data-action="all-tags" aria-pressed="${!tags.length}">All lessons <span>${countFor('courses')}</span></button>${catalog.categories.map(c => `<button class="filter-tag ${tags.includes(c.id) ? 'selected' : ''}" data-action="tag" data-tag="${c.id}" aria-pressed="${tags.includes(c.id)}">${tags.includes(c.id) ? icon('check') : ''}${escape(c.label)}<span>${c.count}</span></button>`).join('')}</div></div></details><div id="filter-summary" class="filter-summary"></div>`;
}
function tagLinks(tags, limit = tags.length) {
  return `${tags.slice(0, limit).map(id => { const c = catalog.categories.find(c => c.id === id); return c ? `<a class="small-tag tag-${id}" href="${url('courses', { tags: id })}">${c.label}</a>` : ''; }).join('')}${tags.length > limit ? `<span class="tag-overflow" title="${escape(tags.slice(limit).map(id => catalog.categories.find(c => c.id === id)?.label).join(', '))}">+${tags.length - limit}</span>` : ''}`;
}
function courseCard(d) {
  return `<article class="course-card"><a class="card-main" href="${readUrl(d.id)}"><span class="lesson-number"><span>LESSON</span> ${String(d.number).padStart(2, '0')}</span><div class="course-description"><h3>${escape(d.title)}</h3><p class="card-description">${escape(d.description)}</p></div></a><div class="card-bottom"><div class="card-tags">${d.tags.length ? tagLinks(d.tags, 2) : '<span class="small-tag">Uncategorised</span>'}</div><span class="card-footnote">${d.sections} sections</span></div><a class="row-arrow" href="${readUrl(d.id)}" aria-label="Read lesson ${d.number}">${icon('chevron')}</a></article>`;
}
function topicCard(c) {
  const d = catalog.documents.find(d => d.id === c.docId);
  return `<article class="topic-card"><span class="topic-symbol tone-${Number(c.id) % 3}">${icon(['book', 'grammar', 'file', 'speech'][Number(c.id) % 4])}</span><span class="topic-index">${c.id}</span><h3><a class="topic-open" href="${readUrl(c.docId)}">${c.label}</a></h3><p class="topic-english">${escape(d.title)}</p><p class="topic-description">${c.description}</p><div class="topic-actions"><span class="topic-read">Read collection ${icon('arrow')}</span><a class="subtle-link" href="${url('courses', { tags: c.id })}">${c.count} related lessons ${icon('chevron')}</a></div></article>`;
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
  const items = collectionItems(catalog, page, params);
  if (page === 'courses') {
    target.className = 'course-grid';
    target.innerHTML = items.map(courseCard).join('');
    const summary = document.querySelector('#filter-summary');
    const tags = selectedTags(params);
    summary.innerHTML = tags.length || query ? `<span>${tags.length ? `${tags.length} topics selected${query ? ' · Full-text search' : ''}` : 'Full-text search'}</span><button class="text-button" data-action="reset">Clear filters ${icon('close')}</button>` : '';
    summary.hidden = !tags.length && !query;
  } else if (page === 'topics') {
    target.className = 'topic-grid';
    target.innerHTML = items.map(topicCard).join('');
  } else if (page === 'cue-cards') {
    target.className = 'group-grid';
    target.innerHTML = items.map(d => groupCard({ label: d.title }, d, d.number - 1)).join('');
  } else if (page === 'grammar' || page === 'linking-words') {
    const d = catalog.documents.find(d => d.id === page);
    target.className = 'group-grid';
    target.innerHTML = items.map(g => groupCard(g, d, g.originalIndex)).join('');
  } else {
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
    document.querySelector('.collection-intro > span').textContent = 'Topics follow course order · one topic per page';
    document.querySelector('.collection-intro').insertAdjacentHTML('beforeend', `<a href="${readUrl('cue-card-guide')}">Practice guide</a><a href="${readUrl('cue-card-grammar')}">Shared grammar review</a>`);
  }
  if (page === 'linking-words') {
    document.querySelector('#results').insertAdjacentHTML('beforebegin', `<div class="collection-intro"><span>12 functions · examples, passages and recall practice</span><a href="${readUrl('linking-words')}">Read the full collection ${icon('arrow')}</a><a href="${readUrl('linking-words', '13-short-passages-for-repeated-reading')}">Practice passages</a><a href="${readUrl('linking-words', '14-quick-recall-practice')}">Quick recall</a></div>`);
    document.querySelector('#library-search').placeholder = 'Search a purpose or phrase, e.g. however…';
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
function readingPagination(doc, route, compact = false) {
  const { previous, next, index, total, back, page, grouped } = readingNeighbours(catalog, doc, route);
  if (index < 0) return '';
  const item = (entry, direction) => {
    const label = direction === 'prev' ? 'Previous' : 'Next';
    const arrow = icon(direction === 'prev' ? 'back' : 'arrow');
    if (!entry) return `<span class="pagination-item ${direction} unavailable" aria-disabled="true">${direction === 'prev' ? arrow : ''}<span>${label}${compact ? '' : `<small>${direction === 'prev' ? 'Start' : 'End'} of this collection</small>`}</span>${direction === 'next' ? arrow : ''}</span>`;
    const href = page === 'bites' ? url(`bite/${entry.id}`, { back }) : readUrl(entry.id, entry.section || '', back);
    const title = page === 'courses' ? `Lesson ${String(entry.number).padStart(2, '0')} · ${entry.title}` : entry.title;
    return `<a class="pagination-item ${direction}" rel="${direction}" href="${escape(href)}" aria-label="${label}: ${escape(title)}" title="${escape(title)}">${direction === 'prev' ? arrow : ''}<span>${label}${compact ? '' : `<strong>${escape(title)}</strong>`}</span>${direction === 'next' ? arrow : ''}</a>`;
  };
  return `<nav class="reading-pagination ${compact ? 'compact' : ''}" aria-label="${compact ? 'Quick reading navigation' : 'Reading navigation'}">${item(previous, 'prev')}${compact ? `<span class="pagination-count">${index + 1} / ${total}${grouped ? ' sections' : ''}</span>` : ''}${item(next, 'next')}</nav>`;
}
function updateReadingPagination(doc, route) {
  document.querySelectorAll('[data-reading-pagination]').forEach(el => { el.innerHTML = readingPagination(doc, route, el.dataset.readingPagination === 'compact'); });
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
    const back = /^\/(courses|topics|grammar|cue-cards|linking-words|resources|bites)(\?|$)/.test(proposed) ? `#${proposed}` : `#/${active}`;
    const topHeading = doc.headings.find(h => h.depth === 1);
    const html = doc.html.replace(/^<h1[^>]*>.*?<\/h1>\s*/s, '');
    main.innerHTML = `<div class="reading-progress" aria-hidden="true"><span></span></div><div class="reader-toolbar"><a class="back-link" href="${escape(back)}">${icon('back')} ${config[active].label}</a><div class="reader-tools"><button class="tool-button" data-wiki="focus" aria-pressed="false">Focus mode</button><button class="tool-button" data-wiki="copy-link">Copy link</button><button class="type-button" data-action="font-down" aria-label="Decrease text size">A−</button><button class="type-button" data-action="font-up" aria-label="Increase text size">A+</button></div></div><header class="reader-heading"><p class="eyebrow">${doc.kind === 'lesson' ? `LESSON ${String(doc.number).padStart(2, '0')}` : config[active].english}</p><h1 id="${escape(topHeading?.id || 'document-title')}">${escape(doc.title)}</h1><div class="reader-tags">${tagLinks(doc.tags)}<span class="reader-sections">${doc.sections} sections</span></div></header><div data-reading-pagination="compact">${readingPagination(doc, route, true)}</div><div class="reader-layout"><article class="document" lang="en" style="--reading-size:${readerSize}px">${html}</article><aside class="reader-aside"><details class="reader-index" ${matchMedia('(min-width: 1101px)').matches ? 'open' : ''}><summary>On this page <span>${doc.headings.filter(h => h.depth === 2).length}</span></summary><nav aria-label="On this page">${doc.headings.filter(h => h.depth === 2).map(h => `<a href="${readUrl(doc.id, h.id, proposed)}" data-section="${escape(h.id)}">${escape(h.title.replace(/^\d+[. —]+/, ''))}</a>`).join('')}</nav></details>${doc.kind === 'lesson' ? `<div class="related-review"><p>Related collections</p>${doc.tags.map(id => { const c = catalog.categories.find(c => c.id === id); return `<a href="${readUrl(c.docId, '', `/${active}`)}">${escape(c.label)}${icon('chevron')}</a>`; }).join('')}</div>` : doc.kind === 'topic' ? `<a class="related-courses-link" href="${url('courses', { tags: doc.tags.join(',') })}">Browse related lessons ${icon('arrow')}</a>` : ''}</aside></div><div data-reading-pagination="full">${readingPagination(doc, route)}</div><div class="reader-end"><a class="back-link" href="${escape(back)}">${icon('back')} Back to ${config[active].label.toLowerCase()}</a><button class="text-button" data-wiki="top">Back to top ↑</button></div>`;
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
function setMenu(open, restoreFocus = false) {
  const mobile = matchMedia('(max-width: 800px)').matches;
  menuOpen = mobile && open;
  document.body.classList.toggle('menu-open', menuOpen);
  document.querySelectorAll('[data-action="menu"]').forEach(button => button.setAttribute('aria-expanded', String(menuOpen)));
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.inert = mobile && !menuOpen;
  const workspace = document.querySelector('.workspace');
  if (workspace) workspace.inert = menuOpen;
  if (restoreFocus && menuOpener?.isConnected) menuOpener.focus({ preventScroll: true });
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
  document.title = `${route.page === 'read' ? catalog.documents.find(d => d.id === route.id)?.title || 'Notes' : route.page === 'bite' ? catalog.bites.find(b => b.id === route.id)?.title || 'Language Bite' : config[activePage(route)].label} · Olivia’s English Notes`;
}

app.addEventListener('click', event => {
  const section = event.target.closest('[data-section]');
  if (section && currentRoute().page === 'read') {
    event.preventDefault();
    const route = currentRoute(); route.params.set('section', section.dataset.section);
    history.replaceState(null, '', url(`read/${route.id}`, Object.fromEntries(route.params)));
    const doc = cache.get(route.id);
    if (doc) updateReadingPagination(doc, route);
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
  if (action === 'menu') { menuOpener = control; setMenu(!menuOpen); if (menuOpen) document.querySelector('.sidebar-close')?.focus({ preventScroll: true }); }
  if (action === 'menu-close') setMenu(false, true);
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
  if (event.key === 'Escape' && menuOpen) { event.preventDefault(); setMenu(false, true); }
  if (event.key === 'Tab' && menuOpen && matchMedia('(max-width: 800px)').matches) {
    const links = [...document.querySelectorAll('.sidebar a, .sidebar button')];
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
  configureBites({ catalog, icon, escape, url, navigate, readingPagination });
  await render();
} catch (error) {
  app.innerHTML = `<main class="error-state"><h1>Unable to open the library</h1><p>${escape(error.message)}</p><button id="reload" class="text-button">Try again</button></main>`;
  document.querySelector('#reload').addEventListener('click', () => location.reload());
}
