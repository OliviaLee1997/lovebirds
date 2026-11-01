# Frontend Maintenance

Run all npm commands from the [repository root](../README.md). The site uses Vite, plain JavaScript, CSS, `marked`, and `sanitize-html`. No remote font service, analytics, backend, or runtime API is needed.

## Files

| File | Responsibility |
| --- | --- |
| `src/main.js` | Catalogue views, English labels, filtering, hash routes, and reader loading. |
| `src/collections.js` | Shared filtering, filename-based cue-card ordering, and reader neighbours. |
| `src/wiki.js` | Section folding, contents highlighting, reading progress, focus mode, global search, table expansion, copied links, and local preferences. |
| `src/bites.js` | Language Bites filtering, ordering, continuous reading, optional answer folding, legacy step links, and copying complete notes. |
| `src/mobile-reader.js` | Phone reader tools disclosure and restoration of desktop control positions when resizing. |
| `src/reading-tools.js` | Optional article and selected-text speech, device voices, and external word or phrase lookup; no query or playback persistence. |
| `src/style.css` | Warm green theme, compact list and card views, reading columns, dialogs, and mobile layout. |
| `scripts/build-content.mjs` | Read Markdown from this repository's `content/`, generate safe HTML and catalogue JSON, and copy allowlisted images. |
| `vite.config.js` | Development server, relative build URLs, and output directory. |
| `tests/` | Content integrity and browser interaction checks. |

## Content Contract

The build root is this repository; the source root is `content/` inside it. The course-to-topic map in `content/Topic-Review/README.md` supplies lesson tags. Course files and numbered topic reviews are discovered automatically. Other practice documents are listed explicitly in the build script.

Course titles come from Markdown headings. The short English topic labels and descriptions are presentation metadata. New lessons do not need hardcoded titles. A missing map entry produces a warning and an **Uncategorised** label without hiding the lesson.

The grammar list uses its document's numbered level-two headings. Cue cards are discovered from `content/Practice/IELTS-Speaking/Cue-Cards/Cue-Card-NN-*.md` and open separate pages such as `#/read/cue-card-01`. Each page uses the same reader as a lesson and opens its learning sections by default. The shared guide, grammar review and answer-template summary are separate documents. The template summary is a cue reference, not an additional numbered topic. The filename number supplies the document ID, list badge and sort order directly. The builder rejects duplicate numbers and disagreement between filename and Markdown title. The generated combined reader uses descending filename numbers. No separate ordering map or display-number calculation is maintained. A combined reader is generated in memory from these sources with section routes such as `#/read/cue-cards?section=…`; there is no second editable combined Markdown. Introductory notes, exercises, and qualifications are retained.

Language Bites come from `content/Language-Bites/notes.json`; see [their maintenance guide](../content/Language-Bites/README.md). The builder validates IDs, categories, required learning fields, and example pairs. Routes use `#/bites?category=Grammar&q=worth&sort=desc` for collections and `#/bite/G01` for the complete note. Legacy `?step=4` links scroll to the practice section without hiding the other content. Keep IDs stable and append new notes to the source list. All English educational fields are retained; bilingual image exports are not a runtime dependency.

Linking words uses the existing `content/Practice/Linking-Words-Read-Aloud-Practice.md`. The first 12 numbered headings provide category cards, and their level-three headings supply searchable phrases. The introductory patterns, reading passages and recall exercises remain in the reader. No duplicate Markdown is maintained.

`web/public/content/` and `web/public/lesson-assets/` are generated. The production build is `web/dist/`. All three are ignored by Git. Changing Markdown requires rebuilding the content and refreshing the development page; `npm run dev` and `npm run build` generate it automatically on startup.

Document JSON is replaced atomically, with the catalogue written after documents and assets. A rebuild does not empty the content directory while the preview is serving it. Readers resolve URLs against the site base, revalidate requests, and show a recoverable error if a document response is missing or invalid.

## UI Behaviour

