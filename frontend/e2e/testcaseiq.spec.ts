import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8080';
const PASSWORD = 'P@ssw0rd-e2e';

type TestUser = {
  displayName: string;
  email: string;
  password: string;
};

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    role: string;
  };
};

async function registerViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Display name').fill(user.displayName);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function loginViaUi(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

async function registerViaApi(request: APIRequestContext, suffix: string): Promise<AuthResponse> {
  const user = uniqueUser(suffix);
  const response = await request.post(`${API_BASE_URL}/api/auth/register`, {
    data: user
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<AuthResponse>;
}

async function loginViaApi(page: Page, auth: AuthResponse): Promise<void> {
  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('testcaseiq.auth.token', token), auth.accessToken);
}

async function markFreshAccountForOnboarding(page: Page, userId: string): Promise<void> {
  await page.evaluate((id) => {
    localStorage.setItem(`testcaseiq.onboarding.${id}`, JSON.stringify({
      completed: { 'account-created': true },
      dismissed: {},
      updatedAt: new Date().toISOString()
    }));
  }, userId);
}

async function createProjectViaApi(request: APIRequestContext, token: string, name: string): Promise<{ id: string }> {
  const response = await request.post(`${API_BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'Created by the Playwright regression suite.'
    }
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

async function createStoryViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title: string
): Promise<{ id: string }> {
  const response = await request.post(`${API_BASE_URL}/api/projects/${projectId}/stories`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      rawText: storyText(title),
      type: 'USER_STORY'
    }
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

function uniqueUser(suffix: string): TestUser {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    displayName: `E2E ${suffix}`,
    email: `e2e-${suffix}-${runId}@testcaseiq.local`,
    password: PASSWORD
  };
}

function storyText(title: string): string {
  return [
    `As a QA engineer, I want ${title.toLowerCase()} so that approved coverage can be exported.`,
    'Given a story has acceptance criteria',
    'When I analyze and generate tests',
    'Then the resulting cases are reviewable and exportable'
  ].join('\n');
}

function fakeAnalysis(storyId: string) {
  return {
    storyId,
    actor: 'QA engineer',
    goal: 'Primary user goal',
    businessValue: 'Approved coverage can be exported.',
    confidenceScore: 0.91,
    requirements: {
      requirements: [{
        reference: 'REQ-1',
        title: 'Checkout completes successfully',
        description: 'The buyer can complete checkout with valid payment details.',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        riskLevel: 'MEDIUM'
      }],
      acceptanceCriteria: ['Given a valid cart, when checkout completes, then an order confirmation appears.']
    },
    ambiguities: { ambiguities: [] },
    coveragePlan: {
      coverageItems: [{
        requirementReference: 'REQ-1',
        category: 'HAPPY_PATH',
        description: 'Cover successful checkout with valid payment.',
        riskLevel: 'MEDIUM'
      }]
    },
    qaValidation: { requirementQualityScore: 0.86, testabilityScore: 0.91, warnings: [] },
    provider: 'mock',
    generatedAt: new Date().toISOString()
  };
}

function fakeGeneratedSuite(storyId: string) {
  return {
    id: 'suite-e2e',
    storyId,
    suiteName: 'Mock AI Regression Suite',
    provider: 'mock',
    generatedAt: new Date().toISOString(),
    explainabilitySummary: 'Generated from the story acceptance criteria.',
    qaValidation: { requirementQualityScore: 0.86, testabilityScore: 0.91, warnings: [] },
    testCases: [{
      id: 'tc-e2e',
      title: 'Complete primary workflow successfully',
      description: 'Validates the primary checkout path.',
      objective: 'Confirm checkout succeeds.',
      type: 'FUNCTIONAL',
      testLayer: 'UI',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      automationCandidate: true,
      confidenceScore: 0.9,
      reviewStatus: 'NEEDS_REVIEW',
      linkedRequirementReferences: ['REQ-1'],
      preconditions: 'A buyer has an active cart.',
      bddScenario: 'Given a cart When checkout completes Then confirmation appears',
      steps: [{ id: 'step-e2e', order: 1, action: 'Complete checkout', expectedResult: 'Order confirmation appears' }],
      testData: [],
      qualityScore: 88,
      confidenceLevel: 'HIGH'
    }]
  };
}

function fakeSuitePage(project: { id: string }, story: { id: string }, projectName: string, storyTitle: string, approved: boolean) {
  return {
    content: [{
      id: 'suite-e2e',
      storyId: story.id,
      storyTitle,
      projectId: project.id,
      projectName,
      name: 'Mock AI Regression Suite',
      description: null,
      testLayer: 'UI',
      totalCases: 1,
      approvedCases: approved ? 1 : 0,
      rejectedCases: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true
  };
}

test.describe('golden path', () => {
  test('turns a story into an approved Playwright export', async ({ page, request }) => {
    const auth = await registerViaApi(request, 'golden');
    const projectName = `Checkout Coverage ${Date.now()}`;
    const storyTitle = `Buyer completes checkout ${Date.now()}`;

    await loginViaApi(page, auth);
    const project = await createProjectViaApi(request, auth.accessToken, projectName);

    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    const story = await createStoryViaApi(request, auth.accessToken, project.id, storyTitle);
    let approved = false;
    let analysisGenerated = false;
    let testsGenerated = false;
    await page.route(`**/api/stories/${story.id}/analysis`, (route) => {
      if (route.request().method() === 'GET' && !analysisGenerated) {
        return route.fulfill({ status: 404, json: { message: 'Analysis not generated yet.' } });
      }
      analysisGenerated = true;
      return route.fulfill({ json: fakeAnalysis(story.id) });
    });
    await page.route(`**/api/stories/${story.id}/analyze`, (route) => {
      analysisGenerated = true;
      return route.fulfill({ json: fakeAnalysis(story.id) });
    });
    await page.route(`**/api/stories/${story.id}/generate-tests`, (route) => {
      testsGenerated = true;
      return route.fulfill({ json: fakeGeneratedSuite(story.id) });
    });
    await page.route(`**/api/stories/${story.id}/test-suites`, (route) => route.fulfill({ json: testsGenerated ? [fakeGeneratedSuite(story.id)] : [] }));
    await page.route('**/api/test-suites?*', (route) => route.fulfill({ json: fakeSuitePage(project, story, projectName, storyTitle, approved) }));
    await page.route('**/api/test-suites/suite-e2e', (route) => route.fulfill({
      json: {
        ...fakeSuitePage(project, story, projectName, storyTitle, approved).content[0],
        explainabilitySummary: 'Generated from the story acceptance criteria.',
        testCases: [{
          id: 'tc-e2e',
          title: 'Complete primary workflow successfully',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          reviewStatus: approved ? 'APPROVED' : 'NEEDS_REVIEW',
          automationCandidate: true,
          qualityScore: 88,
          confidenceLevel: 'HIGH'
        }]
      }
    }));
    await page.route('**/api/test-cases/tc-e2e/review-status', (route) => {
      approved = true;
      return route.fulfill({
        json: {
          id: 'tc-e2e',
          title: 'Complete primary workflow successfully',
          objective: 'Confirm checkout succeeds.',
          type: 'FUNCTIONAL',
          testLayer: 'UI',
          priority: 'HIGH',
          riskLevel: 'MEDIUM',
          reviewStatus: 'APPROVED',
          automationCandidate: true,
          preconditions: 'A buyer has an active cart.',
          bddScenario: 'Given a cart When checkout completes Then confirmation appears',
          linkedRequirementReferences: ['REQ-1'],
          steps: [{ id: 'step-e2e', order: 1, action: 'Complete checkout', expectedResult: 'Order confirmation appears' }]
        }
      });
    });
    await page.route(`**/api/stories/${story.id}/exports/playwright`, (route) => route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/plain',
        'content-disposition': 'attachment; filename="approved-test-cases.spec.ts"'
      },
      body: 'import { test } from "@playwright/test";\n'
    }));

    await page.goto(`/stories/${story.id}`);
    await expect(page.getByRole('heading', { name: storyTitle })).toBeVisible();
    const storyId = story.id;
    expect(storyId).toBeTruthy();
    await page.getByRole('button', { name: 'Analyze Story' }).click();
    await expect(page.getByText(/Generated/)).toBeVisible();

    await page.getByRole('button', { name: /^Test Cases/ }).click();
    await page.getByRole('button', { name: 'Generate Test Cases' }).click();
    await expect(page.getByText('Mock AI Regression Suite')).toBeVisible();
    await expect(page.getByText('Complete primary workflow successfully')).toBeVisible();

    await page.getByRole('link', { name: 'Review Board' }).last().click();
    await expect(page.getByRole('heading', { name: 'Review Board' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: storyTitle }).first().click();
    const approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    await expect(page.getByText('Test case approved.')).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Export Hub' })
      .click();
    await expect(page.getByRole('heading', { name: 'Export Hub' })).toBeVisible();
    const exportRow = page.getByRole('row').filter({ hasText: storyTitle });
    await expect(exportRow).toBeVisible();
    await exportRow.getByText('Mock AI Regression Suite').click();

    const exportResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/stories/${storyId}/exports/playwright`) && response.status() === 200
    );
    await page.getByRole('button', { name: /Playwright/ }).click({ force: true });
    const exportResponse = await exportResponsePromise;

    expect(exportResponse.headers()['content-disposition'] ?? '').toMatch(/approved-test-cases\.spec\.ts/);
    await expect(page.getByText(/exported as Playwright/)).toBeVisible();
  });
});

