export type StoryType =
  | 'USER_STORY'
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST'
  | 'TECHNICAL_REQUIREMENT'
  | 'BUSINESS_REQUIREMENT'
  | 'API_SPECIFICATION'
  | 'OTHER';

export type StoryStatus =
  | 'DRAFT'
  | 'ANALYZED'
  | 'TESTS_GENERATED'
  | 'REVIEWED'
  | 'EXPORTED';

export interface Story {
  id: string;
  projectId: string;
  title: string;
  rawText: string;
  type: StoryType;
  status: StoryStatus;
  externalReference: string | null;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryCreateRequest {
  title: string;
  rawText: string;
  type: StoryType;
  externalReference?: string | null;
  metadataJson?: string | null;
}

export interface StoryUpdateRequest {
  title?: string;
  rawText?: string;
  type?: StoryType;
  status?: StoryStatus;
  externalReference?: string | null;
  metadataJson?: string | null;
}

export const STORY_TYPES: StoryType[] = [
  'USER_STORY',
  'BUG_REPORT',
  'FEATURE_REQUEST',
  'TECHNICAL_REQUIREMENT',
  'BUSINESS_REQUIREMENT',
  'API_SPECIFICATION',
  'OTHER'
];
