let context;
let readerCleanup = () => {};
let searchIndex = 0;
let toastTimer;
const preference = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
export const getView = () => preference('wiki-course-view', 'list') === 'cards' ? 'cards' : 'list';
export const getReadingSize = () => Math.min(23, Math.max(15, Number(preference('wiki-reading-size', '17')) || 17));

export function configureWiki(value) { context = value; }

export function mountWikiChrome() {
  document.querySelector('#app').insertAdjacentHTML('beforeend', `
    <dialog id="search-dialog" class="search-dialog" aria-labelledby="search-dialog-title">
      <div class="dialog-heading"><h2 id="search-dialog-title">Search the wiki</h2><button class="icon-button" data-wiki="close-dialog" aria-label="Close search">${context.icon('close')}</button></div>
      <label class="command-search">${context.icon('search')}<input id="wiki-search" type="search" placeholder="A topic, a phrase, a grammar question…" aria-label="Search all notes" autocomplete="off" role="combobox" aria-controls="search-results" aria-expanded="true" aria-autocomplete="list"/></label>
      <ul id="search-results" role="listbox" aria-label="Search results"></ul><p id="search-status" class="sr-only" aria-live="polite"></p>
      <div class="search-help"><span><kbd>↑</kbd> <kbd>↓</kbd> to navigate <kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>
    </dialog>
    <dialog id="table-dialog" class="table-dialog" aria-labelledby="table-dialog-title"><div class="dialog-heading"><h2 id="table-dialog-title">Table view</h2><button class="icon-button" data-wiki="close-dialog" aria-label="Close table">${context.icon('close')}</button></div><div class="expanded-table"></div></dialog>
    <div id="wiki-toast" role="status" class="toast" hidden></div>`);
}

