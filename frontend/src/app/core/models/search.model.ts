export type SearchResultType = 'PROJECT' | 'STORY' | 'TEST_SUITE' | 'TEST_CASE';

export interface ProjectSearchResult {
  id: string;
  name: string;
  type: 'PROJECT';
}

export interface StorySearchResult {
  id: string;
  title: string;
  type: 'STORY';
}

export interface TestSuiteSearchResult {
  id: string;
  name: string;
  type: 'TEST_SUITE';
}

export interface TestCaseSearchResult {
  id: string;
  storyId?: string;
  title: string;
  type: 'TEST_CASE';
}

export interface SearchResultsResponse {
  projects: ProjectSearchResult[];
  stories: StorySearchResult[];
  testSuites: TestSuiteSearchResult[];
  testCases: TestCaseSearchResult[];
}

export interface RecentSearchItem {
  id: string;
  label: string;
  type: SearchResultType;
  route: string;
}