test.describe('first-run activation', () => {
  test('fresh user sees the getting-started dashboard and first nudge chain step', async ({ page, request }) => {
    const auth = await registerViaApi(request, 'activation');
    const projectName = `Activation ${Date.now()}`;

    await loginViaApi(page, auth);
    await markFreshAccountForOnboarding(page, auth.user.id);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Create your first project' })).toBeVisible();
    const workflowPreview = page.getByRole('list', { name: 'First workflow preview' });
    await expect(workflowPreview.getByText('Analyze', { exact: true })).toBeVisible();
    await expect(workflowPreview.getByText('Generate', { exact: true })).toBeVisible();
    await expect(workflowPreview.getByText('Review', { exact: true })).toBeVisible();
    await expect(workflowPreview.getByText('Export', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Create your first project' }).click();
    const projectDialog = page.getByRole('dialog', { name: 'New project' });
    await expect(projectDialog).toBeVisible();

    const project = await createProjectViaApi(request, auth.accessToken, projectName);
    await page.evaluate((userId) => {
      const key = `testcaseiq.onboarding.${userId}`;
      const progress = JSON.parse(localStorage.getItem(key) ?? '{"completed":{},"dismissed":{}}');
      localStorage.setItem(key, JSON.stringify({
        ...progress,
        completed: { ...(progress.completed ?? {}), 'account-created': true, 'project-created': true },
        updatedAt: new Date().toISOString()
      }));
    }, auth.user.id);

    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await expect(page.getByText('Add the first story')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add first story' })).toBeVisible();
  });
});

test.describe('guards', () => {
  test('bad credentials show an inline error and protected routes redirect to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(`missing-${Date.now()}@testcaseiq.local`);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Check your email and password');

    await page.evaluate(() => localStorage.removeItem('testcaseiq.auth.token'));
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fprojects$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('unsaved story edits block navigation until the user confirms', async ({ page, request }) => {
    const auth = await registerViaApi(request, 'unsaved');
    const project = await createProjectViaApi(request, auth.accessToken, `Unsaved Guard ${Date.now()}`);
    const story = await createStoryViaApi(request, auth.accessToken, project.id, `Unsaved form guard ${Date.now()}`);

    await loginViaApi(page, auth);
    await page.goto(`/stories/${story.id}`);
    await expect(page.getByRole('heading', { name: /Unsaved form guard/ })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Title').fill(`Edited ${Date.now()}`);
    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' });

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('You have unsaved changes');
      await dialog.dismiss();
    });
    await primaryNavigation.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(new RegExp(`/stories/${story.id}$`));

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('You have unsaved changes');
      await dialog.accept();
    });
    await primaryNavigation.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('dashboard renders with reduced motion and tilt disabled', async ({ page, request }) => {
    const auth = await registerViaApi(request, 'motion');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loginViaApi(page, auth);

    await page.goto('/dashboard');
    await expect(page.getByText('NEXT ACTION')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Dashboard totals' })).toBeVisible();
    await expect(page.getByTestId('glass-tilt').first()).toHaveAttribute('data-tilt-state', 'reduced-motion');
    await expect(page.getByTestId('background-scene')).toHaveClass(/is-static/);
  });
});

test.describe('utility overlays', () => {
  test('search focus continuity survives tabbing and Escape', async ({ page, request }) => {
    const auth = await registerViaApi(request, 'search-focus');
    await loginViaApi(page, auth);
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: 'Open search' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Global search' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeFocused();

    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press('Tab');
      await expect.poll(() => page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLElement && Boolean(active.closest('[aria-label="Global search"]'));
      })).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('reduced motion overlays open in static states', async ({ page, request }) => {
    const auth = await registerViaApi(request, 'overlay-motion');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loginViaApi(page, auth);
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Open search' }).click();
    const search = page.getByRole('dialog', { name: 'Global search' });
    await expect(search).toBeVisible();
    await expect(search).toHaveCSS('animation-name', 'none');
    await page.keyboard.press('Escape');

    await page.keyboard.press('?');
    const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(shortcuts).toBeVisible();
    await expect(shortcuts).toHaveCSS('animation-name', 'none');
    await page.keyboard.press('Escape');
    await expect(shortcuts).toBeHidden();
  });
});