export function applyCollectionLayout() {
  document.querySelector('.course-grid')?.classList.toggle('is-list', getView() === 'list');
  document.querySelectorAll('[data-wiki^="view-"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wiki === `view-${getView()}`)));
}

function focusMode(enabled) {
  document.body.classList.toggle('focus-reading', enabled);
  const button = document.querySelector('[data-wiki="focus"]');
  if (button) { button.textContent = enabled ? 'Exit focus' : 'Focus mode'; button.setAttribute('aria-pressed', String(enabled)); }
}

export function clearReader() {
  readerCleanup();
  document.body.classList.remove('focus-reading');
}

export function revealSection(id) {
  const heading = document.getElementById(id);
  if (!heading) return;
  let ancestor = heading.parentElement;
  while (ancestor) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
  requestAnimationFrame(() => {
    heading.scrollIntoView({ behavior: 'instant', block: 'start' });
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  });
}

export function enhanceReader(doc, route) {
  const article = document.querySelector('.document');
  const h2s = [...article.querySelectorAll(':scope > h2')];
  const prefix = [];
  for (const element of [...article.children]) {
    if (element.tagName === 'H2') break;
    prefix.push(element);
  }
  if (prefix.length && h2s.length) {
    const about = document.createElement('details');
    about.className = 'source-details';
    about.innerHTML = '<summary>Overview & source notes</summary><div></div>';
    prefix[0].before(about);
    prefix.forEach(element => about.lastElementChild.append(element));
  }
  h2s.forEach((heading, index) => {
    const section = document.createElement('details');
    section.className = 'wiki-section';
    section.dataset.wikiSection = heading.id;
    const selected = route.params.get('section');
    section.open = doc.kind === 'grammar' || doc.kind === 'cue-cards' ? (selected ? selected === heading.id : index === 0) : true;
    const summary = document.createElement('summary');
    const content = document.createElement('div');
    content.className = 'section-body';
    let next = heading.nextSibling;
    heading.before(section);
    summary.append(heading);
    section.append(summary, content);
    while (next && !(next.nodeType === 1 && next.tagName === 'H2')) {
      const following = next.nextSibling;
      content.append(next);
      next = following;
    }
    const copy = document.createElement('button');
    copy.className = 'section-link';
    copy.dataset.wiki = 'copy-section';
    copy.dataset.anchor = heading.id;
    copy.setAttribute('aria-label', `Copy link to ${heading.textContent}`);
    copy.title = 'Copy section link';
    copy.textContent = '#';
    summary.append(copy);
  });
  const tools = document.createElement('div');
  tools.className = 'section-controls';
  tools.innerHTML = `<span>${h2s.length} sections · click a heading to fold</span><div><button data-wiki="expand-all">Expand all</button><button data-wiki="collapse-all">Collapse all</button></div>`;
  article.before(tools);
  // Keep the article and its controls in the same grid column.
  const column = document.createElement('div'); column.className = 'reading-column';
  tools.before(column); column.append(tools, article);

  article.querySelectorAll('table').forEach((table, index) => {
    const wrapper = document.createElement('div'); wrapper.className = 'table-block';
    const bar = document.createElement('div'); bar.className = 'table-toolbar';
    bar.innerHTML = `<span>REFERENCE TABLE</span><button data-wiki="expand-table" data-table="${index}" aria-label="Expand table ${index + 1}">Expand table ↗</button>`;
    const scroll = document.createElement('div'); scroll.className = 'table-scroll'; scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Scrollable reference table');
    table.before(wrapper); wrapper.append(bar, scroll); scroll.append(table);
  });
  focusMode(preference('wiki-focus', 'false') === 'true');
  let frame;
  const update = () => {
    frame = undefined;
    const rect = article.getBoundingClientRect();
    const distance = Math.max(1, rect.height - innerHeight + 100);
    const progress = Math.max(0, Math.min(1, (100 - rect.top) / distance));
    const bar = document.querySelector('.reading-progress span');
    if (bar) bar.style.transform = `scaleX(${progress})`;
    const current = [...h2s].reverse().find(h => h.getBoundingClientRect().top <= 145) || h2s[0];
    document.querySelectorAll('.reader-index [data-section]').forEach(link => {
      if (link.dataset.section === current?.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  article.addEventListener('toggle', schedule, true);
  readerCleanup = () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); article.removeEventListener('toggle', schedule, true); if (frame) cancelAnimationFrame(frame); };
  schedule();
}

function toast(message) {
  const element = document.querySelector('#wiki-toast');
  if (!element) return;
  clearTimeout(toastTimer); element.textContent = message; element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, 2400);
}
async function copyLink(anchor) {
  let target = location.href;
  if (anchor) {
    const hash = location.hash.slice(1);
    const [pathname, query = ''] = hash.split('?');
    const params = new URLSearchParams(query); params.set('section', anchor);
    const link = new URL(location.href); link.hash = `${pathname}?${params}`; target = link.href;
  }
  try { await navigator.clipboard.writeText(target); toast('Link copied'); }
  catch { toast('Clipboard unavailable. Copy the link from your browser instead.'); }
}

function searchResults(query = '') {
  const needle = query.trim().toLowerCase();
  const { catalog, escape, readUrl, icon } = context;
  const candidates = [];
  for (const note of catalog.bites || []) {
    const titleMatch = `${note.title} ${note.id}`.toLowerCase().includes(needle);
    const textMatch = [note.prompt, note.explanation, note.qualification, ...note.examples.flat(), note.practice, note.answer].join(' ').toLowerCase().includes(needle);
    if (needle && (titleMatch || textMatch)) candidates.push({ title: note.title, subtitle: `Language Bites · ${note.category} · ${note.id}`, href: `#/bite/${note.id}`, score: titleMatch ? 5 : 1 });
  }
  for (const doc of catalog.documents) {
    if (doc.id === 'cue-cards') continue; // Individual topic pages are the search destinations.
    if (needle) for (const group of doc.groups) {
      if (`${group.title} ${group.label}`.toLowerCase().includes(needle)) candidates.push({ title: group.label, subtitle: doc.title, href: readUrl(doc.id, group.id), score: 5 });
    }
    const titleMatch = `${doc.title} ${doc.label}`.toLowerCase().includes(needle);
    if (!needle || titleMatch || doc.searchText.includes(needle)) candidates.push({ title: doc.title, subtitle: doc.kind === 'lesson' ? `Lesson ${String(doc.number).padStart(2, '0')} · ${doc.sections} sections` : doc.label, href: readUrl(doc.id), score: titleMatch && needle ? 4 : 1 });
  }
  const results = candidates.sort((a, b) => b.score - a.score).slice(0, 12);
  searchIndex = 0;
  document.querySelector('#search-results').innerHTML = results.length ? results.map((result, i) => `<li role="presentation"><a role="option" id="search-result-${i}" aria-selected="${i === 0}" tabindex="-1" href="${result.href}" data-wiki="search-result">${icon('file')}<span><strong>${escape(result.title)}</strong><small>${escape(result.subtitle)}</small></span>${icon('arrow')}</a></li>`).join('') : '<li class="search-empty">No matching notes. Try another phrase.</li>';
  document.querySelector('#search-status').textContent = `${results.length} results shown`;
  updateSearchSelection();
}
function updateSearchSelection() {
  const options = [...document.querySelectorAll('#search-results [role="option"]')];
  options.forEach((option, i) => option.setAttribute('aria-selected', String(i === searchIndex)));
  const input = document.querySelector('#wiki-search');
  if (options[searchIndex]) { input.setAttribute('aria-activedescendant', options[searchIndex].id); options[searchIndex].scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}
function openSearch() {
  context.closeMenu();
  const dialog = document.querySelector('#search-dialog');
  if (!dialog || dialog.open) return;
  document.querySelector('#wiki-search').value = '';
  dialog.showModal(); searchResults(); document.querySelector('#wiki-search').focus();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-wiki]');
  if (!button || !context) return;
  const action = button.dataset.wiki;
  if (action === 'view-list' || action === 'view-cards') { save('wiki-course-view', action.slice(5)); applyCollectionLayout(); }
  if (action === 'search') openSearch();
  if (action === 'close-dialog' || action === 'search-result') button.closest('dialog')?.close();
  if (action === 'focus') { const enabled = !document.body.classList.contains('focus-reading'); save('wiki-focus', String(enabled)); focusMode(enabled); }
  if (action === 'copy-link') copyLink();
  if (action === 'copy-section') { event.preventDefault(); copyLink(button.dataset.anchor); }
  if (action === 'expand-all' || action === 'collapse-all') document.querySelectorAll('.wiki-section').forEach(section => { section.open = action === 'expand-all'; });
  if (action === 'top') window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  if (action === 'expand-table') {
    const table = document.querySelectorAll('.document table')[Number(button.dataset.table)];
    const body = document.querySelector('#table-dialog .expanded-table');
    body.replaceChildren(table.cloneNode(true));
    document.querySelector('#table-dialog').showModal();
  }
});
document.addEventListener('input', event => { if (event.target.id === 'wiki-search') searchResults(event.target.value); });
document.addEventListener('keydown', event => {
  if (!context) return;
  const editing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  if (event.key === '/' && !editing && !event.defaultPrevented) {
    event.preventDefault();
    const input = document.querySelector('#library-search');
    if (input) input.focus(); else openSearch();
  }
  if (document.activeElement.id !== 'wiki-search') return;
  const options = [...document.querySelectorAll('#search-results [role="option"]')];
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); searchIndex = Math.max(0, Math.min(options.length - 1, searchIndex + (event.key === 'ArrowDown' ? 1 : -1))); updateSearchSelection(); }
  if (event.key === 'Enter') { event.preventDefault(); options[searchIndex]?.click(); }
});
document.addEventListener('click', event => {
  if (!(event.target instanceof HTMLDialogElement)) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
