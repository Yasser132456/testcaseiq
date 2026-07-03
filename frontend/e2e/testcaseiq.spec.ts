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
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
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

test.describe('golden path', () => {
  test('turns a story into an approved Playwright export', async ({ page }) => {
    const user = uniqueUser('golden');
    const projectName = `Checkout Coverage ${Date.now()}`;
    const storyTitle = `Buyer completes checkout ${Date.now()}`;

    await registerViaUi(page, user);
    await page.evaluate(() => localStorage.removeItem('testcaseiq.auth.token'));
    await loginViaUi(page, user.email, user.password);

    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    const projectDialog = page.getByRole('dialog', { name: 'New project' });
    await projectDialog.getByLabel('Name').fill(projectName);
    await projectDialog.getByLabel('Description').fill('Regression project for the Playwright dogfood suite.');
    await projectDialog.getByRole('button', { name: 'Create project' }).click();

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await page.getByRole('button', { name: 'Stories' }).click();
    await page.getByRole('button', { name: 'New story' }).click();
    const storyDialog = page.getByRole('dialog', { name: 'New story' });
    await storyDialog.getByLabel('Title').fill(storyTitle);
    await storyDialog.getByLabel('Raw text').fill(storyText(storyTitle));
    await storyDialog.getByRole('button', { name: 'Create story' }).click();

    await expect(page.getByRole('heading', { name: storyTitle })).toBeVisible();
    const storyId = page.url().split('/stories/')[1];
    expect(storyId).toBeTruthy();
    await page.getByRole('button', { name: 'Analyze Story' }).click();
    await expect(page.getByText('Primary user goal')).toBeVisible();

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
