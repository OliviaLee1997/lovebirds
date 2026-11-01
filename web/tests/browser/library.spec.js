import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('browse every lesson, combine tags, search full text, and return with filters intact', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const catalog = await (await request.get('/content/catalog.json')).json();
  const lessons = catalog.documents.filter(d => d.kind === 'lesson');
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(lessons.length);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.course-grid')).toHaveClass(/is-list/);
  await page.screenshot({ path: testInfo.outputPath('courses-desktop.png') });
  await page.locator('.filter-panel > summary').click();
  await page.locator('[data-action="tag"][data-tag="01"]').click();
  await expect(page.locator('.course-card')).toHaveCount(lessons.filter(d => d.tags.includes('01')).length);
  await page.locator('[data-action="tag"][data-tag="02"]').click();
  await expect(page.locator('.course-card')).toHaveCount(lessons.filter(d => d.tags.includes('01') && d.tags.includes('02')).length);
  await page.locator('#match-mode').selectOption('any');
  await expect(page.locator('.course-card')).toHaveCount(lessons.filter(d => d.tags.includes('01') || d.tags.includes('02')).length);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.locator('#library-search').fill('out of paper');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await page.locator('.card-main').click();
  await expect(page.locator('.document')).toContainText('The printer');
  await expect(page.locator('.document img')).toHaveCount(5);
  for (const img of await page.locator('.document img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('reader-desktop.png') });
  await page.locator('.document h3').filter({ hasText: 'Practice Dialogues' }).evaluate(heading => heading.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('reader-heading-levels-desktop.png') });
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#library-search')).toHaveValue('out of paper');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await page.locator('#library-search').fill('zzzz-no-match-xyz');
  await expect(page.getByText('No matching notes')).toBeVisible();
  expect(errors).toEqual([]);
});

test('existing personal summaries, grammar groups, and all cue cards are readable and deep-linkable', async ({ page }) => {
  await page.goto('/#/topics');
  await expect(page.locator('.topic-card')).toHaveCount(9);
  await page.locator('.topic-card').first().click({ position: { x: 12, y: 12 } });
  await expect(page.locator('.document')).toContainText('Pronunciation');
  await page.goto('/#/grammar');
  await expect(page.locator('.group-card')).toHaveCount(13);
  await page.locator('.group-card').nth(5).click();
  await expect(page.locator('.document')).toBeVisible();
  const targetId = new URLSearchParams(page.url().split('?')[1]).get('section');
  expect(targetId).toContain('countable-nouns');
  await expect.poll(() => page.locator(`[id="${targetId}"]`).evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(105);
  await page.reload();
  await expect(page.locator('.document')).toBeVisible();
  await expect.poll(() => page.locator(`[id="${targetId}"]`).evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(105);
  await page.goto('/#/cue-cards');
  await expect(page.locator('.group-card')).toHaveCount(22);
  await page.locator('.group-card[href^="#/read/cue-card-01?"]').click();
  await expect(page.locator('.reader-heading h1')).toContainText('A Motorcycle Workshop');
  await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body')).toBeVisible();
  await page.goto('/#/resources');
  await expect(page.locator('.resource-card')).toHaveCount(3);
});

test('mobile navigation, reading tables, and search work without page-wide horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(19);
  await page.screenshot({ path: testInfo.outputPath('courses-mobile.png'), fullPage: false });
  await page.getByRole('button', { name: 'Open collections' }).click();
  await page.locator('.nav-link').filter({ hasText: 'My topic collections' }).click();
  await expect(page.locator('.topic-card')).toHaveCount(9);
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await page.goto('/#/read/lesson-02');
  await expect(page.locator('.document')).toContainText('The printer');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/read\/lesson-02/);
  await expect(page.locator('#main')).toBeFocused();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await expect(page.locator('.table-scroll').first()).toBeVisible();
  await page.locator('.document h3').filter({ hasText: 'Practice Dialogues' }).evaluate(heading => heading.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('reader-heading-levels-mobile.png') });
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await expect(page.locator('.document')).toHaveCSS('font-size', '18px');
});

