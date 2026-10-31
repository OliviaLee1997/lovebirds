let context;
let currentNote;
let currentStep = 0;
const categories = ['Grammar', 'Vocabulary', 'Pronunciation', 'Speaking'];
const colours = { Grammar: '#285c50', Vocabulary: '#91492f', Pronunciation: '#425a88', Speaking: '#755178' };
const names = ['Notice', 'Understand', 'Examples', 'Practise'];
export function configureBites(value) { context = value; }
function navigate(hash) { history.pushState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); }

export function renderBites(params) {
  const { catalog, escape, icon, url } = context;
  const category = categories.includes(params.get('category')) ? params.get('category') : '';
  const query = (params.get('q') || '').trim().toLowerCase();
  const notes = catalog.bites.filter(note => (!category || note.category === category) && (!query || [note.id, note.category, note.title, note.prompt, note.explanation, note.qualification, ...note.examples.flat(), note.practice, note.answer].join(' ').toLowerCase().includes(query)));
  document.querySelector('#bite-filters').innerHTML = ['', ...categories].map(name => `<button data-bites="category" data-category="${name}" aria-pressed="${name === category}">${name || 'All notes'}<span>${name ? catalog.bites.filter(note => note.category === name).length : catalog.bites.length}</span></button>`).join('');
  document.querySelector('#result-count').textContent = `${notes.length} / ${catalog.bites.length} notes`;
  const results = document.querySelector('#results');
  results.className = 'bites-grid';
  results.innerHTML = notes.length ? notes.map(note => `<a class="bite-card" style="--bite-accent:${colours[note.category]}" href="${url(`bite/${note.id}`, { back: location.hash.slice(1) })}"><div class="bite-card-top"><span>${note.category}</span><span>${note.id}</span></div><h3>${escape(note.title)}</h3><p>${escape(note.prompt).replaceAll('\n', '<br>')}</p><div class="bite-card-bottom"><span>4 steps · examples & practice</span>${icon('arrow')}</div></a>`).join('') : '<div class="empty-state"><h3>No matching notes</h3><p>Try another topic or a different category.</p><button class="text-button" data-bites="reset">Clear filters</button></div>';
}

export function renderBite(route) {
  const { catalog, escape, icon, url } = context;
  const note = catalog.bites.find(note => note.id === route.id);
  const main = document.querySelector('#main'); main.className = 'reader-main bite-main';
  if (!note) { main.innerHTML = '<div class="error-state"><h1>Note not found</h1><a href="#/bites">Back to Language Bites</a></div>'; return; }
  currentNote = note;
  const proposed = route.params.get('back') || '/bites';
  const back = /^\/(bites|courses|topics|grammar|cue-cards|resources)(\?|$)/.test(proposed) ? `#${proposed}` : '#/bites';
  currentStep = Math.max(0, Math.min(3, Math.floor(Number(route.params.get('step')) || 1) - 1));
  const related = { Grammar: 'topic-03', Vocabulary: 'topic-04', Pronunciation: 'topic-01', Speaking: 'topic-05' }[note.category];
  main.innerHTML = `<div class="reader-toolbar"><a class="back-link" href="${escape(back)}">${icon('back')} Language Bites</a><button class="tool-button" data-bites="copy">Copy complete note</button></div><header class="reader-heading"><p class="eyebrow">LANGUAGE BITES · ${note.id}</p><h1>${escape(note.title)}</h1><a class="small-tag" href="${url('bites', { category: note.category })}">${note.category}</a></header><div class="bite-layout"><section class="bite-viewer" style="--bite-accent:${colours[note.category]}" aria-label="Four-step learning note"><div class="bite-steps" role="tablist" aria-label="Learning steps">${names.map((name, i) => `<button role="tab" id="step-tab-${i}" aria-controls="step-panel-${i}" data-bites="step" data-step="${i}"><span>${i + 1}</span>${name}</button>`).join('')}</div><div class="bite-content">
      <section id="step-panel-0" class="bite-panel" role="tabpanel" aria-labelledby="step-tab-0" tabindex="0"><p class="eyebrow">A SMALL LANGUAGE QUESTION</p><h2>${escape(note.prompt).replaceAll('\n', '<br>')}</h2><p class="bite-hint">What do you notice? Think it through before moving on.</p></section>
      <section id="step-panel-1" class="bite-panel" role="tabpanel" aria-labelledby="step-tab-1" tabindex="0"><p class="eyebrow">UNDERSTAND THE IDEA</p><h2>The distinction that matters.</h2><p class="bite-rule">${escape(note.explanation)}</p><aside class="bite-qualification"><strong>Keep in mind</strong><p>${escape(note.qualification)}</p></aside></section>
      <section id="step-panel-2" class="bite-panel" role="tabpanel" aria-labelledby="step-tab-2" tabindex="0"><p class="eyebrow">PUT IT IN CONTEXT</p><h2>See it in a sentence.</h2>${note.examples.map(([sentence, meaning], i) => `<div class="bite-example"><span>EXAMPLE ${i + 1}</span><p>${escape(sentence)}</p><small>${escape(meaning)}</small></div>`).join('')}</section>
      <section id="step-panel-3" class="bite-panel" role="tabpanel" aria-labelledby="step-tab-3" tabindex="0"><p class="eyebrow">YOUR TURN</p><h2>A little recall practice.</h2><p class="bite-rule">${escape(note.practice)}</p><details class="bite-answer"><summary>Reveal answer</summary><p>${escape(note.answer)}</p></details><p class="bite-hint">Now try one more example of your own.</p></section>
    </div><div class="bite-navigation"><button data-bites="previous">${icon('back')} Previous</button><span id="bite-step-count" aria-live="polite"></span><button data-bites="next">Next ${icon('arrow')}</button></div></section><aside class="bite-aside"><h2>One idea at a time</h2><p>Notice the question, understand the pattern, then use it yourself.</p><div class="bite-source-note">${escape(catalog.bitesNotice)}</div><a href="#/read/${related}">Explore the related collection ${icon('arrow')}</a><a href="${url('bites', { category: note.category })}">More ${note.category.toLowerCase()} notes ${icon('arrow')}</a></aside></div><p id="bite-copy-status" class="bite-copy-status" role="status"></p>`;
  setStep(currentStep, false);
}

