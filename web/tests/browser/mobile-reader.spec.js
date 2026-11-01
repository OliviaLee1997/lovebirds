import { test, expect } from '@playwright/test';

test('phone readers put content first and keep tools available on demand', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['lesson-02', 'cue-card-22', 'grammar', 'cue-card-templates']) {
    await page.goto(`/#/read/${id}`);
    const options = page.locator('.mobile-reading-options');
    await expect(options).toBeVisible();
    await expect(options).toHaveJSProperty('open', false);
    await expect(page.locator('.reader-tags')).toBeHidden();
    await expect(page.locator('.reader-index')).toBeHidden();
    await expect(page.locator('.reading-tools')).toBeHidden();
    await expect(page.locator('.source-details')).toBeHidden();
    await expect(page.locator('.reading-pagination.compact')).toBeHidden();
    const first = page.locator('.wiki-section > summary').first();
    await expect(first).toBeInViewport();
    expect(await first.evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (id === 'cue-card-22') await page.screenshot({ path: testInfo.outputPath('mobile-content-first.png') });
    await options.locator(':scope > summary').click();
    await page.locator('.reading-tools > summary').click();
    await expect(page.getByRole('button', { name: 'Read article', exact: true })).toBeVisible();
    await page.locator('.reader-index > summary').click();
    const link = page.locator('.reader-index [data-section]').nth(1);
    const target = await link.getAttribute('data-section');
    await link.click();
    await expect(options).toHaveJSProperty('open', false);
    await expect(page.locator(`[data-wiki-section="${target}"]`)).toHaveJSProperty('open', true);
    await expect(page.locator(`[id="${target}"]`)).toBeInViewport();
  }
});

test('mobile tools preserve source notes and restore desktop layout after resizing', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/read/lesson-02');
  await page.locator('.mobile-reading-options > summary').focus();
  await page.keyboard.press('Enter');
  await page.locator('.source-details > summary').click();
  const source = await page.locator('.source-details').textContent();
  await expect(page.getByRole('button', { name: 'Increase text size' })).toBeVisible();
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await expect(page.locator('.document')).toHaveCSS('font-size', '18px');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.mobile-reading-options')).toHaveCount(0);
  await expect(page.locator('.reader-heading .reader-tags')).toBeVisible();
  await expect(page.locator('.reader-toolbar .reader-tools')).toBeVisible();
  await expect(page.locator('.reading-column > .reading-tools')).toBeVisible();
  await expect(page.locator('.document .source-details')).toHaveText(source);
  await expect(page.locator('.reading-pagination.compact')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-layout-preserved.png') });
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(page.locator('.mobile-reading-options')).toHaveCount(1);
  await expect(page.locator('.source-details')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.goto('/#/bite/G01');
  await expect(page.locator('.mobile-reading-options')).toHaveJSProperty('open', false);
  await expect(page.locator('.reading-tools')).toBeHidden();
  await expect(page.locator('.bite-panel').first()).toBeInViewport();
  await page.locator('.mobile-reading-options > summary').click();
  await expect(page.getByRole('button', { name: 'Copy complete note' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-tools-expanded.png') });
});

test('selected article text survives opening the mobile reading tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/read/cue-card-01');
  const selected = await page.locator('.document .section-body p').first().evaluate(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    return selection.toString().trim().slice(0, 120);
  });
  await page.locator('.mobile-reading-options > summary').click();
  await page.locator('.reading-tools > summary').click();
  await expect(page.getByRole('button', { name: 'Read selection', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await expect(page.getByLabel('English word or phrase')).toHaveValue(selected);
});
