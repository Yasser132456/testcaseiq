import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { gotoStable } from './support/quality-fixtures';

const VIEWPORTS = [360, 768, 1024, 1440, 1920] as const;

type ElementRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

declare global {
  interface Window {
    __welcomeRafRequests?: number;
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.__welcomeRafRequests = 0;
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      window.__welcomeRafRequests = (window.__welcomeRafRequests ?? 0) + 1;
      return requestFrame(callback);
    };
  });
});

for (const width of VIEWPORTS) {
  test(`welcome layout is contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await gotoStable(page, '/');

    const layout = await page.evaluate(() => {
      const select = (selector: string): HTMLElement => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element;
      };
      const rect = (element: Element): ElementRect => {
        const value = element.getBoundingClientRect();
        return {
          bottom: value.bottom,
          height: value.height,
          left: value.left,
          right: value.right,
          top: value.top,
          width: value.width
        };
      };
      const regions = ['.wl-hero', '.wl-flow-row', '.wl-section--formats', '.wl-format-strip']
        .map((selector) => ({ selector, rect: rect(select(selector)) }));
      const headline = select('.wl-headline');
      const flowTops = Array.from(document.querySelectorAll('.wl-flow-card'))
        .map((element) => Math.round(element.getBoundingClientRect().top));
      return {
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        flowRows: new Set(flowTops).size,
        headline: rect(headline),
        headlineLines: Array.from(headline.querySelectorAll('.wl-headline-line')).map(rect),
        heroCopy: rect(select('.wl-hero-copy')),
        panel: rect(select('app-welcome-review-gate')),
        regions
      };
    });

    expect(layout.documentOverflow, 'document has horizontal overflow').toBeLessThanOrEqual(0);
    expect(layout.headline.left).toBeGreaterThanOrEqual(0);
    expect(layout.headline.right).toBeLessThanOrEqual(width);
    for (const line of layout.headlineLines) {
      expect(line.left).toBeGreaterThanOrEqual(layout.headline.left - 0.5);
      expect(line.right).toBeLessThanOrEqual(layout.headline.right + 0.5);
    }
    for (const region of layout.regions) {
      expect(region.rect.left, `${region.selector} crosses the left edge`).toBeGreaterThanOrEqual(0);
      expect(region.rect.right, `${region.selector} crosses the right edge`).toBeLessThanOrEqual(width);
    }
    if (width <= 900) {
      expect(layout.panel.top).toBeGreaterThanOrEqual(layout.heroCopy.bottom - 0.5);
    } else {
      expect(layout.panel.left).toBeGreaterThanOrEqual(layout.heroCopy.right - 0.5);
    }
    expect(layout.flowRows).toBe(width <= 680 ? 4 : width <= 900 ? 2 : 1);

    const undersizedTargets = await visibleUndersizedTargets(page);
    expect(undersizedTargets, 'visible targets smaller than 44x44 CSS px').toEqual([]);
  });
}

test('fallback and reduced motion leave one approved static frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoStable(page, '/');
  await expect(page.locator('.wl-instrument-panel')).toHaveAttribute('data-state', 'approved');

  await page.evaluate(() => { window.__welcomeRafRequests = 0; });
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.__welcomeRafRequests ?? 0)).toBe(0);
});

test('welcome exposes one ordered heading tree and a static review-gate description', async ({ page }) => {
  await gotoStable(page, '/');

  const headings = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((elements) => elements.map((element) => ({
    level: Number(element.tagName.slice(1)),
    text: element.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  })));
  expect(headings.filter(({ level }) => level === 1)).toEqual([
    { level: 1, text: 'AI drafts. Humans approve.' }
  ]);
  for (let index = 1; index < headings.length; index += 1) {
    expect(headings[index].level - headings[index - 1].level).toBeLessThanOrEqual(1);
  }

  await expect(page.locator('.wl-instrument-panel')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('app-welcome-review-gate .sr-only')).toHaveText(
    'Review gate active — approved for export'
  );
});

test('welcome TypeScript routes reduced-motion detection through MotionService', () => {
  const appRoot = join(process.cwd(), 'src', 'app');
  const files = collectTypeScriptFiles(appRoot);
  const directQueries = files.filter((file) => {
    if (file.endsWith('.spec.ts') || file.endsWith(join('core', 'motion', 'motion.service.ts'))) return false;
    return /matchMedia[^\n]*prefers-reduced-motion/.test(readFileSync(file, 'utf8'));
  });

  expect(directQueries).toEqual([]);
});

async function visibleUndersizedTargets(page: Page): Promise<Array<{
  height: number;
  label: string;
  tag: string;
  width: number;
}>> {
  return page.locator('a, button, [role="button"]').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        height: Number(rect.height.toFixed(2)),
        label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
        tag: element.tagName.toLowerCase(),
        width: Number(rect.width.toFixed(2))
      };
    })
    .filter(({ height, width }) => height < 44 || width < 44));
}

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}
