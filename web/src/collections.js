// Shared by collection lists and readers so Previous / Next follows the same results.
export const biteCategories = ['Grammar', 'Vocabulary', 'Pronunciation', 'Speaking'];

export function selectedTags(catalog, params) {
  return (params.get('tags') || '').split(',').filter(t => catalog.categories.some(c => c.id === t));
}

export function collectionItems(catalog, page, params = new URLSearchParams()) {
  const query = (params.get('q') || '').trim().toLowerCase();
  const matches = text => !query || text.toLowerCase().includes(query);
  if (page === 'courses') {
    const tags = selectedTags(catalog, params);
    return catalog.documents.filter(d => d.kind === 'lesson' &&
      matches(`${d.searchText} ${d.tags.map(id => catalog.categories.find(c => c.id === id)?.label || '').join(' ')}`) &&
      (!tags.length || (params.get('mode') === 'any' ? tags.some(t => d.tags.includes(t)) : tags.every(t => d.tags.includes(t)))))
      .sort((a, b) => params.get('sort') === 'asc' ? a.number - b.number : b.number - a.number);
  }
  if (page === 'cue-cards') return catalog.documents.filter(d => d.kind === 'cue-card' && matches(d.searchText))
    .sort((a, b) => params.get('sort') === 'asc' ? a.number - b.number : b.number - a.number);
  if (page === 'topics') return catalog.categories.filter(c => matches(`${c.label} ${c.description} ${catalog.documents.find(d => d.id === c.docId).searchText}`));
  if (page === 'grammar' || page === 'linking-words') return catalog.documents.find(d => d.id === page).groups
    .map((g, i) => ({ ...g, originalIndex: i })).filter(g => matches(`${g.title} ${g.label} ${(g.terms || []).join(' ')}`));
  if (page === 'bites') {
    const category = biteCategories.includes(params.get('category')) ? params.get('category') : '';
    const notes = catalog.bites.filter(note => (!category || note.category === category) &&
      matches([note.id, note.category, note.title, note.prompt, note.explanation, note.qualification, ...note.examples.flat(), note.practice, note.answer].join(' ')));
    return params.get('sort') === 'asc' ? notes : notes.reverse();
  }
  return catalog.documents.filter(d => d.kind === 'resource' && matches(d.searchText));
}

export function documentCollection(doc) {
  return ({ lesson: 'courses', topic: 'topics', resource: 'resources', 'cue-card': 'cue-cards', 'cue-reference': 'cue-cards', bite: 'bites' })[doc.kind] || doc.kind;
}

export function readingNeighbours(catalog, doc, route) {
  const page = documentCollection(doc);
  const proposed = route.params.get('back') || `/${page}`;
  // Only a matching collection can supply the reader's filtering and order.
  let back = proposed.split('?')[0] === `/${page}` ? proposed : `/${page}`;
  let params = new URLSearchParams(back.split('?')[1]);
  const grouped = ['grammar', 'linking-words', 'cue-cards'].includes(doc.kind);
  let section = route.params.get('section');
  if (grouped) {
    const headings = doc.headings || [];
    const index = headings.findIndex(h => h.id === section);
    section = (index >= 0 ? headings.slice(0, index + 1).findLast(h => h.depth === 2) : headings.find(h => h.depth === 2))?.id;
  }
  const makeEntries = () => {
    if (doc.kind === 'cue-reference') return catalog.documents.filter(d => d.kind === 'cue-reference');
    if (grouped) {
      const groups = doc.kind !== 'cue-cards' && params.get('q') ? collectionItems(catalog, page, params) : doc.headings.filter(h => h.depth === 2);
      return groups.map(g => ({ id: doc.id, section: g.id, title: g.label || g.title.replace(/^\d+[. —]+/, '') }));
    }
    const items = collectionItems(catalog, page, params);
    return page === 'topics' ? items.map(c => ({ id: c.docId, title: c.label })) : items;
  };
  const findCurrent = entries => entries.findIndex(e => e.id === doc.id && (!grouped || e.section === section));
  let entries = makeEntries();
  let index = findCurrent(entries);
  // Stale filters or a deep link outside the results use the full collection.
  if (index < 0) {
    back = `/${page}`;
    params = new URLSearchParams();
    entries = makeEntries();
    index = findCurrent(entries);
  }
  return { previous: index > 0 ? entries[index - 1] : null, next: index >= 0 ? entries[index + 1] || null : null, index, total: entries.length, back, page, grouped };
}
