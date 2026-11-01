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
      <label>Voice <select aria-label="English voice"><option value="">Automatic English (prefer on-device)</option></select></label></div>
      <p class="reading-tool-status" role="status"></p>
      <div class="speech-help reading-tool-hint" hidden>
        <p><strong>Try these steps:</strong></p>
        <ol>
          <li>Open this page directly in Chrome and refresh it.</li>
          <li>In Voice, choose an English voice manually. Prefer one marked On-device.</li>
          <li>Select one short sentence in the article, then tap Read selection.</li>
          <li>If it still does not play on Android, open your phone's Settings and search for Text-to-speech output. Choose a speech engine, set the language to English, and tap Play to test it. If the engine list is empty and Google Play is available, install Speech Recognition &amp; Synthesis by Google. Then return here and refresh the page.</li>
        </ol>
      </div></div>`;
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
  const speechHelp = panel.querySelector('.speech-help');
  const speed = panel.querySelector('[aria-label="Reading speed"]');
  const voice = panel.querySelector('[aria-label="English voice"]');
  const selectedButton = panel.querySelector('[data-listen="selection"]');
  const pause = panel.querySelector('[data-listen="pause"]');
  const stop = panel.querySelector('[data-listen="stop"]');
  const input = dialog.querySelector('input');
  let selection = '', voices = [], version = 0, playing = false, paused = false, highlighted;
  const failedVoices = new Set();
  const voiceKey = v => v ? (v.voiceURI || `${v.name}|${v.lang}`) : 'device-default';
  let utterance; // Retain a reference while the device is speaking.
  function unhighlight() { highlighted?.classList.remove('is-being-read'); highlighted = null; }
  function reset(message = '') {
    version++;
    if (synth) synth.cancel();
    playing = paused = false; utterance = null;
    pause.disabled = stop.disabled = true; pause.textContent = 'Pause';
    unhighlight(); status.textContent = message; speechHelp.hidden = true;
  }
  function speechError(message) {
    reset(message);
    speechHelp.hidden = false;
  }
  function updateVoices() {
    const previous = voice.value === '' ? '' : voiceKey(voices[Number(voice.value)]);
    voices = synth.getVoices().filter(v => /^en(?:[-_]|$)/i.test(v.lang));
    voice.replaceChildren(new Option('Automatic English (prefer on-device)', ''));
    voices.forEach((v, i) => voice.add(new Option(`${v.name} (${v.lang})${v.localService === true ? ' · On-device' : v.localService === false ? ' · Online' : ''}`, String(i))));
    const match = voices.findIndex(v => voiceKey(v) === previous);
    voice.value = previous && match >= 0 ? String(match) : '';
  }
  function captureSelection() {
    const range = window.getSelection();
    if (range?.rangeCount && !range.isCollapsed && article.contains(range.anchorNode) && article.contains(range.focusNode)) {
      selection = range.toString().trim();
    } else if (range?.rangeCount && !range.isCollapsed) selection = '';
    else if (!panel.contains(document.activeElement) && !dialog.contains(document.activeElement) && !document.activeElement?.closest('.mobile-reading-options')) selection = '';
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
    if (!supported) { speechError('Read aloud is unavailable in this browser.'); return; }
    if (!queue.length) { status.textContent = 'No text to read. Select a passage and try again.'; return; }
    updateVoices();
    playing = true; pause.disabled = stop.disabled = false;
    const current = version;
    let index = 0;
    let activeVoice;
    const preferred = voice.value === '' ? null : voices[Number(voice.value)];
    // Android may expose online voices even when their service is unreachable.
    // Keep each failed passage in place while trying a different English voice.
    const candidates = [...(preferred ? [preferred] : []),
      ...voices.filter(v => v.localService === true),
      ...voices.filter(v => v.localService !== true)];
    const unique = [...new Map(candidates.map(v => [voiceKey(v), v])).values()]
      .filter(v => !failedVoices.has(voiceKey(v)) || v === preferred);
    if (!unique.length && !voices.length) unique.push(null);
    let candidateIndex = 0;
    const next = () => {
      if (current !== version) return;
      if (index >= queue.length) { reset('Finished reading.'); return; }
      if (activeVoice === undefined) {
        if (candidateIndex >= unique.length) {
          speechError('No English voice could play.');
          return;
        }
        activeVoice = unique[candidateIndex++];
      }
      const item = queue[index];
      unhighlight(); highlighted = item.node; highlighted?.classList.add('is-being-read');
      let ancestor = highlighted?.parentElement;
      while (ancestor && article.contains(ancestor)) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
      const attempt = new SpeechSynthesisUtterance(item.text);
      utterance = attempt;
      attempt.lang = activeVoice?.lang || 'en-US'; attempt.rate = Number(speed.value);
      if (activeVoice) attempt.voice = activeVoice;
      attempt.onend = () => {
        if (current !== version || utterance !== attempt) return;
        index++; next();
      };
      attempt.onerror = event => {
        if (current !== version || utterance !== attempt) return;
        if (['network', 'voice-unavailable', 'language-unavailable', 'synthesis-unavailable', 'synthesis-failed', 'audio-busy'].includes(event.error)) {
          failedVoices.add(voiceKey(activeVoice));
          attempt.onend = attempt.onerror = null;
          synth.cancel();
          activeVoice = undefined;
          paused = false; pause.textContent = 'Pause';
          next();
        } else if (event.error === 'not-allowed') {
          speechError('Your browser blocked speech.');
        } else {
          speechError('Audio could not play.');
        }
      };
      synth.speak(attempt);
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
    speechError('Read aloud is unavailable in this browser. Word lookup is still available.');
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
