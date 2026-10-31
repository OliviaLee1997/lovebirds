# Repository Maintenance

- This directory is the canonical, standalone project. Work only inside it for website and course maintenance unless the user explicitly asks to change legacy files in the parent workspace.
- Read [README.md](README.md) and [docs/WRITING.md](docs/WRITING.md) before updating content or the site.
- Keep the entire website interface in English: navigation, tags, tooltips, controls, search, empty states, accessibility labels, and error messages. Preserve original-language examples when they are part of an English teaching explanation.
- Preserve the warm green theme and compact wiki style. Prefer progressive disclosure, readable tables, and compact lists over large decorative panels.
- Keep one English Markdown file per lesson in `content/Course-Notes/`. Preserve original source files unless the user authorises edits.
- Keep navigation in folder-level README files. Website-generated contents panels are allowed; do not insert navigation blocks into lesson or combined Markdown notes.
- Keep private identifiers and sensitive personal details out of documents, examples, asset names, and publication output. Preserve the distinction between reported wording and added or anonymised study material.
- After adding a lesson, review the course index, topic map, related summaries, grammar review, cue-card collection, and stated counts. Follow the detailed workflow in `docs/WRITING.md`.
- Keep one Markdown file per cue-card topic in `content/Practice/IELTS-Speaking/Cue-Cards/`, using the common prompt, model answer, linking language, grammar review, and exam version structure. Cue-card filenames, Markdown title numbers, website labels and document IDs must agree; sort using the filename number directly. The combined reader is generated; do not recreate a second editable combined Markdown.
- Do not reintroduce dependencies on files outside this repository, absolute user paths, symlinks to the parent workspace, or a second editable copy of the content.
- Build generated content from `content/`; do not manually edit generated JSON, copied image output, or `web/dist/`.
- Run content checks and builds sequentially. Test changed UI behaviour in the browser, including mobile and GitHub Pages subdirectory routes when affected.
