import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test, type CDPSession, type Page, type TestInfo } from '@playwright/test';
import {
  QUALITY_STORY_ID,
  assertNoUnexpectedApiRequests,
  authenticateQualityUserFromFixture,
  installDeterministicApi
} from './support/quality-fixtures';

const LONG_TASK_BUDGET_MS = 50;
const STYLE_LAYOUT_FRAME_BUDGET_MS = 1;
const WELCOME_FRAME_BUDGET_MS = 1.5;
const WELCOME_FRAME_BUDGET_PERCENTILE = 0.95;
const routeMetrics: RouteMetrics[] = [];

type LongTaskMetric = {
  route: string;
  name: string;
  duration: number;
  startTime: number;
};

type FrameCostMetric = {
  route: string;
  name: string;
  frame: number;
  duration: number;
};

type RouteMetrics = {
  route: string;
  name: string;
  longTasks: LongTaskMetric[];
  pointerGlowFrameCosts: FrameCostMetric[];
  lenisFrameCosts: FrameCostMetric[];
  welcomeFrameCosts?: FrameCostMetric[];
};

type BrowserLongTask = {
  duration: number;
  startTime: number;
};

declare global {
  interface Window {
    __performanceAudit?: {
      start(name: string): void;
      stop(): { name: string; longTasks: BrowserLongTask[] };
    };
    __welcomeFrameCosts?: number[];
  }
}

test.beforeEach(async ({ page }) => {
  await installHighMotionTier(page);
  await installLongTaskObserver(page);
  await page.addInitScript(() => { window.__welcomeFrameCosts = []; });
  await installDeterministicApi(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

async function installHighMotionTier(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      configurable: true,
      get: () => 8
    });
  });
}

