CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_provider VARCHAR(32) NOT NULL DEFAULT 'MOCK',
    generation_mode VARCHAR(32) NOT NULL DEFAULT 'BALANCED',
    max_test_cases_per_story INTEGER NOT NULL DEFAULT 10,
    enable_explainability BOOLEAN NOT NULL DEFAULT true,
    enable_quality_scoring BOOLEAN NOT NULL DEFAULT true,
    require_review_before_export BOOLEAN NOT NULL DEFAULT false,
    enforce_acceptance_criteria_mapping BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (
    active_provider, generation_mode, max_test_cases_per_story,
    enable_explainability, enable_quality_scoring,
    require_review_before_export, enforce_acceptance_criteria_mapping
) VALUES ('MOCK', 'BALANCED', 10, true, true, false, false);
