import { expect, type APIRequestContext, type Page, type Route } from '@playwright/test';

const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8080';
const QUALITY_EMAIL = 'quality-fixture@testcaseiq.local';
const QUALITY_PASSWORD = 'P@ssw0rd-quality';
const FIXED_TIME = '2026-06-21T09:00:00.000Z';

export const QUALITY_PROJECT_ID = 'project-quality';
export const QUALITY_STORY_ID = 'story-quality';
export const QUALITY_SUITE_ID = 'suite-quality';
export const QUALITY_TEST_CASE_ID = 'case-quality';

const qualityUser = {
  id: 'user-quality',
  displayName: 'Quality Engineer',
  email: QUALITY_EMAIL,
  role: 'QA_ENGINEER'
};

const deterministicAuth = {
  accessToken: 'quality-fixture-token',
  user: qualityUser
};

const qualityProject = {
  id: QUALITY_PROJECT_ID,
  name: 'Checkout Quality',
  key: 'CQ',
  description: 'Deterministic accessibility quality fixture.',
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME
};

const qualityStory = {
  id: QUALITY_STORY_ID,
  projectId: QUALITY_PROJECT_ID,
  title: 'Buyer completes checkout',
  rawText: 'As a buyer, I want to complete checkout so that my order is confirmed.',
  type: 'USER_STORY',
  status: 'READY',
  externalReference: 'CQ-101',
  metadataJson: null,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME
};

const qualityCase = {
  id: QUALITY_TEST_CASE_ID,
  testSuiteId: QUALITY_SUITE_ID,
  title: 'Complete checkout with valid payment',
  objective: 'Confirm a buyer can complete checkout.',
  type: 'FUNCTIONAL',
  testLayer: 'UI',
  priority: 'HIGH',
  riskLevel: 'MEDIUM',
  reviewStatus: 'NEEDS_REVIEW',
  automationCandidate: true,
  qualityScore: 92,
  confidenceLevel: 'HIGH',
  preconditions: 'A buyer has an item in the cart.',
  bddScenario: 'Given a valid cart When checkout completes Then confirmation appears',
  linkedRequirementReferences: ['REQ-1'],
  steps: [{
    id: 'step-quality',
    order: 1,
    action: 'Submit valid payment details',
    expectedResult: 'The order confirmation is displayed'
  }],
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME
};

const qualitySuiteSummary = {
  id: QUALITY_SUITE_ID,
  storyId: QUALITY_STORY_ID,
  storyTitle: qualityStory.title,
  projectId: QUALITY_PROJECT_ID,
  projectName: qualityProject.name,
  name: 'Checkout regression',
  description: 'Stable review-ready checkout coverage.',
  testLayer: 'UI',
  totalCases: 1,
  approvedCases: 0,
  rejectedCases: 0,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME
};

const qualitySuitePage = {
  content: [qualitySuiteSummary],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
  first: true,
  last: true
};

const qualitySuiteDetail = {
  ...qualitySuiteSummary,
  explainabilitySummary: 'Generated from the checkout acceptance criteria.',
  testCases: [qualityCase]
};

const qualityAnalysis = {
  storyId: QUALITY_STORY_ID,
  actor: 'Buyer',
  goal: 'Complete checkout',
  businessValue: 'Orders can be confirmed.',
  confidenceScore: 0.92,
  requirements: {
    requirements: [{
      reference: 'REQ-1',
      title: 'Complete checkout',
      description: 'The buyer completes checkout with valid payment details.',
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
      description: 'Cover successful checkout.',
      riskLevel: 'MEDIUM'
    }]
  },
  qaValidation: { requirementQualityScore: 0.9, testabilityScore: 0.94, warnings: [] },
  provider: 'mock',
  generatedAt: FIXED_TIME
};

const dashboardMetrics = {
  totalProjects: 1,
  totalStories: 1,
  storiesWithGeneratedTests: 1,
  storiesWithoutGeneratedTests: 0,
  totalTestSuites: 1,
  totalTestCases: 1,
  approvedTestCases: 0,
  rejectedTestCases: 0,
  pendingReviewTestCases: 1,
  draftTestCases: 0,
  totalExports: 0,
  approvalRate: 0,
  rejectionRate: 0,
  pendingReviewRate: 100,
  exportReadinessRate: 0,
  recentProjects: [qualityProject],
  recentActivity: [{
    occurredAt: FIXED_TIME,
    eventType: 'TEST_GENERATION_REQUESTED',
    actorEmail: QUALITY_EMAIL,
    actorRole: 'QA_ENGINEER',
    entityType: 'STORY',
    outcome: 'SUCCESS',
    summary: 'Checkout tests generated'
  }]
};