test.afterAll(() => {
  const outputPath = process.env['PERF_AUDIT_OUTPUT'];
  if (!outputPath) return;

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: 1,
    budgets: {
      longTaskMs: LONG_TASK_BUDGET_MS,
      styleLayoutFrameMs: STYLE_LAYOUT_FRAME_BUDGET_MS,
      welcomeFrameMs: WELCOME_FRAME_BUDGET_MS,
      welcomeFramePercentile: WELCOME_FRAME_BUDGET_PERCENTILE
    },
    routes: routeMetrics
  }, null, 2)}\n`);
});

test('welcome entrance and normal scroll stay within the long-task budget', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login', { waitUntil: 'networkidle' });
  await settleAnimationFrames(page, 3);

  await page.getByRole('link', { name: /TestCaseIQ/ }).click();
  await expect(page.getByRole('heading', { name: 'AI drafts. Humans approve.' })).toBeVisible();
  await assertWelcomeMotionBackground(page);
  await startAnimationWindow(page, 'welcome entrance');
  await page.waitForTimeout(1_100);
  const entranceTasks = await stopAnimationWindow(page, '/', 'welcome entrance');

  await startAnimationWindow(page, 'welcome normal scroll');
  await page.mouse.wheel(0, 720);
  await page.waitForTimeout(900);
  const scrollTasks = await stopAnimationWindow(page, '/', 'welcome normal scroll');
  const welcomeFrameDurations = await page.evaluate(() => window.__welcomeFrameCosts ?? []);
  expect(welcomeFrameDurations.length, 'welcome dot-grid must report frame costs').toBeGreaterThan(0);

  await recordAndAssert({
    route: '/',
    name: 'welcome',
    longTasks: [...entranceTasks, ...scrollTasks],
    pointerGlowFrameCosts: [],
    lenisFrameCosts: [],
    welcomeFrameCosts: welcomeFrameDurations.map((duration, frame) => ({
      route: '/',
      name: 'welcome dot-grid',
      frame,
      duration: round(duration)
    }))
  }, testInfo);
  assertNoUnexpectedApiRequests(page);
});

test('dashboard entrance, pointer glow, and Lenis frames stay within budget', async ({ page, context }, testInfo) => {
  await authenticateForRealMotion(page);
  await page.goto('/stories', { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: 'Buyer completes checkout' })).toBeVisible();
  await settleAnimationFrames(page, 4);

  await startAnimationWindow(page, 'dashboard entrance');
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Dashboard' })
    .click();
  await expect(page.getByText('Test Generation Requested', { exact: true })).toBeVisible();
  await assertRealMotionBackground(page);
  await page.waitForTimeout(1_100);
  const longTasks = await stopAnimationWindow(page, '/dashboard', 'dashboard entrance');

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const pointerGlowFrameCosts = await measurePointerGlowFrames(page, cdp, '/dashboard');
  const lenisFrameCosts = await measureLenisFrames(page, cdp, '/dashboard');
  await cdp.detach();

  await recordAndAssert({
    route: '/dashboard',
    name: 'dashboard',
    longTasks,
    pointerGlowFrameCosts,
    lenisFrameCosts
  }, testInfo);
  assertNoUnexpectedApiRequests(page);
});

test('stories list-to-detail transition stays within the long-task budget', async ({ page, context }, testInfo) => {
  await authenticateForRealMotion(page);
  await page.goto('/stories', { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: 'Buyer completes checkout' })).toBeVisible();
  await settleAnimationFrames(page, 4);

  await startAnimationWindow(page, 'stories list to detail');
  await page.getByRole('link', { name: 'Buyer completes checkout' }).click();
  await expect(page).toHaveURL(new RegExp(`/stories/${QUALITY_STORY_ID}$`));
  await expect(page.getByRole('heading', { name: 'Buyer completes checkout', level: 1 })).toBeVisible();
  await page.waitForTimeout(900);
  const longTasks = await stopAnimationWindow(page, `/stories/${QUALITY_STORY_ID}`, 'stories list to detail');

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const lenisFrameCosts = await measureLenisFrames(page, cdp, `/stories/${QUALITY_STORY_ID}`);
  await cdp.detach();

  await recordAndAssert({
    route: `/stories/${QUALITY_STORY_ID}`,
    name: 'stories list to detail',
    longTasks,
    pointerGlowFrameCosts: [],
    lenisFrameCosts
  }, testInfo);
  assertNoUnexpectedApiRequests(page);
});

test('review-board entrance and quality-gauge interaction stay within budget', async ({ page, context }, testInfo) => {
  await authenticateForRealMotion(page);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByText('Test Generation Requested', { exact: true })).toBeVisible();
  await settleAnimationFrames(page, 4);

  await startAnimationWindow(page, 'review board entrance');
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Review Board' })
    .click();
  await expect(page.getByRole('heading', { name: 'Review Board' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Quality score 92' })).toBeVisible();
  await page.waitForTimeout(800);
  const entranceTasks = await stopAnimationWindow(page, '/review-board', 'review board entrance');

  const qualityReadout = page.locator('.quality-readout');
  const box = await qualityReadout.boundingBox();
  expect(box, 'review-board quality readout must be measurable').not.toBeNull();
  await startAnimationWindow(page, 'review board quality gauge');
  for (let frame = 0; frame < 8; frame += 1) {
    await page.mouse.move(
      box!.x + 12 + frame * Math.max(1, (box!.width - 24) / 7),
      box!.y + box!.height / 2
    );
    await settleAnimationFrames(page, 1);
  }
  await page.mouse.move(box!.x - 20, box!.y - 20);
  await page.waitForTimeout(700);
  const interactionTasks = await stopAnimationWindow(page, '/review-board', 'review board quality gauge');

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const lenisFrameCosts = await measureLenisFrames(page, cdp, '/review-board');
  await cdp.detach();

  await recordAndAssert({
    route: '/review-board',
    name: 'review board',
    longTasks: [...entranceTasks, ...interactionTasks],
    pointerGlowFrameCosts: [],
    lenisFrameCosts
  }, testInfo);
  assertNoUnexpectedApiRequests(page);
});

async function installLongTaskObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const longTasks: BrowserLongTask[] = [];
    let windowName = 'bootstrap';
    let windowStart = 0;
    let observer: PerformanceObserver | undefined;

    try {
      observer = new PerformanceObserver((list) => {
        longTasks.push(...list.getEntries().map((entry) => ({
          duration: entry.duration,
          startTime: entry.startTime
        })));
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Chromium exposes longtask entries; retaining the API makes failures explicit if that changes.
    }

    window.__performanceAudit = {
      start(name: string): void {
        observer?.takeRecords();
        longTasks.length = 0;
        windowName = name;
        windowStart = performance.now();
      },
      stop(): { name: string; longTasks: BrowserLongTask[] } {
        if (observer) {
          longTasks.push(...observer.takeRecords().map((entry) => ({
            duration: entry.duration,
            startTime: entry.startTime
          })));
        }
        return {
          name: windowName,
          longTasks: longTasks.filter((entry) => entry.startTime >= windowStart)
        };
      }
    };
  });
}

async function authenticateForRealMotion(page: Page): Promise<void> {
  await authenticateQualityUserFromFixture(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

async function assertRealMotionBackground(page: Page): Promise<void> {
  const scene = page.getByTestId('background-scene');
  await expect(scene).toBeVisible();
  await expect.poll(async () => scene.getAttribute('class')).not.toMatch(/is-static/);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
}

async function assertWelcomeMotionBackground(page: Page): Promise<void> {
  const canvas = page.getByTestId('welcome-background-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId('background-scene')).toHaveCount(0);
  await expect.poll(async () => canvas.evaluate((element: HTMLCanvasElement) => ({
    bufferHeight: element.height,
    bufferWidth: element.width,
    cssHeight: element.style.height,
    cssWidth: element.style.width,
    dpr: window.devicePixelRatio,
    viewportHeight: document.documentElement.clientHeight,
    viewportWidth: document.documentElement.clientWidth
  }))).toEqual({
    bufferHeight: Math.round(900 * await page.evaluate(() => window.devicePixelRatio)),
    bufferWidth: Math.round(1440 * await page.evaluate(() => window.devicePixelRatio)),
    cssHeight: '900px',
    cssWidth: '1440px',
    dpr: await page.evaluate(() => window.devicePixelRatio),
    viewportHeight: 900,
    viewportWidth: 1440
  });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);

  const hardwareConcurrency = await page.evaluate(() => navigator.hardwareConcurrency);
  expect(hardwareConcurrency, 'welcome cursor audit requires the high motion tier').toBeGreaterThan(2);
  const target = await canvas.evaluate((element: HTMLCanvasElement) => {
    const spacing = 32;
    const columns = Math.ceil(element.clientWidth / spacing) + 1;
    const rows = Math.ceil(element.clientHeight / spacing) + 1;
    return {
      x: (element.clientWidth - (columns - 1) * spacing) / 2 + Math.floor(columns / 2) * spacing,
      y: (element.clientHeight - (rows - 1) * spacing) / 2 + Math.floor(rows / 2) * spacing
    };
  });

  await page.mouse.move(4, 4);
  await settleAnimationFrames(page, 6);
  const restingEnergy = await canvasEnergy(canvas, target.x, target.y);
  await page.mouse.move(target.x, target.y);
  await settleAnimationFrames(page, 8);
  const hotEnergy = await canvasEnergy(canvas, target.x, target.y);
  expect(hotEnergy, 'dots near the pointer should visibly brighten and scale').toBeGreaterThan(restingEnergy * 1.5);
}

async function canvasEnergy(
  canvas: ReturnType<Page['getByTestId']>,
  cssX: number,
  cssY: number
): Promise<number> {
  return canvas.evaluate((element: HTMLCanvasElement, point) => {
    const context = element.getContext('2d');
    if (!context) throw new Error('Welcome canvas does not expose a 2D context.');
    const dpr = element.width / element.clientWidth;
    const sampleSize = Math.max(1, Math.round(16 * dpr));
    const pixels = context.getImageData(
      Math.max(0, Math.round(point.cssX * dpr - sampleSize / 2)),
      Math.max(0, Math.round(point.cssY * dpr - sampleSize / 2)),
      sampleSize,
      sampleSize
    ).data;
    let energy = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      energy += pixels[index] + pixels[index + 1] + pixels[index + 2] + pixels[index + 3];
    }
    return energy;
  }, { cssX, cssY });
}

async function startAnimationWindow(page: Page, name: string): Promise<void> {
  await page.evaluate((windowName) => {
    if (!window.__performanceAudit) throw new Error('Long-task observer was not installed before app scripts.');
    window.__performanceAudit.start(windowName);
  }, name);
}

async function stopAnimationWindow(page: Page, route: string, expectedName: string): Promise<LongTaskMetric[]> {
  await settleAnimationFrames(page, 2);
  const result = await page.evaluate(() => {
    if (!window.__performanceAudit) throw new Error('Long-task observer is unavailable.');
    return window.__performanceAudit.stop();
  });
  expect(result.name).toBe(expectedName);
  return result.longTasks.map((entry) => ({
    route,
    name: result.name,
    duration: round(entry.duration),
    startTime: round(entry.startTime)
  }));
}

async function measurePointerGlowFrames(
  page: Page,
  cdp: CDPSession,
  route: string
): Promise<FrameCostMetric[]> {
  const target = page.locator('.glass-surface--live').first();
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box, `${route} pointer-glow target must have a layout box`).not.toBeNull();
  await settleAnimationFrames(page, 3);

  let previous = await styleLayoutDuration(cdp);
  const costs: FrameCostMetric[] = [];
  for (let frame = 0; frame < 10; frame += 1) {
    const x = box!.x + Math.min(box!.width - 4, 8 + frame * Math.max(2, (box!.width - 16) / 9));
    const y = box!.y + Math.min(box!.height - 4, 8 + (frame % 3) * Math.max(2, (box!.height - 16) / 3));
    await page.mouse.move(x, y);
    await settleAnimationFrames(page, 1);
    const current = await styleLayoutDuration(cdp);
    costs.push({
      route,
      name: 'pointer glow',
      frame,
      duration: round(Math.max(0, current - previous))
    });
    previous = current;
  }
  await expect(target).toHaveCSS('--pointer-active', '1');
  return costs;
}

async function measureLenisFrames(
  page: Page,
  cdp: CDPSession,
  route: string
): Promise<FrameCostMetric[]> {
  const wrapper = page.locator('.workspace');
  await expect(wrapper).toBeVisible();
  await wrapper.hover();
  await settleAnimationFrames(page, 3);

  const initialScrollTop = await wrapper.evaluate((element) => element.scrollTop);
  let previous = await styleLayoutDuration(cdp);
  await page.mouse.wheel(0, 420);
  const costs: FrameCostMetric[] = [];
  for (let frame = 0; frame < 12; frame += 1) {
    await settleAnimationFrames(page, 1);
    const current = await styleLayoutDuration(cdp);
    costs.push({
      route,
      name: 'Lenis scroll',
      frame,
      duration: round(Math.max(0, current - previous))
    });
    previous = current;
  }
  await expect.poll(async () => wrapper.evaluate((element) => element.scrollTop)).toBeGreaterThan(initialScrollTop);
  return costs;
}

async function styleLayoutDuration(cdp: CDPSession): Promise<number> {
  const response = await cdp.send('Performance.getMetrics');
  const metrics = new Map(response.metrics.map((metric) => [metric.name, metric.value]));
  return ((metrics.get('RecalcStyleDuration') ?? 0) + (metrics.get('LayoutDuration') ?? 0)) * 1_000;
}

async function settleAnimationFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let frame = 0; frame < frameCount; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, count);
}

async function recordAndAssert(metrics: RouteMetrics, testInfo: TestInfo): Promise<void> {
  routeMetrics.push(metrics);
  await testInfo.attach(`${metrics.name}-performance-metrics`, {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json'
  });

  for (const task of metrics.longTasks) {
    expect(
      task.duration,
      `${task.route} / ${task.name}: long task duration ${task.duration}ms exceeded ${LONG_TASK_BUDGET_MS}ms`
    ).toBeLessThanOrEqual(LONG_TASK_BUDGET_MS);
  }
  for (const frame of [...metrics.pointerGlowFrameCosts, ...metrics.lenisFrameCosts]) {
    expect(
      frame.duration,
      `${frame.route} / ${frame.name} frame ${frame.frame}: style+layout duration ${frame.duration}ms exceeded ${STYLE_LAYOUT_FRAME_BUDGET_MS}ms`
    ).toBeLessThan(STYLE_LAYOUT_FRAME_BUDGET_MS);
  }
  if (metrics.welcomeFrameCosts?.length) {
    const sortedDurations = metrics.welcomeFrameCosts
      .map((frame) => frame.duration)
      .sort((left, right) => left - right);
    const percentileIndex = Math.ceil(sortedDurations.length * WELCOME_FRAME_BUDGET_PERCENTILE) - 1;
    const percentileDuration = sortedDurations[Math.max(0, percentileIndex)] ?? Number.POSITIVE_INFINITY;
    expect(
      percentileDuration,
      `${metrics.route} / welcome dot-grid p95 frame cost ${percentileDuration}ms exceeded ${WELCOME_FRAME_BUDGET_MS}ms`
    ).toBeLessThan(WELCOME_FRAME_BUDGET_MS);
  }
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