function setStep(step, updateURL = true) {
  currentStep = Math.max(0, Math.min(3, step));
  document.querySelectorAll('.bite-steps [role="tab"]').forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === currentStep)); tab.tabIndex = i === currentStep ? 0 : -1; });
  document.querySelectorAll('.bite-panel').forEach((panel, i) => { panel.hidden = i !== currentStep; });
  document.querySelector('[data-bites="previous"]').disabled = currentStep === 0;
  document.querySelector('[data-bites="next"]').disabled = currentStep === 3;
  document.querySelector('#bite-step-count').textContent = `${currentStep + 1} / 4 · ${names[currentStep]}`;
  if (updateURL) {
    const [pathname, search = ''] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(search); params.set('step', String(currentStep + 1));
    history.replaceState(null, '', `#${pathname}?${params}`);
  }
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-bites]'); if (!button || !context) return;
  const action = button.dataset.bites;
  if (action === 'category') { const query = document.querySelector('#library-search')?.value || ''; navigate(context.url('bites', { category: button.dataset.category, q: query })); }
  if (action === 'reset') navigate('#/bites');
  if (action === 'step') setStep(Number(button.dataset.step));
  if (action === 'previous') setStep(currentStep - 1);
  if (action === 'next') setStep(currentStep + 1);
  if (action === 'copy' && currentNote) {
    const note = currentNote;
    const text = `${note.title}\n\n${note.prompt}\n\n${note.explanation}\n\nKeep in mind: ${note.qualification}\n\nExamples\n${note.examples.map(([sentence, meaning]) => `${sentence}\n${meaning}`).join('\n\n')}\n\nYour turn: ${note.practice}\n\nAnswer: ${note.answer}\n\n${note.id} · ${note.category}\n${context.catalog.bitesNotice}`;
    const status = document.querySelector('#bite-copy-status');
    try { await navigator.clipboard.writeText(text); status.textContent = 'Complete note copied.'; }
    catch { status.textContent = 'Clipboard unavailable. You can select and copy the text directly.'; }
  }
});
document.addEventListener('keydown', event => {
  if (!event.target.matches('.bite-steps [role="tab"]')) return;
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  setStep(event.key === 'Home' ? 0 : event.key === 'End' ? 3 : currentStep + (event.key === 'ArrowRight' ? 1 : -1));
  document.querySelector(`#step-tab-${currentStep}`).focus();
});
