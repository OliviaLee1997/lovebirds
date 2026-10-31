# Writing and Maintenance Requirements

These requirements apply to the standalone repository. Edit study documents under `content/` and website code under `web/`. The repository [README](../README.md) explains how to run and publish the site.

## Document Writing Requirements

- **Language:** Write edited lesson notes, topic reviews, model answers, and exercises in English. Explain difficult points in clear, natural language.
- **One lesson, one file:** Save each lesson as `content/Course-Notes/Lesson-NN-Short-Topic.md`. Use `Lesson`, a two-digit lesson number, and a concise English topic with hyphens between words. Follow the established sequence; do not silently renumber earlier lessons when a source title differs.
- **Start with the content:** Begin lesson and combined notes with the title and relevant learning content. Do not add a table of contents, course-index links, previous/next links, or other navigation blocks. Keep navigation in folder-level README files.
- **Organise for learning:** Combine repeated explanations, group related points, and explain the meaning and use of a pattern before adding exceptions. Use tables for corrections and comparisons, and short paragraphs for explanations.
- **Highlight selectively:** Bold key phrases, corrected forms, and useful linking language. Keep most of the prose unbolded so the emphasis remains useful.
- **Separate evidence from additions:** Distinguish reported class content, edited examples, newly written model answers, and added exercises. A summary or transcript fragment is not automatically a verified quotation.
- **Handle uncertainty explicitly:** Mark unclear wording, uncertain speaker attribution, and context-dependent corrections. Do not fill missing facts with invented personal details. Label a fictional replacement as a practice scenario.
- **Preserve sources:** Keep supplied originals unchanged unless the user asks to edit them. Organise or redact edited study copies separately. Previously redacted text should remain redacted in later revisions.
- **Use stable links:** Use relative Markdown links and descriptive labels. Keep lesson images in `content/Course-Notes/assets/`, using neutral filenames that will not overwrite existing assets. Link to public references when factual clarification is needed, and preserve qualifications such as the date of a statistic.

### Privacy Requirements

Apply these checks to new text and to any copies added to reviews or practice documents.

- Remove teacher and learner identifiers, contact details, account handles, exact birthdays, addresses, precise schedules, and identifying workplace or institution details. Generalise sensitive health information and private family or relationship stories.
- Check combinations of details: an award, institution, year, and location may identify someone even when their name is absent. Use only the detail needed to teach the language point.
- Use neutral roles such as **the learner**, **the instructor**, or **a friend**, and placeholders such as **[date]**, **[place]**, and **[time]** when appropriate. Do not put private identifiers in filenames, headings, image descriptions, link labels, or link destinations.
- Preserve the grammar being taught when anonymising an example. Check the correction, explanation, exercise, and answer key together so they still agree.
- Label altered quotations and personal stories as anonymised study material. Do not describe rewritten wording as a verbatim original. Do not copy identifying originals into examples of what was removed.
- A Markdown privacy review does not establish that linked images, PDFs, HTML pages, recordings, or transcripts are also redacted. Check those assets separately before including them in a shared collection.

For a document containing anonymised stories or altered quotations, use a short note such as:

> **Privacy note:** Personal and third-party details have been removed or generalised. Altered quotations and first-person stories are anonymised study examples, not verbatim transcripts or biographical records.

### Grammar Reviews

Use **reported or anonymised wording → correction → explanation**. Explain the intended time or meaning when a correction depends on context.

Separate clear grammar errors from vocabulary choices, pronunciation points, stylistic improvements, and uncertain transcriptions. A teacher's example, a hesitation, or an acceptable alternative is not automatically a learner error. Without sufficient audio evidence, do not claim that a transcript proves a pronunciation mistake.

In the combined grammar review, group examples by grammatical structure and merge repetitions. Add a new category only when the existing categories cannot explain the issue clearly. Do not invent error frequencies or claim an issue is recurring on the basis of one uncertain example. Added exercises must have matching answers and must not be presented as mistakes the learner actually made.

### Cue Cards and Model Answers

Keep one Markdown file per topic in the [Cue Card Collection](../content/Practice/IELTS-Speaking/Cue-Cards/README.md), named `Cue-Card-NN-Short-Topic.md`. Keep numbers stable and use the same section structure across topics. Do not identify which lesson supplied a topic or example. Merge overlapping topics when they serve the same speaking task. Shared timing guidance belongs in `Guide.md`; cross-topic grammar exercises belong in `Grammar-Review.md`. The build generates the combined reader for existing links; do not maintain a second combined Markdown file.

Each topic should include:

1. A clear practice cue card.
2. An extended answer for **3–5 minutes of practice**, with coherent development and natural spoken English aimed at **IELTS Bands 7–9**. These are study models, not examiner-scored answers or score guarantees. The current approximate range of **420–470 words** is a starting point; timing depends on speaking pace.
3. **Bold linking words and useful organising phrases**, followed by a brief explanation of their functions. Avoid inserting connectors simply to make the answer appear advanced.
4. Relevant grammar corrections supported by the notes, with uncertainty and anonymisation made clear. If no personal error is supported, label any supplied examples as added practice.
5. Advice for shortening the answer to **1–2 minutes** for an IELTS Part 2 simulation, which allows one minute of preparation.

Use these level-two headings: **Practice Cue Card**, **Extended Model Answer**, **Linking Language**, **Your Grammar Review** (retain any necessary qualification in the heading or text), and **Shorten for the Exam**. Start with the topic title and a short study note; keep navigation in the folder README.

## Workflow After Adding a Lesson

### 1. Review the Supplied Material