- Collection navigation order is All courses, Cue cards, My topic collections, Personal grammar, Linking words, Language Bites, then Reference shelf.
- At widths up to 800px, a labelled Collections button and fixed bottom navigation expose Courses, Cue cards and All collections. The wider drawer shows all seven sections with counts, an explicit close button, keyboard focus containment and focus restoration. Short screens can scroll the drawer. Bottom padding and scroll padding include the device safe area so navigation does not cover the final reading controls. Mobile collection access remains available in focus mode; desktop navigation stays in the sidebar.
- Courses default to descending lesson number; cue cards default to descending filename number; Language Bites default to reverse source order. All support `sort=asc` and `sort=desc` in the URL. Categories retain their teaching order.
- Cue-card filenames, Markdown title numbers, reader labels, document IDs and list badges agree. Newest-first shows 22 to 01; oldest-first shows 01 to 22. Filtering preserves these file numbers. If explicitly renumbering files, update titles, the folder index and all affected links together.
- Topic cards use a stretched native link, with the related-lessons link above it. Background clicks, keyboard activation, and modified clicks keep native link behaviour.
- At widths up to 800px, article and Language Bite readers show a single collapsed Reading tools row before the content. It contains the existing audio/lookup panel, contents, display controls, tags and overview notes where available. Top Previous / Next controls are hidden on phones; full navigation remains at the end. Contents links close the tools before jumping into the article. The same control nodes move back to their original positions on wider screens, preserving speech and selections.
- Reader typography preserves distinct Markdown heading levels: larger section titles on a pale green background, smaller underlined subheadings, and bold fourth-level headings. Paragraph and section spacing stays more generous than the compact collection lists. Heading sizes scale with the reader's text-size preference, including on mobile.
- The default course view is a compact list. List/card view, reading size, and focus preference use best-effort local storage; the site still works when storage is unavailable.
- Previous / Next controls appear above and below readers on desktop and at the end on phones, outside Markdown. Lists and navigation share the same selectors. Matching collection filters and ordering carry across pages and reloads; direct links use the document's collection. Stale filters that exclude the current item fall back to the full collection. Controls never wrap at boundaries. Grammar, linking words and the legacy combined cue reader navigate sections; the guide, shared grammar review and answer-template summary navigate between their three documents.
- Course and collection filters live in the URL, so returning from a document restores them.
- Ordinary internal links are handled within the page using History API navigation; they do not rely on a native fragment event to render. Browser history, direct links, and modified clicks remain supported.
- Global search covers document titles, full text, named grammar/cue-card sections, and Language Bites. Course-list search uses full lesson text; category lists search their displayed category names.
- Native details elements fold sections. A deep link opens every enclosing section before scrolling to it.
- Native dialogs provide focus containment and Escape handling for search and large tables. Expanded tables are presentation copies; source Markdown remains unchanged.
- Keyboard shortcuts: **⌘K / Ctrl+K** opens global search. **/** focuses list search or opens global search while reading. Arrow keys and Enter navigate global results.
- Reading progress and the active contents entry follow the current visible document layout. Focus mode hides the side navigation and contents panel while retaining an exit control.

## Reading Tools

The collapsed Listen & look up panel is mounted after an article or Language Bite renders and disposed before navigation. Read article includes the main content across folded sections and excludes overview/source notes and generated controls. Speech is queued in short chunks and opens the section being read. Read selection uses only the selected article text. Voice options come from the device, including delayed voice loading. Automatic English explicitly prefers voices marked as on-device. Recoverable engine errors try another English voice on the same passage, retain the working voice for subsequent passages, and stop with device setup advice if all candidates fail. Voice selection survives reordering of the device voice list; failed voices are remembered only for the open page. Navigation and page exit cancel speech; unavailable speech leaves lookup usable. Device speech may require network access depending on the voice. Playback errors reveal an English troubleshooting list covering Chrome, manual on-device voice selection, a short selected-sentence test and Android text-to-speech setup. The list stays hidden during normal playback and clears on retry or stop.

Lookup accepts up to 120 characters and constructs encoded Cambridge English–Chinese and Google Translate links. Results open externally; there is no embedded translation API, account, query history or saved vocabulary. Query text is sent to the chosen external service only when the user follows its link.

## Validation

```sh
npm test
npm run build
npm run test:browser
```

Run these sequentially because content generation writes the same output folder. Browser checks use Google Chrome on macOS if available, otherwise Playwright Chromium. Install it with `npx playwright install chromium` when needed. The test server uses port 5173.

Test desktop and mobile layouts, filters, document and section links, image loading, global search, keyboard navigation, collapsed content, table dialogs, and focus mode when changing those features. Validate the production build beneath a project subdirectory before changing deployment or asset paths. Keep screenshots and test artifacts out of Git.