test('a missing document shows a useful recovery route', async ({ page }) => {
  await page.goto('/#/read/not-a-document');
  await expect(page.getByText('Document not found')).toBeVisible();
  await page.getByRole('link', { name: 'Back to courses' }).click();
  await expect(page.locator('.course-card')).toHaveCount(19);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`every cue card opens its visible prompt and answer at ${viewport.width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const catalog = await (await request.get('/content/catalog.json')).json();
    const cards = catalog.documents.filter(doc => doc.kind === 'cue-card').sort((a, b) => b.number - a.number);
    for (const [index, card] of cards.entries()) {
      await page.goto('/#/cue-cards');
      await page.locator('.group-card').nth(index).click();
      await expect(page).toHaveURL(new RegExp(`#/read/${card.id}(?:\\?|$)`));
      await expect(page.locator('.reader-heading h1')).toHaveText(card.title);
      await expect(page.locator('.reader-heading .eyebrow')).toHaveText(`CUE CARD ${String(card.number).padStart(2, '0')}`);
      await expect(page.locator('.wiki-section[open]')).toHaveCount(5);
      await expect(page.locator('[data-wiki-section="practice-cue-card"] .section-body > p').first()).toBeVisible();
      await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body > p').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Linking Language', exact: true })).toBeVisible();
      if (index === 0 || index === cards.length - 1) {
        await page.screenshot({ path: testInfo.outputPath(`cue-card-${index + 1}.png`) });
        await page.reload();
        await expect(page.locator('[data-wiki-section="practice-cue-card"] .section-body > p').first()).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });
}

