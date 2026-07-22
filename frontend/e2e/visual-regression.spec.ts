import { expect, test, type Page } from '@playwright/test';
import {
  QUALITY_STORY_ID,
  assertNoUnexpectedApiRequests,
  authenticateQualityUserFromFixture,
  gotoStable,
  installDeterministicApi
} from './support/quality-fixtures';

const VIEWPORT = { width: 1_440, height: 1_000 } as const;
const FIXED_NOW = Date.parse('2026-06-21T09:05:00.000Z');
const SCREENSHOT_OPTIONS = {
  animations: 'disabled',
  caret: 'hide'
} as const;
const liveAuthRequests = new WeakMap<Page, string[]>();

declare global {
  interface Window {
    __welcomeRafRequests?: number;
  }
}

async function capture(page: Page, name: string): Promise<void> {
  expect(new URL(page.url()).searchParams.get('bg')).toBe('fallback');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
}

test.beforeEach(async ({ page }, testInfo) => {
  expect(testInfo.project.use.locale).toBe('en-US');
  expect(testInfo.project.use.timezoneId).toBe('Africa/Tunis');
  await page.setViewportSize(VIEWPORT);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: FIXED_NOW });
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.__welcomeRafRequests = 0;
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      window.__welcomeRafRequests = (window.__welcomeRafRequests ?? 0) + 1;
      return requestFrame(callback);
    };
    const installDeterministicMotionStyle = () => {
      const style = document.createElement('style');
      style.dataset['visualRegression'] = 'deterministic-motion';
      style.textContent = `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `;
      document.documentElement.appendChild(style);
    };

    if (document.documentElement) installDeterministicMotionStyle();
    else document.addEventListener('DOMContentLoaded', installDeterministicMotionStyle, { once: true });
  });
  liveAuthRequests.set(page, []);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login') {
      liveAuthRequests.get(page)?.push(`${request.method()} ${request.url()}`);
    }
  });
  await installDeterministicApi(page);
});

test.afterEach(async ({ page }) => {
  expect(liveAuthRequests.get(page) ?? [], 'visual tests must not issue live auth requests').toEqual([]);
  assertNoUnexpectedApiRequests(page);
});

for (const viewport of [
  { name: 'welcome-desktop-1440x900.png', width: 1_440, height: 900 },
  { name: 'welcome-mobile-390x844.png', width: 390, height: 844 }
] as const) {
  test(`welcome static fallback ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await gotoStable(page, '/');

    await expect(page.getByRole('heading', { name: 'AI drafts. Humans approve.' })).toBeVisible();
    const reviewGate = page.locator('app-welcome-review-gate .wl-instrument-panel');
    await expect(reviewGate).toBeVisible();
    await expect(reviewGate).toHaveAttribute('aria-hidden', 'true');
    await expect(reviewGate).toHaveAttribute('data-state', 'approved');
    await page.evaluate(() => { window.__welcomeRafRequests = 0; });
    await page.waitForTimeout(120);
    expect(await page.evaluate(() => window.__welcomeRafRequests ?? 0)).toBe(0);

    await capture(page, viewport.name);
  });
}

test('dashboard pipeline', async ({ page }) => {
  await authenticateQualityUserFromFixture(page);
  await gotoStable(page, '/dashboard');

  const pipeline = page.getByRole('navigation', { name: 'Dashboard totals' });
  await expect(pipeline).toBeVisible();
  await expect(pipeline.getByRole('link')).toHaveCount(6);
  await expect(page.getByText('Test Generation Requested', { exact: true })).toBeVisible();

  await capture(page, 'dashboard-pipeline.png');
});

test('story detail', async ({ page }) => {
  await authenticateQualityUserFromFixture(page);
  await gotoStable(page, `/stories/${QUALITY_STORY_ID}`);

  await expect(page.getByRole('heading', { name: 'Buyer completes checkout', level: 1 })).toBeVisible();
  await expect(page.getByText(
    'As a buyer, I want to complete checkout so that my order is confirmed.',
    { exact: true }
  )).toBeVisible();
  await expect(page.locator('[data-ai-state="analysis"]')).toHaveAttribute('aria-busy', 'false');

  await capture(page, 'story-detail.png');
});

test('story detail analyzing', async ({ page }) => {
  await authenticateQualityUserFromFixture(page);
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/analysis`, (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    json: { message: 'Analysis not generated.' }
  }));

  let finishAnalysis: (() => void) | undefined;
  const analysisGate = new Promise<void>((resolve) => { finishAnalysis = resolve; });
  await page.route(`**/api/stories/${QUALITY_STORY_ID}/analyze`, async (route) => {
    await analysisGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: {
        storyId: QUALITY_STORY_ID,
        actor: 'Buyer',
        goal: 'Complete checkout',
        businessValue: 'Orders can be confirmed.',
        confidenceScore: 0.92,
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

  const analysisPanel = page.locator('[data-ai-state="analysis"]');
  await expect(analysisPanel).toHaveClass(/is-analyzing/);
  await expect(analysisPanel).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Analyzing...', { exact: true }).first()).toBeVisible();

  await capture(page, 'story-detail-analyzing.png');
  finishAnalysis?.();
});

test('review board idle', async ({ page }) => {
  await authenticateQualityUserFromFixture(page);
  await gotoStable(page, '/review-board');

  await expect(page.getByRole('heading', { name: 'Review Board' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Complete checkout with valid payment/ })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Quality score 92' })).toBeVisible();

  await capture(page, 'review-board-idle.png');
});

test('search modal open', async ({ page }) => {
  await authenticateQualityUserFromFixture(page);
  await gotoStable(page, '/dashboard');
  await page.getByRole('button', { name: 'Open search' }).click();

  const dialog = page.getByRole('dialog', { name: 'Global search' });
  await expect(dialog).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search' }).fill('checkout');
  await expect(dialog.getByRole('button', { name: 'Checkout Quality' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Complete checkout with valid payment' })).toBeVisible();

  await capture(page, 'search-modal-open.png');
});
