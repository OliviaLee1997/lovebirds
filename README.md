# English Library

A personal English-learning wiki with complete course notes, classified topic summaries, grammar corrections, and speaking examples. The interface is entirely in English, with a warm green theme and a compact reading layout.

**This folder is the repository root and the only actively maintained project.** The website does not read anything from the surrounding workspace.

[GitHub repository](https://github.com/OliviaLee1997/lovebirds) · [Website](https://olivialee1997.github.io/lovebirds/)

## Start Locally

Use Node.js 22 or newer. Run these commands from this directory:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**.

Keep the development-server terminal running while using the local site. The menu can remain visible in an already-open tab after the server stops, but opening a document still needs the server. Restart `npm run dev` and refresh the page if that happens. A deployed GitHub Pages site does not depend on this local server.

```sh
npm test
npm run build
npm run test:browser
npm run preview
```

The preview opens at **http://127.0.0.1:4173**. Run content-building commands sequentially. Browser tests use installed Google Chrome on macOS; otherwise run `npx playwright install chromium` first.

## Repository Layout

```text
content/
  Course-Notes/       One Markdown file per lesson; reviewed images in assets/
  Topic-Review/       Classified summaries and the course-to-topic map
  Practice/          Grammar review, cue cards, and additional practice
  Language-Bites/    Short learning notes in notes.json
  Resources/         Reviewed reference chart
web/
  src/               English interface, wiki interactions, and theme
  scripts/           Markdown catalogue and document generation
  public/            Favicon and ignored generated website content
  tests/             Content checks and browser interaction tests
docs/
  WRITING.md         Writing, privacy, and lesson-maintenance requirements
.github/workflows/   GitHub Pages build and deployment
```

The collection currently contains **19 lessons, 9 topic collections, 13 grammar categories, 22 cue-card topics, 12 linking-word categories, 3 IELTS reference documents, and 80 Language Bites**. Counts are generated from the content; these are not fixed limits.

## Read and Explore

- **Courses:** Compact list, newest lessons first. Switch to cards, filter by multiple topics, search full text, or select Oldest first.
- **Topic collections:** Click anywhere on a card to read its summary. The related-lessons link opens the filtered course list separately.
- **Language Bites:** Browse 80 short notes across Grammar, Vocabulary, Pronunciation, and Speaking, with newly added notes first. Read Notice → Understand → Examples → Practise on one continuous page. Answers are visible by default and can be folded for self-testing. Copy the complete note when needed.
- **Linking words:** A dedicated collection before Language Bites, organised into 12 purposes such as contrast, addition and reason. Search by category or phrase, then open its examples directly. Shared passages and recall practice remain available.
- **Cue cards:** Each of the 22 topics has its own Markdown file and reader page with the same prompt, model-answer, linking-language, grammar, and exam-practice sections. The shared guide and grammar exercises remain available; the full collection is generated automatically for existing links.
- **Grammar:** Open the relevant category directly. The selected section expands while the remaining categories stay available.
- **Wiki reader:** Fold individual sections, expand or collapse all sections, follow the sticky contents list, or switch to focus mode.
- **Tables:** Open a larger table view without losing your reading position. Close it with Escape.
- **Search:** Use the search button or **⌘K / Ctrl+K** to search across the wiki. Use **/** for the current list search, or global search while reading. Arrow keys and Enter navigate search results.
- **Links and preferences:** Copy page or section links. Text size, list/card layout, and focus preference are saved in the current browser. No account or cloud sync is required.

Courses and cue cards default to descending lesson/topic number. Language Bites default to reverse source order; append new notes to the JSON list. Each offers a Newest first / Oldest first control that is retained in the URL. Topic, grammar and linking-word categories retain their teaching order rather than implying a date.

## Maintain the Content

1. Add the lesson to [content/Course-Notes](content/Course-Notes/README.md), following [the writing requirements](docs/WRITING.md).
2. Update the course index and [course-to-topic map](content/Topic-Review/README.md). The map supplies the website tags.
3. Review the relevant topic summaries, [personal grammar review](content/Practice/Personal-Grammar-Error-Review.md), and [cue-card collection](content/Practice/IELTS-Speaking/Cue-Cards/README.md). Merge repeated material instead of duplicating it.
4. Run `npm test`, then `npm run build`. Check the affected pages. During development, restart the server or run `npm run content` and refresh after editing Markdown.

The build reads **only `content/` inside this repository**. Do not edit generated files in `web/public/content/`, `web/public/lesson-assets/`, or `web/dist/`. Keep interface text in English and preserve the current theme. See [frontend maintenance notes](web/README.md) for implementation details.

Maintain short notes in [content/Language-Bites/notes.json](content/Language-Bites/notes.json), following [the Language Bites guide](content/Language-Bites/README.md). Keep IDs stable so saved links continue to work. Rebuild after editing this file, just as for Markdown.

## Publish to GitHub Pages

Push reviewed changes from this folder to the `main` branch of `OliviaLee1997/lovebirds`. In GitHub, choose **Settings → Pages → Build and deployment → Source: GitHub Actions**. The public site address is **https://olivialee1997.github.io/lovebirds/**.

The included workflow tests the content, builds the site, and publishes only `web/dist/`. It runs on pushes to `main` and also supports manual runs. Relative asset paths and hash routes work under a repository subdirectory.

No credentials belong in this folder. `node_modules/`, build outputs, test artifacts, and local environment files are excluded by `.gitignore`.

## Included Materials

The repository contains the edited Markdown used by the site, 80 English short notes, five reviewed lesson images, and a linking-words reference chart. Original videos, private transcripts, unrelated PDFs, archived render inputs, legacy pronunciation HTML, and bilingual card exports remain outside this folder. Existing images are copied unchanged; new assets must be reviewed for identifying information before inclusion. Adding an image also requires updating the asset allowlist in `web/scripts/build-content.mjs`.

Source statements, grammar uncertainties, privacy notes, and exercise answers remain available in the reader. Folding a section changes its presentation, not its content. This is a public static website when deployed; it has no login gate.
