let utterance;
export function stopVocabularySpeech() {
  if (utterance) window.speechSynthesis?.cancel();
  utterance = undefined;
}
export function renderVocabulary(words, params, { escape: e, readUrl, catalog }) {
  const query = (params.get('q') || '').trim().toLowerCase();
  const matches = words.filter(w => [w.word, w.meaning, w.collocation, w.example, w.pos].join(' ').toLowerCase().includes(query));
  const target = document.querySelector('#results');
  target.className = 'vocabulary-list';
  target.innerHTML = `<p class="vocabulary-note">Selected from the lesson notes, including added study material. Definitions and examples below are added study aids. IPA uses British English; device audio may use a different accent. Hide meanings to practise recall.</p><label class="vocabulary-recall"><input type="checkbox" id="hide-vocabulary-meanings"> Hide meanings and examples</label><p id="vocabulary-status" role="status"></p>${matches.map(w => {
    const doc = catalog.documents.find(d => d.kind === 'lesson' && d.number === w.lesson);
    return `<article class="vocabulary-word"><header><h2>${e(w.word)}</h2><span>${e(w.pos)}</span><button class="tool-button" data-vocabulary-speak="${e(w.word)}" aria-label="Pronounce ${e(w.word)}">Listen</button></header><p class="vocabulary-ipa">${e(w.ipa)}</p><details class="vocabulary-meaning" open><summary>Meaning and example</summary><p>${e(w.meaning)}</p><p><strong>${e(w.collocation)}</strong></p><p>${e(w.example)}</p></details><footer>${doc ? `<a href="${readUrl(doc.id)}">Lesson ${String(w.lesson).padStart(2, '0')}</a>` : ''} · <a href="https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(w.word)}" target="_blank" rel="noopener noreferrer">Dictionary &amp; audio</a></footer></article>`;
  }).join('')}${matches.length ? '' : '<p>No matching words. Try another word or meaning.</p>'}`;
  document.querySelector('#result-count').textContent = `${matches.length} / ${words.length} words`;
  document.querySelector('#hide-vocabulary-meanings').addEventListener('change', event => {
    target.querySelectorAll('.vocabulary-meaning').forEach(d => { d.open = !event.target.checked; });
  });
}
export function vocabularyAction(event) {
  const button = event.target.closest('[data-vocabulary-speak]');
  if (!button) return false;
  const status = document.querySelector('#vocabulary-status');
  stopVocabularySpeech();
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    status.textContent = 'Audio is unavailable on this device. Open Dictionary & audio to hear the word.';
    return true;
  }
  utterance = new SpeechSynthesisUtterance(button.dataset.vocabularySpeak);
  utterance.lang = 'en-GB';
  utterance.rate = 0.85;
  const voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-GB');
  if (voice) utterance.voice = voice;
  status.textContent = `Playing: ${button.dataset.vocabularySpeak}`;
  utterance.onend = () => { status.textContent = ''; };
  utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) status.textContent = 'Audio could not play. Try Dictionary & audio.'; };
  window.speechSynthesis.speak(utterance);
  return true;
}
window.addEventListener('pagehide', stopVocabularySpeech);
