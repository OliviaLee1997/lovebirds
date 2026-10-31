# Language Bites

Short English learning notes with examples and recall practice. These are edited study materials, not a record of mistakes the learner necessarily made.

| Category | Current notes | Stable ID prefix |
| --- | ---: | --- |
| Grammar | 24 | G |
| Vocabulary | 20 | V |
| Pronunciation | 20 | P |
| Speaking | 16 | S |

## Maintain the Notes

Edit [notes.json](notes.json). The website builds its cards, search results, and continuous reader from this file. Do not maintain a second copy in Markdown or edit generated website JSON. Append new notes to the end of the list; the default website order shows the newest additions first.

- Keep each `id` unique and stable, such as `G01`. Add new IDs without renumbering existing notes.
- Use one of the four categories above. Write every learning field in English.
- `title` and `prompt` introduce the language question; newlines in `prompt` are supported.
- `explanation` states the rule. `qualification` preserves exceptions, context, and acceptable alternatives.
- `examples` contains pairs of sentence and explanation. Include at least one complete pair.
- `practice` and `answer` must agree. The answer is visible by default and can be folded for self-testing.
- Keep the collection's `notice` accurate and preserve the distinction between added study material and reported errors.
- The retained `accent` and `tint` fields are optional design metadata. The site uses its own category palette.

The reader presents **Notice → Understand → Examples → Practise** together on one page. Scroll to read all sections without changing tabs. Older links to a numbered step scroll to the corresponding section. Search includes explanations, examples, practice prompts, and answers; category, search and sort settings survive a return from a note.

Run `npm test`, then `npm run build` from the repository root. Check the edited note and its answer in the preview. Update counts in this index and the repository README when adding or removing entries.
