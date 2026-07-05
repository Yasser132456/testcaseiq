const fs = require('fs');
const path = require('path');
const { chromium } = require('../../frontend/node_modules/playwright');

const baseURL = 'http://127.0.0.1:4200';
const apiURL = 'http://127.0.0.1:8080';
const outDir = path.resolve(__dirname);

async function api(pathname, token, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${apiURL}${pathname}`, { ...options, headers });
  if (!res.ok) throw new Error(`${pathname} -> ${res.status} ${await res.text()}`);
  return res.json();
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function contrastRatio(fg, bg) {
  const srgb = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = (rgb) => 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const login = await api('/api/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@testcaseiq.local', password: 'testcaseiq-demo-24A' })
  });
  const token = login.accessToken;
  const projects = await api('/api/projects', token);
  const allStories = [];
  for (const project of projects) {
    const stories = await api(`/api/projects/${project.id}/stories`, token);
    allStories.push(...stories.map((story) => ({ ...story, projectName: project.name })));
  }
  const story = allStories.find((candidate) => ['REVIEWED', 'TESTS_GENERATED', 'EXPORTED', 'ANALYZED'].includes(candidate.status)) ?? allStories[0];

  const browser = await chromium.launch({ headless: true });

  async function context(options = {}) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
      ...options
    });
    await ctx.addInitScript((authToken) => {
      window.localStorage.setItem('testcaseiq.auth.token', authToken);
    }, token);
    return ctx;
  }

  async function collect(pathname, options = {}) {
    const ctx = await context(options.context ?? {});
    const page = await ctx.newPage();
    if (options.cpu) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpu });
    }
    await page.addInitScript(() => {
      window.__longTasks = [];
      try {
        new PerformanceObserver((list) => {
          window.__longTasks.push(...list.getEntries().map((entry) => ({
            duration: entry.duration,
            startTime: entry.startTime
          })));
        }).observe({ entryTypes: ['longtask'] });
      } catch {
        // Browser does not expose longtask entries in every context.
      }
    });

    const started = Date.now();
    await page.goto(`${baseURL}${pathname}`, { waitUntil: 'domcontentloaded' });
    const loaderVisibleAtDom = await page.locator('.boot-loader')
      .evaluate((el) => getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0.05)
      .catch(() => false);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.locator('main, app-dashboard-page, app-review-board-page, app-story-detail-page, app-export-page')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    const readyMs = Date.now() - started;
    const details = await page.evaluate(() => ({
      readyClass: document.documentElement.classList.contains('app-boot-ready'),
      loaderOpacity: getComputedStyle(document.querySelector('.boot-loader')).opacity,
      loaderVisibility: getComputedStyle(document.querySelector('.boot-loader')).visibility,
      bgClass: document.querySelector('[data-testid="background-scene"]')?.className || '',
      canvasCount: document.querySelectorAll('[data-testid="background-scene"] canvas').length,
      tiltStates: Array.from(document.querySelectorAll('[data-testid="glass-tilt"]')).map((el) => el.getAttribute('data-tilt-state')),
      longTasks: window.__longTasks || [],
      heap: performance.memory ? performance.memory.usedJSHeapSize : null
    }));
    return { ctx, page, readyMs, loaderVisibleAtDom, details };
  }

  async function contrastFor(route, selectors) {
    const ctx = await context();
    const page = await ctx.newPage();
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await page.waitForTimeout(1000);
    const elements = await page.evaluate((selectorList) => {
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
      const parseColor = (color) => {
        colorContext.clearRect(0, 0, 1, 1);
        colorContext.fillStyle = color;
        colorContext.fillRect(0, 0, 1, 1);
        const data = colorContext.getImageData(0, 0, 1, 1).data;
        return [data[0], data[1], data[2]];
      };
      const explicit = selectorList.map((selector) => ({ selector, el: document.querySelector(selector) }));
      const automatic = Array.from(document.querySelectorAll(
        '.hero-panel :is(p,span,h1,h2,h3,a,button), .detail-hero :is(p,span,h1,h2,h3,a,button), .panel :is(p,span,h1,h2,h3,a,button), .metric-card :is(p,span,h1,h2,h3,a,button), .review-master-detail :is(p,span,h1,h2,h3,a,button), .story-shell :is(p,span,h1,h2,h3,a,button), .next-action-card :is(p,span,h1,h2,h3,a,button), .project-card :is(p,span,h1,h2,h3,a,button)'
      )).map((el, index) => ({ selector: `auto:${index}`, el }));
      const seen = new Set();
      return [...explicit, ...automatic].map(({ selector, el }) => {
        if (!el || seen.has(el)) return null;
        seen.add(el);
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!text || rect.width < 4 || rect.height < 4 || style.visibility === 'hidden' || style.display === 'none') return null;
        return {
          selector,
          text: text.slice(0, 60),
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          fg: parseColor(style.color),
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseFloat(style.fontWeight) || 400
        };
      }).filter(Boolean);
    }, selectors);

    await page.evaluate((samples) => {
      samples.forEach((sample, index) => {
        const el = sample.selector.startsWith('auto:')
          ? document.querySelectorAll(
            '.hero-panel :is(p,span,h1,h2,h3,a,button), .detail-hero :is(p,span,h1,h2,h3,a,button), .panel :is(p,span,h1,h2,h3,a,button), .metric-card :is(p,span,h1,h2,h3,a,button), .review-master-detail :is(p,span,h1,h2,h3,a,button), .story-shell :is(p,span,h1,h2,h3,a,button), .next-action-card :is(p,span,h1,h2,h3,a,button), .project-card :is(p,span,h1,h2,h3,a,button)'
          )[Number(sample.selector.slice(5))]
          : document.querySelector(sample.selector);
        if (!el) return;
        el.setAttribute('data-contrast-hidden', String(index));
        el.style.setProperty('color', 'transparent', 'important');
        el.style.setProperty('text-shadow', 'none', 'important');
        el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      });
    }, elements);
    const screenshot = await page.screenshot({ type: 'png' });
    const pixels = await page.evaluate(async ({ dataUrl, samples }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      return samples.map((sample) => {
        const points = [
          [sample.rect.x + Math.min(10, sample.rect.w * 0.2), sample.rect.y + sample.rect.h / 2],
          [sample.rect.x + sample.rect.w / 2, sample.rect.y + sample.rect.h / 2],
          [sample.rect.x + Math.max(1, sample.rect.w - 10), sample.rect.y + sample.rect.h / 2]
        ];
        return points.map(([x, y]) => {
          const data = ctx.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), 1, 1).data;
          return [data[0], data[1], data[2]];
        });
      });
    }, {
      dataUrl: `data:image/png;base64,${screenshot.toString('base64')}`,
      samples: elements
    });

    await ctx.close();
    return elements.map((sample, index) => {
      const ratios = pixels[index].map((pixel) => contrastRatio(sample.fg, pixel));
      return {
        selector: sample.selector,
        text: sample.text,
        fontSize: sample.fontSize,
        fontWeight: sample.fontWeight,
        minRatio: Number(Math.min(...ratios).toFixed(2)),
        requiredRatio: sample.fontSize >= 18.66 || (sample.fontSize >= 14 && sample.fontWeight >= 700) ? 3 : 4.5
      };
    }).sort((a, b) => a.minRatio - b.minRatio).slice(0, 8);
  }

  async function noBackdropCheck() {
    const testBrowser = await chromium.launch({ headless: true, args: ['--disable-blink-features=CSSBackdropFilter'] });
    const ctx = await testBrowser.newContext({ viewport: { width: 1440, height: 960 } });
    await ctx.addInitScript((authToken) => {
      window.localStorage.setItem('testcaseiq.auth.token', authToken);
    }, token);
    const page = await ctx.newPage();
    await page.goto(`${baseURL}/dashboard?bg=fallback`, { waitUntil: 'networkidle', timeout: 20000 }).catch(async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    const result = await page.evaluate(() => {
      const panel = document.querySelector('.next-action-card, .panel, .metric-card');
      const style = panel ? getComputedStyle(panel) : null;
      return {
        supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(1px)'),
        supportsWebkitBackdropFilter: CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
        sampleBackground: style?.backgroundColor ?? '',
        sampleColor: style?.color ?? ''
      };
    });
    await ctx.close();
    await testBrowser.close();
    return result;
  }

  const cold = await collect('/dashboard');
  await cold.page.waitForTimeout(1000);
  const bgSettled = await cold.page.evaluate(() => ({
    bgClass: document.querySelector('[data-testid="background-scene"]')?.className || '',
    canvasCount: document.querySelectorAll('[data-testid="background-scene"] canvas').length,
    loaderOpacity: getComputedStyle(document.querySelector('.boot-loader')).opacity,
    loaderVisibility: getComputedStyle(document.querySelector('.boot-loader')).visibility
  }));
  const noWebgl = await collect('/dashboard?bg=no-webgl');
  const forcedFallback = await collect('/dashboard?bg=fallback');
  const reduced = await collect('/dashboard', { context: { reducedMotion: 'reduce' } });
  const lowEnd = await collect('/dashboard', { context: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } });

  const perf = await collect('/dashboard', { cpu: 4 });
  await perf.page.waitForTimeout(500);
  const fpsStats = await perf.page.evaluate(async () => {
    const frames = [];
    let last = performance.now();
    const start = last;
    return new Promise((resolve) => {
      function step(now) {
        frames.push(now - last);
        last = now;
        if (now - start >= 5000) {
          const avg = 1000 / (frames.reduce((sum, value) => sum + value, 0) / frames.length);
          frames.sort((a, b) => a - b);
          resolve({
            frames: frames.length,
            avgFps: Number(avg.toFixed(1)),
            p95FrameMs: Number((frames[Math.floor(frames.length * 0.95)] || 0).toFixed(1))
          });
        } else {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    });
  });
  await perf.page.mouse.move(220, 240);
  for (let i = 0; i < 40; i += 1) {
    await perf.page.mouse.move(180 + i * 15, 220 + (i % 5) * 28);
  }
  await perf.page.waitForTimeout(500);
  const tiltLongTasks = await perf.page.evaluate(() => (window.__longTasks || []).map((entry) => entry.duration));

  const memCtx = await context();
  const memPage = await memCtx.newPage();
  const memory = [];
  for (let i = 0; i < 10; i += 1) {
    const route = ['/dashboard', '/review-board', '/export', `/stories/${story.id}`][i % 4];
    await memPage.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(async () => {
      await memPage.waitForLoadState('domcontentloaded');
    });
    await memPage.waitForTimeout(300);
    memory.push(await memPage.evaluate(() => ({
      route: location.pathname,
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
      canvasCount: document.querySelectorAll('[data-testid="background-scene"] canvas').length,
      bgClass: document.querySelector('[data-testid="background-scene"]')?.className || ''
    })));
  }

  const contrast = {
    dashboard: await contrastFor('/dashboard?bg=fallback', ['.hero-panel p', '.next-action-card p', '.kpi-chip span', '.project-card p']),
    storyDetail: await contrastFor(`/stories/${story.id}?bg=fallback`, ['.detail-hero p', '.story-sticky-title', '.section-heading p', '.metadata-value']),
    reviewBoard: await contrastFor('/review-board?bg=fallback', ['.hero-panel p', '.review-case-item p', '.review-detail-panel p', '.case-meta-badge'])
  };
  const noBackdrop = await noBackdropCheck();

  await cold.page.screenshot({ path: path.join(outDir, 'dashboard-audit.png'), fullPage: true });
  const storyCtx = await context();
  const storyPage = await storyCtx.newPage();
  await storyPage.goto(`${baseURL}/stories/${story.id}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(async () => storyPage.waitForLoadState('domcontentloaded'));
  await storyPage.screenshot({ path: path.join(outDir, 'story-detail-audit.png'), fullPage: true });
  await storyCtx.close();
  const reviewCtx = await context();
  const reviewPage = await reviewCtx.newPage();
  await reviewPage.goto(`${baseURL}/review-board`, { waitUntil: 'networkidle', timeout: 20000 }).catch(async () => reviewPage.waitForLoadState('domcontentloaded'));
  await reviewPage.screenshot({ path: path.join(outDir, 'review-board-audit.png'), fullPage: true });
  await reviewCtx.close();
  const exportCtx = await context();
  const exportPage = await exportCtx.newPage();
  await exportPage.goto(`${baseURL}/export`, { waitUntil: 'networkidle', timeout: 20000 }).catch(async () => exportPage.waitForLoadState('domcontentloaded'));
  await exportPage.screenshot({ path: path.join(outDir, 'export-hub-audit.png'), fullPage: true });
  await exportCtx.close();

  await cold.ctx.close();
  await noWebgl.ctx.close();
  await forcedFallback.ctx.close();
  await reduced.ctx.close();
  await lowEnd.ctx.close();
  await perf.ctx.close();
  await memCtx.close();
  await browser.close();

  const result = {
    story: { id: story.id, title: story.title, status: story.status },
    cold: { readyMs: cold.readyMs, loaderVisibleAtDom: cold.loaderVisibleAtDom, initial: cold.details, settled: bgSettled },
    noWebgl: { readyMs: noWebgl.readyMs, details: noWebgl.details },
    forcedFallback: { readyMs: forcedFallback.readyMs, details: forcedFallback.details },
    reduced: { readyMs: reduced.readyMs, details: reduced.details },
    lowEnd: { readyMs: lowEnd.readyMs, details: lowEnd.details },
    perf: {
      fpsStats,
      longTasksCount: tiltLongTasks.length,
      maxLongTaskMs: Number((tiltLongTasks.length ? Math.max(...tiltLongTasks) : 0).toFixed(1)),
      medianLongTaskMs: Number((tiltLongTasks.length ? median(tiltLongTasks) : 0).toFixed(1))
    },
    memory,
    contrast,
    noBackdrop,
    screenshotsDir: outDir
  };
  fs.writeFileSync(path.join(outDir, 'measurements.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
