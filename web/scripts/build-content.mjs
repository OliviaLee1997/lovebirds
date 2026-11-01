import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const CONTENT_ROOT = path.join(ROOT, 'content');
const OUTPUT = path.join(ROOT, 'web/public/content');
const IMAGE_OUTPUT = path.join(ROOT, 'web/public/lesson-assets');
const CUE_ROOT = 'Practice/IELTS-Speaking/Cue-Cards';
const COMBINED_CUES = 'Practice/IELTS-Speaking/Course-Cue-Card-Review.md';
const TOPIC_LABELS = ['Pronunciation', 'Tenses', 'Grammar', 'Vocabulary', 'Linking words', 'Everyday & work', 'Descriptions', 'Storytelling', 'Discussion'];
const TOPIC_DESCRIPTIONS = ['Sounds, connected speech and listening.', 'Past, present and future relationships.', 'Sentence structure and recurring patterns.', 'Word choice, meanings and collocations.', 'Connect ideas and organise an answer.', 'Language for everyday and workplace situations.', 'Describe people, places and things.', 'Tell an experience with a clear sequence.', 'Explain, support and qualify your opinions.'];
const LESSON_LABELS = [];
const GRAMMAR_LABELS = [];
const APPROVED_ASSETS = new Set([...Array.from({ length: 5 }, (_, i) => `Course-Notes/assets/image${i + 1}.png`), 'Resources/LinkingWordsInEnglish.jpg']);

export function plainText(value) {
  return value.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[*_`#>|]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
export function slug(value) {
  return plainText(value).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
export function parseCourseMap(source) {
  const result = new Map();
  for (const line of source.split('\n')) {
    const lesson = line.match(/\]\(\.\.\/(Course-Notes\/Lesson-[^)]+\.md)\)/);
    if (!lesson) continue;
    const tags = [...line.matchAll(/\[(\d{2})\]\((\d{2})-[^)]+\.md\)/g)].map(m => m[1]);
    if (result.has(lesson[1])) throw new Error(`Duplicate course map entry: ${lesson[1]}`);
    result.set(lesson[1], [...new Set(tags)]);
  }
  return result;
}

export function renderDocument(source, sourcePath, registry) {
  const headings = [];
  const used = new Map();
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const html = this.parser.parseInline(tokens);
    const title = plainText(html);
    const base = slug(title);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    const id = base + (n ? `-${n}` : '');
    headings.push({ id, title, depth });
    return `<h${depth} id="${escapeHtml(id)}">${html}</h${depth}>\n`;
  };
  renderer.image = function ({ href, text }) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), decodeURIComponent(href)));
    if (!APPROVED_ASSETS.has(resolved)) return `<span class="asset-note">${escapeHtml(text || 'Lesson illustration')} · Attachment not included</span>`;
    return `<img src="./lesson-assets/${path.basename(resolved)}" alt="${escapeHtml(text)}" loading="lazy" />`;
  };
  renderer.link = function ({ href, tokens }) {
    const label = this.parser.parseInline(tokens);
    if (/^https?:\/\//i.test(href)) return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    if (href.startsWith('#')) return `<a href="#${escapeHtml(decodeURIComponent(href.slice(1)))}" data-section="${escapeHtml(decodeURIComponent(href.slice(1)))}">${label}</a>`;
    const [filename, fragment] = href.split('#');
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), decodeURIComponent(filename)));
    if (APPROVED_ASSETS.has(target)) return `<a href="./lesson-assets/${escapeHtml(path.basename(target))}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    const doc = registry.get(target);
    if (doc) return `<a href="#/read/${doc}${fragment ? `?section=${encodeURIComponent(decodeURIComponent(fragment))}` : ''}">${label}</a>`;
    return `${label}<span class="asset-note"> (attachment not included)</span>`;
  };
  const raw = marked.parse(source, { renderer, gfm: true });
  const html = sanitizeHtml(raw, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'input'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['id', 'class'],
      a: ['href', 'target', 'rel', 'data-section'],
      img: ['src', 'alt', 'loading'],
      input: ['type', 'checked', 'disabled'],
    },
    allowedSchemes: ['https', 'http'],
    allowProtocolRelative: false,
    transformTags: { input: (_, attrs) => ({ tagName: 'input', attribs: { ...attrs, type: 'checkbox', disabled: '' } }) },
  });
  return { html, headings };
}

