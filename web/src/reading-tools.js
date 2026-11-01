let cleanup = () => {};
export function clearReadingTools() { cleanup(); cleanup = () => {}; }

// Queries and speech state belong to this open page only; nothing is persisted.
export function mountReadingTools() {
  clearReadingTools();
  const article = document.querySelector('.document, .bite-viewer');
  if (!article) return;
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = supported ? window.speechSynthesis : null;
  const panel = document.createElement('details');
  panel.className = 'reading-tools';
  panel.innerHTML = `<summary>Listen & look up</summary>
    <div class="reading-tools-body"><div class="reading-tool-actions">
      <button type="button" data-listen="all">Read article</button><button type="button" data-listen="selection" disabled>Read selection</button>
      <button type="button" data-listen="pause" disabled>Pause</button><button type="button" data-listen="stop" disabled>Stop</button>
      <button type="button" data-lookup>Look up</button></div>
      <div class="reading-tool-options"><label>Speed <select aria-label="Reading speed"><option value="0.75">0.75×</option><option value="0.9">0.9×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.25">1.25×</option></select></label>
      <label>Voice <select aria-label="English voice"><option value="">Device default English</option></select></label></div>
      <p class="reading-tool-status" role="status"></p></div>`;
  const column = article.closest('.reading-column') || article.parentElement;
  if (column.classList.contains('reading-column')) column.prepend(panel); else article.before(panel);
  const dialog = document.createElement('dialog');
  dialog.className = 'lookup-dialog';
  dialog.setAttribute('aria-labelledby', 'lookup-title');
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="lookup-title">Word & phrase lookup</h2><button type="button" class="text-button" data-lookup-close>Close</button></div>
    <form class="lookup-form"><label for="lookup-query">English word or phrase</label><input id="lookup-query" type="text" maxlength="120" autocomplete="off" placeholder="Enter a word or phrase" required><button type="submit">Find meaning</button></form>
    <div class="lookup-results" hidden><p class="lookup-term"></p><button type="button" data-pronounce>Hear pronunciation</button><div class="lookup-links"></div></div>
    <p class="reading-tool-hint">Meanings open in an external dictionary or translation service in a new tab. Only the word or phrase you submit is included in the link.</p>`;
  panel.after(dialog);
  const status = panel.querySelector('[role="status"]');
  const speed = panel.querySelector('[aria-label="Reading speed"]');
  const voice = panel.querySelector('[aria-label="English voice"]');
  const selectedButton = panel.querySelector('[data-listen="selection"]');
  const pause = panel.querySelector('[data-listen="pause"]');
  const stop = panel.querySelector('[data-listen="stop"]');
  const input = dialog.querySelector('input');
  let selection = '', voices = [], version = 0, playing = false, paused = false, highlighted;
  let utterance; // Retain a reference while the device is speaking.
  function unhighlight() { highlighted?.classList.remove('is-being-read'); highlighted = null; }
  function reset(message = '') {
    version++;
    if (synth) synth.cancel();
    playing = paused = false; utterance = null;
    pause.disabled = stop.disabled = true; pause.textContent = 'Pause';
    unhighlight(); status.textContent = message;
  }
  function updateVoices() {
    const previous = voice.value;
    voices = synth.getVoices().filter(v => /^en(?:[-_]|$)/i.test(v.lang));
    voice.replaceChildren(new Option('Device default English', ''));
    voices.forEach((v, i) => voice.add(new Option(`${v.name} (${v.lang})`, String(i))));
    if ([...voice.options].some(o => o.value === previous)) voice.value = previous;
  }
  function captureSelection() {
    const range = window.getSelection();
    if (range?.rangeCount && !range.isCollapsed && article.contains(range.anchorNode) && article.contains(range.focusNode)) {
      selection = range.toString().trim();
    } else if (range?.rangeCount && !range.isCollapsed) selection = '';
    else if (!panel.contains(document.activeElement) && !dialog.contains(document.activeElement)) selection = '';
    selectedButton.disabled = !supported || !selection;
  }
  function pieces(text, node = null) {
    const words = text.trim().split(/\s+/);
    const result = []; let chunk = '';
    for (const word of words) {
      if (chunk.length + word.length > 220 && chunk) { result.push({ text: chunk, node }); chunk = ''; }
      chunk += (chunk ? ' ' : '') + word;
    }
    if (chunk) result.push({ text: chunk, node });
    return result;
  }
  function speak(queue) {
    reset();
    if (!supported) { status.textContent = 'Read aloud is unavailable in this browser. Try a browser with speech support.'; return; }
    if (!queue.length) { status.textContent = 'No text to read. Select a passage and try again.'; return; }
    playing = true; pause.disabled = stop.disabled = false;
    const current = version;
    let index = 0;
    const next = () => {
      if (current !== version) return;
      if (index >= queue.length) { reset('Finished reading.'); return; }
      const item = queue[index++];
      unhighlight(); highlighted = item.node; highlighted?.classList.add('is-being-read');
      let ancestor = highlighted?.parentElement;
      while (ancestor && article.contains(ancestor)) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
      utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = 'en-US'; utterance.rate = Number(speed.value);
      if (voice.value !== '' && voices[Number(voice.value)]) {
        utterance.voice = voices[Number(voice.value)]; utterance.lang = utterance.voice.lang;
      }
      utterance.onend = next;
      utterance.onerror = event => { if (current === version) reset(`Reading stopped (${event.error || 'voice unavailable'}). Try another voice or a shorter selection.`); };
      synth.speak(utterance);
    };
    next();
  }
  function articlePieces() {
    return [...article.querySelectorAll('h2, h3, h4, p, li, th, td')]
      .filter(el => !el.closest('.source-details, .table-toolbar') && !el.parentElement.closest('p, li, th, td'))
      .flatMap(el => pieces(el.textContent, el));
  }
  function showResults() {
    const term = input.value.trim(); if (!term) return;
    dialog.querySelector('.lookup-results').hidden = false;
    dialog.querySelector('.lookup-term').textContent = term;
    const links = dialog.querySelector('.lookup-links'); links.replaceChildren();
    const dictionary = `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(term.toLowerCase())}`;
    const translation = new URL('https://translate.google.com/');
    translation.search = new URLSearchParams({ sl: 'en', tl: 'zh-CN', text: term, op: 'translate' });
    for (const [label, href] of [['English–Chinese dictionary ↗', dictionary], ['Translate word or phrase ↗', translation.href]]) {
      const link = document.createElement('a'); link.textContent = label; link.href = href;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
    }
  }
  panel.addEventListener('click', event => {
    const action = event.target.closest('[data-listen]')?.dataset.listen;
    if (action === 'all') speak(articlePieces());
    if (action === 'selection') speak(pieces(selection));
    if (action === 'stop') reset('Stopped.');
    if (action === 'pause' && playing) {
      if (paused) { synth.resume(); paused = false; pause.textContent = 'Pause'; status.textContent = 'Reading resumed.'; }
      else { synth.pause(); paused = true; pause.textContent = 'Resume'; status.textContent = 'Paused.'; }
    }
    if (event.target.closest('[data-lookup]')) {
      input.value = selection.slice(0, 120);
      dialog.querySelector('.lookup-results').hidden = true;
      if (input.value.trim()) showResults();
      dialog.showModal(); input.focus();
    }
  });
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); showResults(); });
  dialog.querySelector('[data-lookup-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-pronounce]').disabled = !supported;
  dialog.querySelector('[data-pronounce]').addEventListener('click', () => speak(pieces(dialog.querySelector('.lookup-term').textContent)));
  if (supported) { updateVoices(); synth.addEventListener('voiceschanged', updateVoices); }
  else {
    panel.querySelectorAll('[data-listen], select').forEach(control => { control.disabled = true; });
    status.textContent = 'Read aloud is unavailable in this browser. Word lookup is still available.';
  }
  document.addEventListener('selectionchange', captureSelection);
  const onPageHide = () => reset();
  window.addEventListener('pagehide', onPageHide);
  cleanup = () => {
    reset(); document.removeEventListener('selectionchange', captureSelection);
    synth?.removeEventListener('voiceschanged', updateVoices);
    window.removeEventListener('pagehide', onPageHide);
    dialog.remove(); panel.remove();
  };
}