test('all lessons open from course cards and every library document loads visible content', async ({ page, request }) => {
  const catalog = await (await request.get('/content/catalog.json')).json();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const doc of catalog.documents.filter(doc => doc.kind === 'lesson')) {
    await page.goto('/#/courses');
    await page.locator(`.card-main[href^="#/read/${doc.id}?"]`).click();
    await expect(page.locator('.reader-heading h1')).toHaveText(doc.title);
    await expect(page.locator('.wiki-section[open] .section-body').first()).toBeVisible();
    await expect(page.locator('.error-state')).toHaveCount(0);
  }
  for (const doc of catalog.documents.filter(doc => doc.kind !== 'lesson' && doc.kind !== 'cue-card')) {
    await page.goto(`/#/read/${doc.id}`);
    await expect(page.locator('.reader-heading h1')).toHaveText(doc.title);
    await expect(page.locator('.document')).toBeVisible();
    if (doc.sections) await expect(page.locator('.wiki-section[open] .section-body').first()).toBeVisible();
    else await expect(page.locator('.document > p').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('internal clicks render directly, retain history, and legacy cue-card links still work', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(19);
  // Model a preview host that suppresses native fragment events.
  await page.evaluate(() => {
    window.suppressFragmentEvent = event => event.stopImmediatePropagation();
    window.addEventListener('hashchange', window.suppressFragmentEvent, true);
  });
  await page.locator('.card-main').first().click();
  await expect(page.locator('.document')).toBeVisible();
  await page.locator('.nav-link[href="#/cue-cards"]').click();
  await page.locator('.group-card').first().click();
  await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body')).toBeVisible();
  await page.evaluate(() => window.removeEventListener('hashchange', window.suppressFragmentEvent, true));
  await page.goBack();
  await expect(page.locator('.group-card')).toHaveCount(22);
  await page.goForward();
  await expect(page).toHaveURL(/#\/read\/cue-card-22/);
  await expect(page.locator('.document')).toBeVisible();
  const catalog = await (await request.get('/content/catalog.json')).json();
  const group = catalog.documents.find(doc => doc.id === 'cue-cards').groups.at(-1);
  await page.goto(`/#/read/cue-cards?section=${encodeURIComponent(group.id)}`);
  await expect(page.locator(`[data-wiki-section="${group.id}"] .section-body > p`).first()).toBeVisible();
});

test('unavailable document responses show a working retry instead of an empty reader', async ({ page }) => {
  let unavailable = true;
  await page.route('**/content/lesson-01.json', route => unavailable
    ? route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Unavailable</html>' })
    : route.continue());
  await page.goto('/');
  await page.locator('.card-main[href^="#/read/lesson-01?"]').click();
  await expect(page.getByRole('heading', { name: 'Unable to open these notes' })).toBeVisible();
  await expect(page.locator('.error-state')).toContainText('Refresh the library');
  unavailable = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.document')).toBeVisible();
});

test('the production build works beneath a GitHub Pages project directory', async ({ page }) => {
  const dist = new URL('../../dist/', import.meta.url);
  const failedRequests = [];
  page.on('response', response => { if (response.status() >= 400) failedRequests.push(response.url()); });
  await page.route('**/english-library/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = pathname.replace(/^\/english-library\//, '') || 'index.html';
    const file = new URL(relative, dist);
    if (!file.href.startsWith(dist.href)) return route.fulfill({ status: 404 });
    const contentType = ({ js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' })[relative.split('.').at(-1)] || 'application/octet-stream';
    try { await route.fulfill({ body: await fs.readFile(file), contentType }); }
    catch { await route.fulfill({ status: 404 }); }
  });
  await page.goto('/english-library/#/courses?tags=01');
  await expect(page.locator('.course-card')).toHaveCount(9);
  await page.locator('.card-main[href^="#/read/lesson-02?"]').click();
  await expect(page.locator('.document')).toContainText('The printer');
  const firstImage = page.locator('.document img').first();
  await firstImage.scrollIntoViewIfNeeded();
  await expect.poll(() => firstImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.goto('/english-library/#/cue-cards');
  await page.getByRole('link', { name: 'Answer templates', exact: true }).click();
  await expect(page.locator('.reader-heading')).toContainText('All 22 Topics');
  await page.locator('.reading-tools > summary').click();
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await page.getByLabel('English word or phrase').fill('steady progress');
  await page.getByRole('button', { name: 'Find meaning', exact: true }).click();
  await expect(page.getByRole('link', { name: 'English–Chinese dictionary' })).toHaveAttribute('href', /steady%20progress/);
  await page.keyboard.press('Escape');
  await page.locator('.reader-toolbar .back-link').click();
  await page.locator('.group-card').first().click();
  await expect(page).toHaveURL(/english-library\/#\/read\/cue-card-22/);
  await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body')).toBeVisible();
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page).toHaveURL(/english-library\/#\/read\/cue-card-21/);
  await page.reload();
  await expect(page.locator('[data-wiki-section="practice-cue-card"] .section-body')).toBeVisible();
  await page.goto('/english-library/#/bites');
  await expect(page.locator('.bite-card')).toHaveCount(80);
  await page.locator('.bite-card').first().click();
  await expect(page.locator('.bite-panel')).toHaveCount(4);
  await expect(page.locator('.bite-answer p')).toBeVisible();
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page).toHaveURL(/english-library\/#\/bite\/S15/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'All collections', exact: true }).click();
  await page.locator('.nav-link[href="#/linking-words"]').click();
  await expect(page).toHaveURL(/english-library\/#\/linking-words/);
  await expect(page.locator('.group-card')).toHaveCount(12);
  expect(failedRequests).toEqual([]);
});

test('phone collections stay discoverable and all seven destinations open from the drawer', async ({ page }, testInfo) => {
  const collections = [
    ['courses', 'Course library'], ['cue-cards', 'Cue card collection'], ['topics', 'My topic collections'],
    ['grammar', 'Personal grammar review'], ['linking-words', 'Linking words'], ['bites', 'Language Bites'], ['resources', 'Reference shelf'],
  ];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('/#/courses');
    const nav = page.getByRole('navigation', { name: 'Mobile collections' });
    await expect(page.getByRole('button', { name: 'Open collections' })).toBeInViewport();
    await expect(nav).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`collections-phone-${width}.png`) });
    for (const [id, title] of collections) {
      await nav.getByRole('button', { name: 'All collections', exact: true }).click();
      await expect(page.locator('.workspace')).toHaveJSProperty('inert', true);
      await expect(page.locator('.sidebar .nav-link')).toHaveCount(7);
      for (const link of await page.locator('.sidebar .nav-link').all()) await expect(link).toBeInViewport();
      if (id === 'courses') await page.screenshot({ path: testInfo.outputPath(`collections-drawer-${width}.png`) });
      await page.locator(`.sidebar .nav-link[href="#/${id}"]`).click();
      await expect(page.locator('.collection-header h1')).toHaveText(title);
      await expect(page.locator('body')).not.toHaveClass(/menu-open/);
      await expect(page.locator('.workspace')).toHaveJSProperty('inert', false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    await expect(nav.getByRole('button', { name: 'All collections', exact: true })).toHaveClass(/active/);
    await nav.getByRole('link', { name: 'Cue cards', exact: true }).click();
    await expect(nav.getByRole('link', { name: 'Cue cards', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.locator('.group-card').first().click();
    await page.locator('.reader-end').scrollIntoViewIfNeeded();
    await expect(nav).toBeInViewport();
    const next = page.locator('.reading-pagination:not(.compact) a[rel="next"]');
    await next.scrollIntoViewIfNeeded();
    expect(await next.evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(await nav.evaluate(el => el.getBoundingClientRect().top));
    await nav.getByRole('button', { name: 'All collections', exact: true }).click();
    await page.getByRole('button', { name: 'Close collections', exact: true }).click();
    await expect(nav.getByRole('button', { name: 'All collections', exact: true })).toBeFocused();
  }
});

test('mobile collections support keyboard dismissal, focus mode and short or resized screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/read/lesson-19');
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  const opener = page.getByRole('button', { name: 'Open collections' });
  await opener.click();
  await expect(page.getByRole('button', { name: 'Close collections', exact: true })).toBeFocused();
  await page.locator('.sidebar .nav-link').last().focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.sidebar .brand')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.sidebar .nav-link').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).toHaveClass(/focus-reading/);
  await page.getByRole('button', { name: 'All collections', exact: true }).click();
  await page.locator('.menu-overlay').click({ position: { x: 380, y: 200 } });
  await expect(page.getByRole('button', { name: 'All collections', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 740, height: 360 });
  await page.getByRole('button', { name: 'All collections', exact: true }).click();
  await page.locator('.sidebar .nav-link[href="#/resources"]').click();
  await expect(page.locator('.resource-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'All collections', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(page.locator('.workspace')).toHaveJSProperty('inert', false);
  await expect(page.getByRole('navigation', { name: 'Mobile collections' })).not.toBeVisible();
  await expect(page.locator('.sidebar .nav-link[href="#/resources"]')).toBeInViewport();
});

test('cue-card filenames define chronological order and navigation', async ({ page }) => {
  const ids = () => page.locator('.group-card').evaluateAll(cards => cards.map(card => card.getAttribute('href').match(/cue-card-(\d+)/)[1]));
  await page.goto('/#/cue-cards');
  await expect(page.locator('.group-card')).toHaveCount(22);
  expect(await ids()).toEqual(Array.from({ length: 22 }, (_, i) => String(22 - i).padStart(2, '0')));
  await page.locator('.group-card').first().click();
  await expect(page.locator('.reading-pagination.compact .prev')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page).toHaveURL(/read\/cue-card-21/);
  await page.locator('.reading-pagination:not(.compact) a[rel="next"]').click();
  await expect(page).toHaveURL(/read\/cue-card-20/);
  await page.locator('.reader-toolbar .back-link').click();
  await page.locator('#sort').selectOption('asc');
  expect(await ids()).toEqual(Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, '0')));
  await page.locator('.group-card').first().click();
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page).toHaveURL(/read\/cue-card-02/);
  await page.reload();
  await expect(page.locator('.reading-pagination.compact a[rel="prev"]')).toHaveAttribute('href', /cue-card-01/);
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#sort')).toHaveValue('asc');
  await page.locator('#library-search').fill('wetland');
  await expect(page.locator('.group-card')).toHaveCount(2);
  await page.locator('.group-card').first().click();
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page).toHaveURL(/read\/cue-card-18/);
  await expect(page.locator('.reading-pagination.compact .next')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#library-search')).toHaveValue('wetland');
});

test('cue-card numbers stay attached to topics and reverse with the actual sort control', async ({ page }, testInfo) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/cue-cards');
    const cards = page.locator('.group-card');
    const numbers = page.locator('.group-number');
    await expect(numbers).toHaveText(Array.from({ length: 22 }, (_, i) => String(22 - i).padStart(2, '0')));
    await expect(cards.first()).toContainText('The Chengdu Panda Base');
    const snapshots = () => cards.evaluateAll(elements => elements.map(el => ({ number: el.querySelector('.group-number').textContent, title: el.querySelector('h3').textContent })));
    const descending = await snapshots();
    await page.screenshot({ path: testInfo.outputPath(`cue-cards-newest-${width}.png`) });
    await page.getByRole('combobox', { name: 'Sort Cue cards' }).selectOption({ label: 'Oldest first' });
    await expect(numbers).toHaveText(Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, '0')));
    await expect(cards.first()).toContainText('A Motorcycle Workshop');
    expect(await snapshots()).toEqual([...descending].reverse());
    await page.screenshot({ path: testInfo.outputPath(`cue-cards-oldest-${width}.png`) });
    await page.getByRole('combobox', { name: 'Sort Cue cards' }).selectOption({ label: 'Newest first' });
    expect(await snapshots()).toEqual(descending);
    await page.locator('#library-search').fill('wetland');
    await expect(numbers).toHaveText(['18', '14']);
    await page.getByRole('combobox', { name: 'Sort Cue cards' }).selectOption('asc');
    await expect(numbers).toHaveText(['14', '18']);
    await cards.first().click();
    await page.locator('.reading-pagination.compact a[rel="next"]').click();
    await expect(page).toHaveURL(/read\/cue-card-18/);
    await page.locator('.reader-toolbar .back-link').click();
    await expect(numbers).toHaveText(['14', '18']);
    await page.reload();
    await expect(numbers).toHaveText(['14', '18']);
  }
});

test('lesson navigation preserves filters and order through keyboard clicks, reload and browser history', async ({ page }) => {
  await page.goto('/#/courses?tags=01&sort=asc');
  await expect(page.locator('.course-card')).toHaveCount(9);
  const destinations = await page.locator('.card-main').evaluateAll(links => links.map(link => link.getAttribute('href')));
  await page.locator('.card-main').first().click();
  const next = page.locator('.reading-pagination.compact a[rel="next"]');
  await expect(next).toHaveAttribute('href', destinations[1]);
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(destinations[1].split('?')[0]));
  await page.reload();
  await expect(page.locator('.reading-pagination.compact a[rel="prev"]')).toHaveAttribute('href', destinations[0]);
  await page.locator('.reading-pagination:not(.compact) a[rel="next"]').click();
  await page.goBack();
  await expect(page.locator('.reading-pagination.compact a[rel="next"]')).toHaveAttribute('href', destinations[2]);
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#sort')).toHaveValue('asc');
  await expect(page.locator('.course-card')).toHaveCount(9);
  await page.goto('/#/courses?q=out+of+paper');
  await page.locator('.card-main').click();
  await expect(page.locator('.reading-pagination.compact a')).toHaveCount(0);
  await page.goto('/#/read/lesson-01');
  await expect(page.locator('.reading-pagination.compact .next')).toHaveAttribute('aria-disabled', 'true');
  await page.goto('/#/read/lesson-19?back=%2Fcourses%3Fq%3Dzzzz-no-such-note');
  await expect(page.locator('.reading-pagination.compact a[rel="next"]')).toHaveAttribute('href', /lesson-18/);
});