const appSettings = {
  activeProvider: 'MOCK',
  generationMode: 'BALANCED',
  maxTestCasesPerStory: 10,
  enableExplainability: true,
  enableQualityScoring: true,
  requireReviewBeforeExport: true,
  enforceAcceptanceCriteriaMapping: true,
  enforceAuth: true
};

type AuthResponse = {
  accessToken: string;
  user: typeof qualityUser;
};

export async function installDeterministicApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/auth/register' || path === '/api/auth/login') {
      return fulfillJson(route, deterministicAuth);
    }
    if (path === '/api/auth/me') return fulfillJson(route, qualityUser);
    if (path === '/api/dashboard/metrics') return fulfillJson(route, dashboardMetrics);
    if (path === '/api/projects') return fulfillJson(route, [qualityProject]);
    if (path === `/api/projects/${QUALITY_PROJECT_ID}/stories`) return fulfillJson(route, [qualityStory]);
    if (path === `/api/stories/${QUALITY_STORY_ID}`) return fulfillJson(route, qualityStory);
    if (path === `/api/stories/${QUALITY_STORY_ID}/analysis`) return fulfillJson(route, qualityAnalysis);
    if (path === `/api/stories/${QUALITY_STORY_ID}/test-suites`) {
      return fulfillJson(route, [{
        id: QUALITY_SUITE_ID,
        storyId: QUALITY_STORY_ID,
        suiteName: qualitySuiteSummary.name,
        testCases: [qualityCase],
        qaValidation: { requirementQualityScore: 0.9, testabilityScore: 0.94, warnings: [] },
        provider: 'mock',
        generatedAt: FIXED_TIME,
        explainabilitySummary: qualitySuiteDetail.explainabilitySummary
      }]);
    }
    if (path === '/api/test-suites') return fulfillJson(route, qualitySuitePage);
    if (path === `/api/test-suites/${QUALITY_SUITE_ID}`) return fulfillJson(route, qualitySuiteDetail);
    if (path === '/api/settings') return fulfillJson(route, appSettings);
    if (path === '/api/notifications/unread-count') return fulfillJson(route, { count: 1 });
    if (path === '/api/notifications') {
      return fulfillJson(route, [{
        id: 'notification-quality',
        message: 'Checkout tests are ready for review.',
        type: 'TESTS_GENERATED',
        read: false,
        createdAt: FIXED_TIME
      }]);
    }
    if (path === '/api/search') {
      return fulfillJson(route, {
        projects: [{ id: QUALITY_PROJECT_ID, name: qualityProject.name, type: 'PROJECT' }],
        stories: [{ id: QUALITY_STORY_ID, title: qualityStory.title, type: 'STORY' }],
        testSuites: [{ id: QUALITY_SUITE_ID, name: qualitySuiteSummary.name, type: 'TEST_SUITE' }],
        testCases: [{
          id: QUALITY_TEST_CASE_ID,
          storyId: QUALITY_STORY_ID,
          title: qualityCase.title,
          type: 'TEST_CASE'
        }]
      });
    }

    return fulfillJson(route, {});
  });
}

export async function authenticateQualityUser(
  page: Page,
  request: APIRequestContext
): Promise<AuthResponse> {
  const credentials = {
    displayName: qualityUser.displayName,
    email: QUALITY_EMAIL,
    password: QUALITY_PASSWORD
  };
  let auth: AuthResponse;
  try {
    const registration = await request.post(`${API_BASE_URL}/api/auth/register`, {
      data: credentials,
      timeout: 3_000
    });
    const response = registration.ok()
      ? registration
      : await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email: QUALITY_EMAIL, password: QUALITY_PASSWORD },
        timeout: 3_000
      });

    if (!response.ok()) {
      expect(response.ok(), await response.text()).toBeTruthy();
    }
    auth = await response.json() as AuthResponse;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (!/(ECONNREFUSED|ECONNRESET|ETIMEDOUT|Timeout|connect)/i.test(detail)) {
      throw error;
    }
    await page.goto('/');
    auth = await page.evaluate(async (body) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`Quality user registration failed with ${response.status}`);
      return response.json() as Promise<AuthResponse>;
    }, credentials);
  }
  await page.addInitScript((token) => {
    localStorage.setItem('testcaseiq.auth.token', token);
  }, auth.accessToken);
  return auth;
}

export async function gotoStable(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

function fulfillJson(route: Route, json: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    json
  });
}
