import { test, expect } from '@playwright/test';

test('vocabulary supports recall, search, lesson links and device pronunciation', async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = u => { window.spokenWord = u.text; };
  });
  await page.goto('/#/vocabulary');
  await expect(page.locator('.vocabulary-word')).toHaveCount(12);
  await page.getByRole('button', { name: 'Pronounce contemplate', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.spokenWord)).toBe('contemplate');
  await page.getByLabel('Hide meanings and examples').check();
  await expect(page.locator('.vocabulary-meaning[open]')).toHaveCount(0);
  await page.locator('.vocabulary-meaning summary').first().click();
  await expect(page.locator('.vocabulary-meaning[open]')).toHaveCount(1);
  await page.locator('#library-search').fill('recover');
  await expect(page.locator('.vocabulary-word')).toHaveCount(1);
  await expect(page.locator('.vocabulary-word')).toContainText('resilience');
  await page.reload();
  await expect(page.locator('.vocabulary-word')).toHaveCount(1);
  await page.getByRole('link', { name: 'Lesson 09', exact: true }).click();
  await expect(page.locator('.document')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/#/vocabulary');
  await expect(page.locator('.vocabulary-word')).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
