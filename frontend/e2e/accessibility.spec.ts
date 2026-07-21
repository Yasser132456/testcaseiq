import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import {
  QUALITY_STORY_ID,
  authenticateQualityUser,
  gotoStable,
  installDeterministicApi
} from './support/quality-fixtures';

const requiredRoutes = [
  { name: 'welcome', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'stories list', path: '/stories' },
  { name: 'story detail', path: `/stories/${QUALITY_STORY_ID}` },
  { name: 'review board', path: '/review-board' },
  { name: 'settings', path: '/settings' }
] as const;

test.beforeEach(async ({ page }) => {
  await installDeterministicApi(page);
});

for (const route of requiredRoutes) {
  test(`${route.name} has no serious or critical accessibility violations`, async ({ page, request }, testInfo) => {
    if (route.path !== '/' && route.path !== '/login') {
      await authenticateQualityUser(page, request);
    }
    await gotoStable(page, route.path);

    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.filter(({ impact }) =>
      impact === 'serious' || impact === 'critical'
    );

    await testInfo.attach(`${route.name}-axe-serious-critical.json`, {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json'
    });
    expect(violations).toEqual([]);
  });
}

test('AI loading and success states announce politely', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  let finishAnalysis: (() => void) | undefined;
  const analysisGate = new Promise<void>((resolve) => { finishAnalysis = resolve; });
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/analysis`, (route) =>
    route.fulfill({ status: 404, json: { message: 'Analysis not generated.' } })
  );
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/analyze`, async (route) => {
    await analysisGate;
    await route.fulfill({
      json: {
        storyId: QUALITY_STORY_ID,
        actor: 'Buyer',
        goal: 'Complete checkout',
        requirements: { requirements: [], acceptanceCriteria: [] },
        ambiguities: { ambiguities: [] },
        coveragePlan: { coverageItems: [] },
        qaValidation: { requirementQualityScore: 0.9, testabilityScore: 0.94, warnings: [] },
        provider: 'mock',
        generatedAt: '2026-06-21T09:00:00.000Z'
      }
    });
  });
  await gotoStable(page, `/stories/${QUALITY_STORY_ID}`);

  await page.getByRole('button', { name: 'Analyze Story' }).click();
  const loading = page.getByText('Analyzing...', { exact: true }).first();
  await expect(loading).toHaveAttribute('role', 'status');
  await expect(loading).toHaveAttribute('aria-live', 'polite');

  finishAnalysis?.();
  const success = page.getByText('Analysis complete.', { exact: true });
  await expect(success).toHaveAttribute('role', 'status');
  await expect(success).toHaveAttribute('aria-live', 'polite');
});

test('AI failures announce assertively', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/analysis`, (route) =>
    route.fulfill({ status: 404, json: { message: 'Analysis not generated.' } })
  );
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/analyze`, (route) =>
    route.fulfill({ status: 500, json: { message: 'Analysis failed.' } })
  );
  await gotoStable(page, `/stories/${QUALITY_STORY_ID}`);

  await page.getByRole('button', { name: 'Analyze Story' }).click();
  const phaseError = page.getByText('Analysis failed.', { exact: true });
  await expect(phaseError).toHaveAttribute('role', 'alert');
  await expect(phaseError).toHaveAttribute('aria-live', 'assertive');

  const messageError = page.getByRole('alert').filter({ hasText: 'Analysis unavailable' });
  await expect(messageError).toHaveAttribute('aria-live', 'assertive');
});

test('AI generation failures announce assertively', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/test-suites`, (route) =>
    route.fulfill({ json: [] })
  );
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/generate-tests`, (route) =>
    route.fulfill({ status: 500, json: { message: 'Generation failed.' } })
  );
  await gotoStable(page, `/stories/${QUALITY_STORY_ID}`);

  await page.getByRole('button', { name: /^Test Cases/ }).click();
  await page.getByRole('button', { name: 'Generate Test Cases' }).click();
  const phaseError = page.getByText('Generation failed.', { exact: true });
  await expect(phaseError).toHaveAttribute('role', 'alert');
  await expect(phaseError).toHaveAttribute('aria-live', 'assertive');

  const messageError = page.getByRole('alert').filter({ hasText: 'Test generation unavailable' });
  await expect(messageError).toHaveAttribute('aria-live', 'assertive');
});

test('empty search results announce politely', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  await page.route('**/api/search?*', (route) => route.fulfill({
    json: { projects: [], stories: [], testSuites: [], testCases: [] }
  }));
  await gotoStable(page, '/dashboard');
  await page.getByRole('button', { name: 'Open search' }).click();
  await page.getByRole('searchbox', { name: 'Search' }).fill('nothing matches');

  const empty = page.getByText(/No results for 'nothing matches'/);
  await expect(empty).toHaveAttribute('role', 'status');
  await expect(empty).toHaveAttribute('aria-live', 'polite');
});

test('welcome CTA and application navigation expose a two-pixel focus ring', async ({ page, request }) => {
  await gotoStable(page, '/');
  await expectTwoPixelFocusRing(page.locator('.wl-btn-primary').first());

  await authenticateQualityUser(page, request);
  await gotoStable(page, '/dashboard');
  await expectTwoPixelFocusRing(page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Stories' }));
  await expectTwoPixelFocusRing(page.getByRole('button', { name: 'Open search' }));
});

test('story card action exposes an accessible link and two-pixel focus ring', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  await gotoStable(page, '/stories');
  const storyAction = page.getByRole('link', { name: 'Buyer completes checkout' });
  await expect(storyAction).toBeVisible();
  await expectTwoPixelFocusRing(storyAction);
});

test('review cards and verdict actions expose a two-pixel focus ring', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  await gotoStable(page, '/review-board');
  await expectTwoPixelFocusRing(page.getByRole('button', { name: /Complete checkout with valid payment/ }));
  await expectTwoPixelFocusRing(page.getByRole('button', { name: 'Approve', exact: true }));
  await expectTwoPixelFocusRing(page.getByRole('button', { name: 'Reject', exact: true }));
});

test('search controls and results expose a two-pixel focus ring', async ({ page, request }) => {
  await authenticateQualityUser(page, request);
  await gotoStable(page, '/dashboard');
  await page.getByRole('button', { name: 'Open search' }).click();
  await expectTwoPixelFocusRing(page.getByRole('button', { name: 'Close search' }));
  await page.getByRole('searchbox', { name: 'Search' }).fill('checkout');
  await expectTwoPixelFocusRing(page.getByRole('button', { name: 'Buyer completes checkout' }));
});

async function expectTwoPixelFocusRing(locator: Locator): Promise<void> {
  await locator.page().keyboard.press('Tab');
  await locator.focus();
  const ring = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineOffset: Number.parseFloat(style.outlineOffset)
    };
  });
  expect(ring.focusVisible).toBe(true);
  expect(ring.outlineStyle).not.toBe('none');
  expect(ring.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(ring.outlineOffset).toBeGreaterThanOrEqual(2);
}
