import { test, expect } from '@playwright/test';

async function mockSpeech(page) {
  await page.addInitScript(() => {
    window.spoken = []; window.cancelCount = 0;
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    const synth = new EventTarget();
    synth.getVoices = () => [{ name: 'Test English', lang: 'en-GB' }, { name: 'Other', lang: 'fr-FR' }];
    synth.speak = utterance => { window.spoken.push(utterance); };
    synth.cancel = () => { window.cancelCount++; };
    synth.pause = () => { window.didPause = true; };
    synth.resume = () => { window.didResume = true; };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  });
}

test('all 22 topics have a discoverable template summary and working topic references', async ({ page, request }, testInfo) => {
  await page.goto('/#/cue-cards');
  await page.getByRole('link', { name: 'Answer templates', exact: true }).click();
  await expect(page.locator('.reader-heading')).toContainText('All 22 Topics');
  await expect(page.locator('.sidebar .nav-link.active')).toContainText('Cue cards');
  await expect(page.locator('.document tbody').first().locator('tr')).toHaveCount(22);
  const doc = await (await request.get('/content/cue-card-templates.json')).json();
  for (let i = 1; i <= 10; i++) expect(doc.headings.some(h => h.depth === 2 && h.title.startsWith(`${i}. `))).toBeTruthy();
  await expect(page.locator('.reading-pagination.compact a[rel="prev"]')).toHaveAttribute('href', /cue-card-grammar/);
  await page.locator('.reading-tools > summary').click();
  await page.screenshot({ path: testInfo.outputPath('templates-and-tools-desktop.png') });
  await page.reload();
  await expect(page.getByRole('heading', { name: '1. An Ambition or Future Plan', exact: true })).toBeVisible();
});

test('speech reads chosen text, handles controls and voice, and cancels stale queues on navigation', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/#/read/cue-card-01');
  await page.locator('.reading-tools > summary').click();
  await expect(page.locator('[aria-label="English voice"] option')).toHaveCount(2);
  await page.getByLabel('Reading speed').selectOption('0.75');
  await page.getByLabel('English voice', { exact: true }).selectOption('0');
  await page.locator('.document .section-body p').first().evaluate(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Read selection', exact: true }).click();
  expect(await page.evaluate(() => window.spoken[0].text)).toContain('Describe an ambition');
  expect(await page.evaluate(() => window.spoken[0].rate)).toBe(0.75);
  expect(await page.evaluate(() => window.spoken[0].lang)).toBe('en-GB');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await page.evaluate(() => window.didPause)).toBeTruthy();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect(await page.evaluate(() => window.didResume)).toBeTruthy();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.locator('.reading-tool-status')).toHaveText('Stopped.');
  await page.getByRole('button', { name: 'Read article', exact: true }).click();
  await expect(page.locator('.is-being-read')).toHaveCount(1);
  const first = await page.evaluate(() => window.spoken.length);
  await page.evaluate(() => window.spoken.at(-1).onend());
  expect(await page.evaluate(() => window.spoken.length)).toBe(first + 1);
  await page.evaluate(() => { window.staleSpeech = window.spoken.at(-1); });
  await page.locator('.reader-toolbar .back-link').click();
  const count = await page.evaluate(() => window.spoken.length);
  await page.evaluate(() => window.staleSpeech.onend());
  expect(await page.evaluate(() => window.spoken.length)).toBe(count);
  await expect(page.locator('.reading-tools')).toHaveCount(0);
});

test('mobile lookup works without speech, safely encodes phrases and works in Language Bites', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; });
  await page.goto('/#/read/cue-card-templates');
  await page.locator('.reading-tools > summary').click();
  await expect(page.getByRole('button', { name: 'Read article', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await page.getByLabel('English word or phrase').fill('take it up & keep going');
  await page.getByRole('button', { name: 'Find meaning', exact: true }).click();
  const translation = page.getByRole('link', { name: 'Translate word or phrase' });
  expect(new URL(await translation.getAttribute('href')).searchParams.get('text')).toBe('take it up & keep going');
  await expect(translation).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('lookup-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('.lookup-dialog')).not.toBeVisible();
  await page.goto('/#/bite/G01');
  await page.locator('.reading-tools > summary').click();
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await expect(page.getByLabel('English word or phrase')).toHaveValue('');
});

test('Android prefers on-device English and retries a failed passage without skipping text', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(() => {
    window.speechSynthesis.getVoices = () => [
      { name: 'Online English', lang: 'en-US', voiceURI: 'online', localService: false },
      { name: 'Local English', lang: 'en-GB', voiceURI: 'local', localService: true },
      { name: 'Backup English', lang: 'en-AU', voiceURI: 'backup', localService: true },
    ];
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/read/cue-card-01');
  await page.locator('.reading-tools > summary').click();
  await page.getByRole('button', { name: 'Read article', exact: true }).click();
  expect(await page.evaluate(() => window.spoken[0].voice.voiceURI)).toBe('local');
  const original = await page.evaluate(() => window.spoken[0].text);
  await page.evaluate(() => { window.oldAttempt = window.spoken[0]; window.oldAttempt.onerror({ error: 'network' }); });
  expect(await page.evaluate(() => window.spoken[1].voice.voiceURI)).toBe('backup');
  expect(await page.evaluate(() => window.spoken[1].text)).toBe(original);
  await page.evaluate(() => window.spoken[1].onend());
  expect(await page.evaluate(() => window.spoken[2].voice.voiceURI)).toBe('backup');
  expect(await page.evaluate(() => window.spoken[2].text)).not.toBe(original);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByLabel('English voice', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Read article', exact: true }).click();
  expect(await page.evaluate(() => window.spoken.at(-1).voice.voiceURI)).toBe('online');
  await page.evaluate(() => window.spoken.at(-1).onerror({ error: 'network' }));
  expect(await page.evaluate(() => window.spoken.at(-1).voice.voiceURI)).toBe('backup');
  await expect(page.locator('.speech-help')).toBeHidden();
  await expect(page.locator('.reading-tool-status')).toHaveText('');
});

test('unavailable mobile voices end retries with actionable advice and stop prevents retry', async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(() => {
    window.speechSynthesis.getVoices = () => [{ name: 'Online English', lang: 'en-US', localService: false }];
  });
  await page.goto('/#/read/cue-card-01');
  await page.locator('.reading-tools > summary').click();
  await page.getByRole('button', { name: 'Read article', exact: true }).click();
  await page.evaluate(() => window.spoken.at(-1).onerror({ error: 'network' }));
  await expect(page.locator('.reading-tool-status')).toHaveText('No English voice could play.');
  await expect(page.locator('.speech-help')).toBeVisible();
  await expect(page.locator('.speech-help li')).toHaveCount(4);
  await expect(page.locator('.speech-help')).toContainText('Open this page directly in Chrome');
  await expect(page.locator('.speech-help')).toContainText('On-device');
  await expect(page.locator('.speech-help')).toContainText('Read selection');
  await expect(page.locator('.speech-help')).toContainText('Text-to-speech output');
  expect(await page.evaluate(() => window.spoken.length)).toBe(1);
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  await page.getByLabel('English voice', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Read article', exact: true }).click();
  await page.evaluate(() => { window.staleError = window.spoken.at(-1).onerror; });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.evaluate(() => window.staleError({ error: 'network' }));
  expect(await page.evaluate(() => window.spoken.length)).toBe(2);
  await expect(page.locator('.reading-tool-status')).toHaveText('Stopped.');
  await expect(page.locator('.speech-help')).toBeHidden();
});
