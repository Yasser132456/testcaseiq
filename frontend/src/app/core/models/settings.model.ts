export type AiProvider = 'MOCK' | 'OPENAI';
export type GenerationMode = 'STRICT' | 'BALANCED' | 'CREATIVE';

export interface AppSettings {
  activeProvider: AiProvider;
  generationMode: GenerationMode;
  maxTestCasesPerStory: number;
  enableExplainability: boolean;
  enableQualityScoring: boolean;
  requireReviewBeforeExport: boolean;
  enforceAcceptanceCriteriaMapping: boolean;
  enforceAuth: boolean;
}

export interface AppSettingsUpdate {
  activeProvider?: AiProvider;
  generationMode?: GenerationMode;
  maxTestCasesPerStory?: number;
  enableExplainability?: boolean;
  enableQualityScoring?: boolean;
  requireReviewBeforeExport?: boolean;
  enforceAcceptanceCriteriaMapping?: boolean;
}