test('every reader family offers relevant neighbours and section navigation follows contents links', async ({ page, request }) => {
  for (const [id, nextId] of [['topic-01', 'topic-02'], ['ielts-part-1', 'ielts-part-2'], ['cue-card-guide', 'cue-card-grammar']]) {
    await page.goto(`/#/read/${id}`);
    await page.locator('.reading-pagination.compact a[rel="next"]').click();
    await expect(page).toHaveURL(new RegExp(`read/${nextId}`));
    await expect(page.locator('.document .reading-pagination')).toHaveCount(0);
  }
  const catalog = await (await request.get('/content/catalog.json')).json();
  for (const collection of ['grammar', 'linking-words']) {
    const groups = catalog.documents.find(d => d.id === collection).groups;
    await page.goto(`/#/${collection}`);
    await page.locator('.group-card').nth(2).click();
    await page.locator('.reading-pagination.compact a[rel="next"]').click();
    await expect(page.locator(`[data-wiki-section="${groups[3].id}"]`)).toHaveJSProperty('open', true);
    await page.locator(`.reader-index [data-section="${groups[4].id}"]`).click();
    await expect(page.locator('.reading-pagination.compact a[rel="next"]')).toHaveAttribute('href', new RegExp(groups[5].id));
    await page.locator('.reading-pagination:not(.compact) a[rel="next"]').click();
    await page.reload();
    await expect(page.locator(`[data-wiki-section="${groups[5].id}"]`)).toHaveJSProperty('open', true);
  }
  await page.goto('/#/linking-words?q=however');
  await page.locator('.group-card').click();
  await expect(page.locator('.reading-pagination.compact a')).toHaveCount(0);
  await page.goto('/#/read/cue-cards');
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page.locator('.wiki-section[open]')).toHaveCount(1);
});