export async function buildContent() {
  const read = rel => fs.readFile(path.join(CONTENT_ROOT, rel), 'utf8');
  const writeJSON = async (name, value) => {
    const target = path.join(OUTPUT, `${name}.json`);
    await fs.writeFile(`${target}.tmp`, JSON.stringify(value));
    await fs.rename(`${target}.tmp`, target);
  };
  const courseMap = parseCourseMap(await read('Topic-Review/README.md'));
  const courseIndex = await read('Course-Notes/README.md');
  const focusMap = new Map();
  for (const line of courseIndex.split('\n')) {
    const file = line.match(/\]\((Lesson-[^)]+\.md)\)/)?.[1];
    if (file) focusMap.set(`Course-Notes/${file}`, plainText(line.split('|').at(-2)));
  }
  const lessons = (await fs.readdir(path.join(CONTENT_ROOT, 'Course-Notes'))).filter(f => /^Lesson-\d+-.*\.md$/.test(f)).sort();
  const topics = (await fs.readdir(path.join(CONTENT_ROOT, 'Topic-Review'))).filter(f => /^\d+-.*\.md$/.test(f)).sort();
  const cueNumber = file => Number(file.match(/^Cue-Card-(\d+)/)[1]);
  const cueFiles = (await fs.readdir(path.join(CONTENT_ROOT, CUE_ROOT))).filter(f => /^Cue-Card-\d+-.*\.md$/.test(f))
    .sort((a, b) => cueNumber(b) - cueNumber(a));
  const cueId = file => `cue-card-${String(Number(file.match(/^Cue-Card-(\d+)/)[1])).padStart(2, '0')}`;
  const cueSources = new Map();
  for (const file of cueFiles) {
    const source = await read(`${CUE_ROOT}/${file}`);
    if (Number(source.match(/^# Cue Card (\d+) — /)?.[1]) !== cueNumber(file)) throw new Error(`Cue-card filename and title numbers disagree: ${file}`);
    cueSources.set(`${CUE_ROOT}/${file}`, source);
  }
  // Preserve existing collection and section links without maintaining another Markdown copy.
  const combined = [
    (await read(`${CUE_ROOT}/Guide.md`)).replace(/^# .+/, '# Cue Card Speaking Practice — Extended Answers and Personal Grammar Review').trim(),
    ...[...cueSources.values()].map(source => source
      .replace(/^# Cue Card /, '# ')
      .replace(/^\*\*Study note:\*\*[^\n]+\n\n/m, '')
      .replace('## Practice Cue Card\n\n', '**Practice cue card:** ')
      .replace(/^(#{1,2}) /gm, '#$1 ').trim()),
    (await read(`${CUE_ROOT}/Grammar-Review.md`)).replace(/^(#{1,2}) /gm, '#$1 ').trim(),
  ].join('\n\n') + '\n';
  const practice = [
    ['Practice/Personal-Grammar-Error-Review.md', 'grammar', 'Personal grammar review', ['02', '03']],
    [COMBINED_CUES, 'cue-cards', 'Cue card collection', ['07', '08', '09']],
    ['Practice/Linking-Words-Read-Aloud-Practice.md', 'linking-words', 'Linking-word practice', ['05']],
    ['Practice/IELTS-Speaking/IELTS-Speaking-Part-1-Questions-and-Templates.md', 'ielts-part-1', 'IELTS Part 1 templates', ['06', '07']],
    ['Practice/IELTS-Speaking/IELTS-Speaking-Part-2-Cue-Card-Templates.md', 'ielts-part-2', 'IELTS Part 2 templates', ['07', '08']],
    ['Practice/IELTS-Speaking/IELTS-Speaking-Part-3-Discussion-Templates.md', 'ielts-part-3', 'IELTS Part 3 templates', ['09']],
  ];
  const inputs = [
    ...lessons.map(file => { const number = Number(file.match(/^Lesson-(\d+)/)[1]); return { source: `Course-Notes/${file}`, id: `lesson-${String(number).padStart(2, '0')}`, number, kind: 'lesson', label: LESSON_LABELS[number - 1] || '' }; }),
    ...topics.map(file => { const n = Number(file.slice(0, 2)); return { source: `Topic-Review/${file}`, id: `topic-${file.slice(0, 2)}`, number: n, kind: 'topic', label: TOPIC_LABELS[n - 1] || '', tags: [file.slice(0, 2)] }; }),
    ...cueFiles.map(file => ({ source: `${CUE_ROOT}/${file}`, id: cueId(file), number: cueNumber(file), kind: 'cue-card', tags: ['07', '08', '09'] })),
    { source: `${CUE_ROOT}/Guide.md`, id: 'cue-card-guide', kind: 'cue-reference', label: 'Cue card practice guide', tags: ['07', '08', '09'] },
    { source: `${CUE_ROOT}/Grammar-Review.md`, id: 'cue-card-grammar', kind: 'cue-reference', label: 'Cue card grammar review', tags: ['02', '03'] },
    { source: `${CUE_ROOT}/Answer-Templates.md`, id: 'cue-card-templates', kind: 'cue-reference', label: 'Cue card answer templates', tags: ['07', '08', '09'] },
    ...practice.map(([source, id, label, tags]) => ({ source, id, label, tags, kind: ['grammar', 'cue-cards', 'linking-words'].includes(id) ? id : 'resource' })),
  ];
  if (new Set(inputs.map(input => input.id)).size !== inputs.length) throw new Error('Duplicate document ID or cue-card number');
  const registry = new Map(inputs.map(d => [d.source, d.id]));
  registry.set(`${CUE_ROOT}/README.md`, 'cue-cards');
  const categoryIds = new Set(topics.map(t => t.slice(0, 2)));
  for (const [file, tags] of courseMap) {
    if (!registry.has(file)) throw new Error(`Course map links to a missing lesson: ${file}`);
    for (const tag of tags) if (!categoryIds.has(tag)) throw new Error(`Unknown category ${tag}: ${file}`);
  }
  await fs.mkdir(OUTPUT, { recursive: true });
  await fs.mkdir(IMAGE_OUTPUT, { recursive: true });
  const documents = [];
  const warnings = [];
  for (const input of inputs) {
    const source = input.source === COMBINED_CUES ? combined : cueSources.get(input.source) ?? await read(input.source);
    if (input.kind === 'lesson' && !courseMap.has(input.source)) warnings.push(`${input.source}: no course map entry; shown as Uncategorised.`);
    const tags = input.tags || courseMap.get(input.source) || [];
    const title = plainText(source.match(/^# (.+)$/m)?.[1] || input.id).replace(/^(?:Lesson|Cue Card) \d+\s*[—–-]\s*/, '');
    const rendered = renderDocument(source, input.source, registry);
    const focus = source.match(/^>?\s*\*\*(?:Focus|Main communication goal):\*\*\s*(.+)$/m)?.[1];
    const description = input.kind === 'topic' ? TOPIC_DESCRIPTIONS[input.number - 1] || '' : focusMap.get(input.source) || (focus ? plainText(focus) : 'Notes, examples and review exercises.');
    const sections = rendered.headings.filter(h => h.depth === 2);
    const groups = sections.filter(h => input.kind === 'grammar' ? /^\d+\. /.test(h.title) : input.kind === 'linking-words' ? /^(?:[1-9]|1[0-2])\. /.test(h.title) : input.kind === 'cue-cards' ? /^\d+ — /.test(h.title) : false).map((h, i) => ({ ...h, label: input.kind === 'grammar' ? GRAMMAR_LABELS[i] || h.title.replace(/^\d+\. /, '') : h.title.replace(/^\d+(?:\.| —) /, '') }));
    if (input.kind === 'linking-words') for (const group of groups) {
      const start = rendered.headings.findIndex(h => h.id === group.id) + 1;
      const rest = rendered.headings.slice(start);
      const end = rest.findIndex(h => h.depth === 2);
      group.terms = rest.slice(0, end < 0 ? rest.length : end).filter(h => h.depth === 3).map(h => h.title);
    }
    const text = plainText(source);
    const metadata = { ...input, source: undefined, title, label: input.label || title, description, tags, sections: sections.length, groups, words: text.split(/\s+/).length, searchText: `${input.label || ''} ${title} ${text}`.toLowerCase() };
    documents.push(metadata);
    await writeJSON(input.id, { ...metadata, ...rendered, searchText: undefined });
  }
  const categories = topics.map(file => {
    const id = file.slice(0, 2);
    return { id, label: TOPIC_LABELS[Number(id) - 1] || documents.find(d => d.id === `topic-${id}`).title, description: TOPIC_DESCRIPTIONS[Number(id) - 1] || '', docId: `topic-${id}`, count: documents.filter(d => d.kind === 'lesson' && d.tags.includes(id)).length };
  });
  const bites = JSON.parse(await read('Language-Bites/notes.json'));
  const seenBites = new Set();
  const biteCategories = ['Grammar', 'Vocabulary', 'Pronunciation', 'Speaking'];
  for (const note of bites.notes) {
    if (seenBites.has(note.id) || !/^[GVPS]\d+$/.test(note.id)) throw new Error(`Invalid or duplicate bite ID: ${note.id}`);
    seenBites.add(note.id);
    if (!biteCategories.includes(note.category)) throw new Error(`Unknown bite category: ${note.id}`);
    for (const key of ['title', 'prompt', 'explanation', 'qualification', 'practice', 'answer']) if (typeof note[key] !== 'string' || !note[key].trim()) throw new Error(`Missing ${key}: ${note.id}`);
    if (!Array.isArray(note.examples) || !note.examples.length || note.examples.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(value => typeof value !== 'string' || !value.trim()))) throw new Error(`Invalid examples: ${note.id}`);
  }
  const catalog = { version: 1, documents, categories, warnings, bites: bites.notes, bitesNotice: bites.notice };
  for (const asset of APPROVED_ASSETS) await fs.copyFile(path.join(CONTENT_ROOT, asset), path.join(IMAGE_OUTPUT, path.basename(asset)));
  await writeJSON('catalog', catalog);
  const generated = new Set(['catalog.json', ...inputs.map(input => `${input.id}.json`)]);
  for (const file of await fs.readdir(OUTPUT)) if (file.endsWith('.json') && !generated.has(file)) await fs.unlink(path.join(OUTPUT, file));
  console.log(`Content ready: ${lessons.length} lessons, ${topics.length} topic reviews, ${documents.find(d => d.id === 'grammar').groups.length} grammar categories, ${documents.find(d => d.id === 'cue-cards').groups.length} cue cards, ${bites.notes.length} Language Bites.`);
  warnings.forEach(w => console.warn(w));
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildContent();