Confirm the lesson number against the existing files. Identify the main learning points, speaking topics, reported errors, and supporting assets. Resolve duplicate summaries and note any uncertainty. Remove or generalise private details before carrying material into edited notes or combined reviews.

### 2. Write the Lesson Note

Create the next `Lesson-NN-Short-Topic.md` in `content/Course-Notes/`. Include the sections that the material supports: useful language, grammar explanations, speaking examples, an error review, and relevant practice with answers. Omit empty or irrelevant sections. Keep one file for the lesson rather than creating parallel final versions.

### 3. Review and Update the Related Documents

Check every destination below. Update its content only when the new lesson contributes something relevant; a checked document may legitimately need no content change.

| Destination | Required review and update |
| --- | --- |
| [Course index](../content/Course-Notes/README.md) | **Every lesson:** Add the lesson number, title, relative link, and a concise description of its main focus. |
| [Topic index and course map](../content/Topic-Review/README.md) | **Every lesson:** Add the lesson to the course-to-topic map with the relevant review categories. Reflect actual coverage in the scope statement. |
| Relevant documents in `content/Topic-Review/` | Consolidate new points into the appropriate existing sections. Improve an existing explanation when the same rule recurs; avoid appending a duplicate lesson summary. Update course-basis labels and coverage references where relevant. |
| [Personal Grammar Error Review](../content/Practice/Personal-Grammar-Error-Review.md) | Review supported learner errors across the whole lesson, including ordinary conversation. Add or merge examples under the right categories, retain uncertainty, and update exercises or priorities when the evidence warrants it. |
| [Course Cue Card Review](../content/Practice/IELTS-Speaking/Cue-Cards/README.md) | Add a genuinely new speaking topic or enrich an existing one. Keep the extended answer, linking-language explanation, grammar review, and shortened-exam guidance consistent. Do not add lesson-source labels. |
| [Linking-word practice](../content/Practice/Linking-Words-Read-Aloud-Practice.md) and IELTS Part 1–3 templates | Update when there is a reusable expression, useful distinction, or new question pattern. A new lesson does not automatically require edits to every template. |
| [Practice index](../content/Practice/README.md), [course index](../content/Course-Notes/README.md), [topic index](../content/Topic-Review/README.md), and this README | Update links, descriptions, lesson ranges, topic counts, category counts, and exercise totals wherever the actual coverage has changed. |
| [Language Bites](../content/Language-Bites/README.md) | Add or refine a short note when a reusable distinction benefits from examples and recall practice. Preserve stable IDs, qualifications, and matching answers. Do not label added examples as personal errors. |
| Optional pronunciation HTML or other new outputs | These legacy materials are outside this repository and require no update here. If deliberately introduced later, review their privacy, stated scope, and independent build requirements first. |

The current **19 lessons**, **22 cue-card topics**, **13 grammar categories**, and **36 grammar-review questions** describe the existing collection; they are not fixed targets. Recalculate affected totals after an addition. Do not globally replace every occurrence of an old lesson number: some references describe a deliberately limited scope.

### 4. Check the Result

Keep all website labels, navigation, placeholders, and error messages in English. Preserve the warm green theme and compact wiki layout.

For frontend updates, follow [the website checks](../web/README.md). After adding or editing course content, run `npm test` and `npm run build` sequentially to check the generated catalogue and rebuild the site. Review the new lesson and its tags in the local preview.

- [ ] The lesson number, filename, and title agree, and there is only one final Markdown file for the lesson.
- [ ] The lesson and combined notes are in English, begin with content, and have no navigation blocks.
- [ ] Private details have been removed from the lesson and every updated review, example, filename, and link.
- [ ] Reported content, anonymised wording, added study material, and uncertain evidence are distinguishable.
- [ ] Corrections preserve the intended meaning; acceptable alternatives are not mislabelled as errors.
- [ ] Review questions and answer keys match, including after anonymisation or renumbering.
- [ ] Cue-card answers have consistent linking-language explanations and retain the distinction between extended practice and exam timing.
- [ ] The course index and topic map include the new lesson; applicable reviews and scope statements are current.
- [ ] Links, anchors, images, Markdown tables, numbering, and stated totals are correct. Unrelated files and original source assets are preserved.

### 5. Report What Changed

Give a brief completion note listing the new lesson and the related reviews updated. Mention any unresolved source uncertainty or intentionally limited coverage that affects the result. Adding the lesson file alone does not complete the workflow: the related documents and indexes must also have been reviewed.

## Suggested Lesson Structure

Adapt this structure to the lesson rather than filling every heading mechanically. Replace placeholders and omit sections that are not needed. Add the privacy note above when personal examples have been anonymised.

```markdown
# Lesson NN — Topic

**Focus:** [Main communication and language goals.]

**Source note:** [Available material and any uncertainty; distinguish reported content from added practice.]

## 1. Useful Language

[Key expressions, their meanings, and natural examples.]

## 2. Grammar and Usage

[Patterns, explanations, and relevant contrasts.]

## 3. Speaking Practice

[Prompt and clearly labelled model answer, when relevant.]

## 4. Grammar and Expression Review

| Reported or anonymised wording | Correction or alternative | Explanation |
| --- | --- | --- |
| [Example supported by the notes.] | [Revised wording.] | [Rule, intended meaning, and any uncertainty.] |

## 5. Review Exercises — Added Study Material

[Exercises that practise the lesson's useful patterns.]

### Answers

[Answers and relevant alternatives, matching the exercises.]
```

## Additional Materials

Keep original recordings, private transcripts, PDFs, and unrelated materials outside this repository. Add only the reviewed resources required by the website. Keep reusable practice in `content/Practice/` and add it to its index. Update the build script when introducing a new type of study resource.