test('mobile readers support continuous previous and next reading without overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/bites?category=Grammar&sort=asc');
  await page.locator('.bite-card').first().click();
  await page.locator('.reading-pagination.compact a[rel="next"]').click();
  await expect(page).toHaveURL(/bite\/G02/);
  await page.reload();
  await expect(page.locator('.reading-pagination.compact a[rel="prev"]')).toHaveAttribute('href', /bite\/G01/);
  await page.locator('.reading-pagination:not(.compact) a[rel="next"]').click();
  await expect(page).toHaveURL(/bite\/G03/);
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#sort')).toHaveValue('asc');
  await expect(page.locator('[data-category="Grammar"]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/read/cue-card-22');
  await expect(page.locator('.reading-pagination.compact')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('reader-navigation-mobile-top.png') });
  await page.locator('.reading-pagination:not(.compact)').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('reader-navigation-mobile-bottom.png') });
  await page.locator('.reading-pagination:not(.compact) a[rel="next"]').click();
  await expect(page).toHaveURL(/read\/cue-card-21/);
});

test('wiki preferences, section links, focus mode, and expanded tables work together', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Card view', exact: true }).click();
  await expect(page.locator('.course-grid')).not.toHaveClass(/is-list/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Card view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.keyboard.press('/');
  await expect(page.locator('#library-search')).toBeFocused();
  await expect(page.locator('#search-dialog')).not.toBeVisible();
  await page.goto('/#/read/lesson-02');
  const sections = page.locator('.wiki-section');
  await expect(sections.first()).toHaveJSProperty('open', true);
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await expect(page.locator('.wiki-section[open]')).toHaveCount(0);
  const tocLink = page.locator('.reader-index [data-section]').nth(1);
  const target = await tocLink.getAttribute('data-section');
  await tocLink.click();
  await expect(page.locator(`[data-wiki-section="${target}"]`)).toHaveJSProperty('open', true);
  await page.locator(`[data-wiki-section="${target}"] .section-link`).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(`section=${target}`);
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(page.locator('.wiki-section[open]')).toHaveCount(await sections.count());
  const table = page.locator('.document table').first();
  const tableText = await table.innerText();
  await page.getByRole('button', { name: 'Expand table 1', exact: true }).click();
  await expect(page.locator('#table-dialog')).toBeVisible();
  expect(await page.locator('#table-dialog table').innerText()).toBe(tableText);
  await page.keyboard.press('Escape');
  await expect(page.locator('#table-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('.reader-aside')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Exit focus', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
});

test('Language Bites show the complete note and preserve filters, sorting and copied content', async ({ page, request, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const catalog = await (await request.get('/content/catalog.json')).json();
  await page.goto('/#/bites');
  await expect(page.locator('.bite-card')).toHaveCount(80);
  await expect(page.locator('.bite-card').first()).toContainText(catalog.bites.at(-1).title);
  await page.screenshot({ path: testInfo.outputPath('bites-desktop.png') });
  await page.locator('#sort').selectOption('asc');
  for (const [category, count] of [['Grammar', 24], ['Vocabulary', 20], ['Pronunciation', 20], ['Speaking', 16]]) {
    await page.locator(`[data-category="${category}"]`).click();
    await expect(page.locator('.bite-card')).toHaveCount(count);
    await expect(page.locator('#sort')).toHaveValue('asc');
  }
  await page.locator('[data-category="Grammar"]').click();
  await page.locator('#library-search').fill('worth');
  await expect(page.locator('.bite-card')).toHaveCount(1);
  await page.locator('.bite-card').click();
  const note = catalog.bites.find(note => note.id === 'G01');
  await expect(page.locator('.bite-panel')).toHaveCount(4);
  await expect(page.getByRole('tab')).toHaveCount(0);
  for (const panel of await page.locator('.bite-panel').all()) await expect(panel).toBeVisible();
  await expect(page.locator('#bite-notice')).toContainText('worth visiting?');
  await expect(page.locator('#bite-understand')).toContainText(note.explanation);
  await expect(page.locator('#bite-understand')).toContainText(note.qualification);
  for (const [sentence, meaning] of note.examples) {
    await expect(page.locator('#bite-examples')).toContainText(sentence);
    await expect(page.locator('#bite-examples')).toContainText(meaning);
  }
  await expect(page.locator('#bite-practise')).toContainText(note.practice);
  await expect(page.locator('.bite-answer p')).toBeVisible();
  await expect(page.locator('.bite-answer p')).toHaveText(note.answer);
  await page.screenshot({ path: testInfo.outputPath('bite-complete-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Copy complete note', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(note.answer);
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#library-search')).toHaveValue('worth');
  await expect(page.locator('#sort')).toHaveValue('asc');
  await expect(page.locator('[data-category="Grammar"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#library-search').fill('zzzzz-no-note');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.bite-card')).toHaveCount(80);
  expect(await page.locator('body').innerText()).not.toMatch(/instagram|[\p{Script=Han}]/iu);
});

test('global search opens a complete mobile note and old step links scroll without hiding content', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/bites');
  await expect(page.locator('.bite-card')).toHaveCount(80);
  await page.screenshot({ path: testInfo.outputPath('bites-mobile.png') });
  await page.keyboard.press('Control+k');
  await page.locator('#wiki-search').fill('worth');
  await expect(page.locator('#search-results [role="option"]').first()).toContainText('Language Bites');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#wiki-search')).toHaveAttribute('aria-activedescendant', 'search-result-1');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/bite\/G01/);
  await expect(page.locator('#search-dialog')).not.toBeVisible();
  for (const section of ['notice', 'understand', 'examples', 'practise']) {
    const panel = page.locator(`#bite-${section}`);
    await expect(panel).toBeVisible();
    await panel.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await expect(page.locator('.bite-answer p')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('bite-mobile.png'), fullPage: true });
  await page.goto('/#/bite/G01?step=2.5');
  await expect.poll(() => page.locator('#bite-understand').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(100);
  await expect(page.locator('#bite-notice')).toBeVisible();
  await expect(page.locator('#bite-practise')).toBeVisible();
  await page.reload();
  await expect.poll(() => page.locator('#bite-understand').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(100);
  await page.goto('/#/bite/unknown');
  await expect(page.getByText('Note not found', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Language Bites' }).click();
  await expect(page.locator('.bite-card')).toHaveCount(80);
  expect(errors).toEqual([]);
});

test('newest-first ordering can be reversed and stays with search when returning from a lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.card-main').first()).toHaveAttribute('href', /read\/lesson-19/);
  await page.locator('#sort').selectOption('asc');
  await expect(page.locator('.card-main').first()).toHaveAttribute('href', /read\/lesson-01/);
  await page.locator('#library-search').fill('out of paper');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await page.locator('.card-main').click();
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#sort')).toHaveValue('asc');
  await expect(page.locator('#library-search')).toHaveValue('out of paper');
  await page.goto('/#/cue-cards');
  await expect(page.locator('.group-card').first()).toHaveAttribute('href', /read\/cue-card-22/);
  await page.locator('#sort').selectOption('asc');
  await expect(page.locator('.group-card').first()).toHaveAttribute('href', /read\/cue-card-01/);
});

test('topic cards open from their body or keyboard while related lessons keep their own destination', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/topics');
    await page.locator('.topic-card').first().click({ position: { x: 12, y: 12 } });
    await expect(page).toHaveURL(/read\/topic-01/);
    await page.locator('.reader-toolbar .back-link').click();
    await page.locator('.topic-card').first().locator('.subtle-link').click();
    await expect(page).toHaveURL(/courses\?tags=01/);
    await page.goto('/#/topics');
    await page.locator('.topic-open').first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/read\/topic-01/);
  }
});

test('Linking words has its own searchable categories and preserves phrase deep links', async ({ page }, testInfo) => {
  await page.goto('/#/linking-words');
  await expect(page.locator('.group-card')).toHaveCount(12);
  await expect(page.locator('.nav-link.active')).toContainText('Linking words');
  await page.screenshot({ path: testInfo.outputPath('linking-words.png') });
  await page.locator('#library-search').fill('however');
  await expect(page.locator('.group-card')).toHaveCount(1);
  await page.locator('.group-card').first().click();
  await expect(page.locator('.wiki-section[open]')).toHaveCount(1);
  await expect(page.locator('.wiki-section[open]').getByRole('heading', { name: 'However', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.wiki-section[open]').getByRole('heading', { name: 'However', exact: true })).toBeVisible();
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#library-search')).toHaveValue('however');
  await page.getByRole('link', { name: 'Quick recall', exact: true }).click();
  await expect(page.locator('[data-wiki-section="14-quick-recall-practice"] .section-body')).toBeVisible();
});
