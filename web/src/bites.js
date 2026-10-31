let context;
let currentNote;
const categories = ['Grammar', 'Vocabulary', 'Pronunciation', 'Speaking'];
const colours = { Grammar: '#285c50', Vocabulary: '#91492f', Pronunciation: '#425a88', Speaking: '#755178' };
const sections = ['notice', 'understand', 'examples', 'practise'];
export function configureBites(value) { context = value; }

export function renderBites(params) {
  const { catalog, escape, icon, url } = context;
  const category = categories.includes(params.get('category')) ? params.get('category') : '';
  const query = (params.get('q') || '').trim().toLowerCase();
  const notes = catalog.bites.filter(note => (!category || note.category === category) && (!query || [note.id, note.category, note.title, note.prompt, note.explanation, note.qualification, ...note.examples.flat(), note.practice, note.answer].join(' ').toLowerCase().includes(query)));
  // Source order is append-only: newly added notes appear first by default.
  if (params.get('sort') !== 'asc') notes.reverse();
  document.querySelector('#bite-filters').innerHTML = ['', ...categories].map(name => `<button data-bites="category" data-category="${name}" aria-pressed="${name === category}">${name || 'All notes'}<span>${name ? catalog.bites.filter(note => note.category === name).length : catalog.bites.length}</span></button>`).join('');
  document.querySelector('#result-count').textContent = `${notes.length} / ${catalog.bites.length} notes`;
  const results = document.querySelector('#results');
  results.className = 'bites-grid';
  results.innerHTML = notes.length ? notes.map(note => `<a class="bite-card" style="--bite-accent:${colours[note.category]}" href="${url(`bite/${note.id}`, { back: location.hash.slice(1) })}"><div class="bite-card-top"><span>${note.category}</span><span>${note.id}</span></div><h3>${escape(note.title)}</h3><p>${escape(note.prompt).replaceAll('\n', '<br>')}</p><div class="bite-card-bottom"><span>Read · examples · practice</span>${icon('arrow')}</div></a>`).join('') : '<div class="empty-state"><h3>No matching notes</h3><p>Try another topic or a different category.</p><button class="text-button" data-bites="reset">Clear filters</button></div>';
}

export function renderBite(route) {
  const { catalog, escape, icon, url } = context;
  const note = catalog.bites.find(note => note.id === route.id);
  const main = document.querySelector('#main'); main.className = 'reader-main bite-main';
  currentNote = note;
  if (!note) { main.innerHTML = '<div class="error-state"><h1>Note not found</h1><a href="#/bites">Back to Language Bites</a></div>'; return; }
  const proposed = route.params.get('back') || '/bites';
  const back = /^\/(bites|courses|topics|grammar|cue-cards|linking-words|resources)(\?|$)/.test(proposed) ? `#${proposed}` : '#/bites';
  const related = { Grammar: 'topic-03', Vocabulary: 'topic-04', Pronunciation: 'topic-01', Speaking: 'topic-05' }[note.category];
  main.innerHTML = `<div class="reader-toolbar"><a class="back-link" href="${escape(back)}">${icon('back')} Language Bites</a><button class="tool-button" data-bites="copy">Copy complete note</button></div>
    <header class="reader-heading"><p class="eyebrow">LANGUAGE BITES · ${note.id}</p><h1>${escape(note.title)}</h1><a class="small-tag" href="${url('bites', { category: note.category })}">${note.category}</a></header>
    <div class="bite-layout"><article class="bite-viewer" style="--bite-accent:${colours[note.category]}" aria-label="Complete learning note"><div class="bite-content">
      <section id="bite-notice" class="bite-panel" aria-labelledby="notice-title"><header class="bite-section-heading"><span>01</span><h2 id="notice-title">Notice</h2></header><p class="bite-prompt">${escape(note.prompt).replaceAll('\n', '<br>')}</p><p class="bite-hint">What do you notice? Think it through, then read on.</p></section>
      <section id="bite-understand" class="bite-panel" aria-labelledby="understand-title"><header class="bite-section-heading"><span>02</span><h2 id="understand-title">Understand</h2></header><p class="bite-rule">${escape(note.explanation)}</p><aside class="bite-qualification"><strong>Keep in mind</strong><p>${escape(note.qualification)}</p></aside></section>
      <section id="bite-examples" class="bite-panel" aria-labelledby="examples-title"><header class="bite-section-heading"><span>03</span><h2 id="examples-title">Examples</h2></header>${note.examples.map(([sentence, meaning], i) => `<div class="bite-example"><span>EXAMPLE ${i + 1}</span><p>${escape(sentence)}</p><small>${escape(meaning)}</small></div>`).join('')}</section>
      <section id="bite-practise" class="bite-panel" aria-labelledby="practise-title"><header class="bite-section-heading"><span>04</span><h2 id="practise-title">Practise</h2></header><p class="bite-rule">${escape(note.practice)}</p><details class="bite-answer" open><summary>Practice answer</summary><p>${escape(note.answer)}</p></details><p class="bite-hint">Try one more example of your own. Fold the answer if you want to test yourself.</p></section>
    </div></article><aside class="bite-aside"><h2>One idea at a time</h2><p>Read from top to bottom: notice, understand, then use it yourself.</p><div class="bite-source-note">${escape(catalog.bitesNotice)}</div><a href="#/read/${related}">Explore the related collection ${icon('arrow')}</a><a href="${url('bites', { category: note.category })}">More ${note.category.toLowerCase()} notes ${icon('arrow')}</a></aside></div><p id="bite-copy-status" class="bite-copy-status" role="status"></p>`;
  // Existing links to a former step now scroll to that part of the complete note.
  if (route.params.has('step')) {
    const index = Math.max(0, Math.min(3, Math.floor(Number(route.params.get('step')) || 1) - 1));
    const target = document.querySelector(`#bite-${sections[index]}`);
    requestAnimationFrame(() => { if (target.isConnected) target.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-bites]'); if (!button || !context) return;
  const action = button.dataset.bites;
  if (action === 'category') {
    const query = document.querySelector('#library-search')?.value || '';
    const sort = new URLSearchParams(location.hash.split('?')[1]).get('sort') || '';
    context.navigate(context.url('bites', { category: button.dataset.category, q: query, sort }));
  }
  if (action === 'reset') context.navigate('#/bites');
  if (action === 'copy' && currentNote) {
    const note = currentNote;
    const text = `${note.title}\n\n${note.prompt}\n\n${note.explanation}\n\nKeep in mind: ${note.qualification}\n\nExamples\n${note.examples.map(([sentence, meaning]) => `${sentence}\n${meaning}`).join('\n\n')}\n\nYour turn: ${note.practice}\n\nAnswer: ${note.answer}\n\n${note.id} · ${note.category}\n${context.catalog.bitesNotice}`;
    const status = document.querySelector('#bite-copy-status');
    try { await navigator.clipboard.writeText(text); status.textContent = 'Complete note copied.'; }
    catch { status.textContent = 'Clipboard unavailable. You can select and copy the text directly.'; }
  }
});
