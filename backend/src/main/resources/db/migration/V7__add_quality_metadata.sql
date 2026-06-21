ALTER TABLE test_cases ADD COLUMN quality_score INTEGER;
ALTER TABLE test_cases ADD COLUMN confidence_level VARCHAR(16);
ALTER TABLE test_cases ADD COLUMN generation_rationale TEXT;
ALTER TABLE test_cases ADD COLUMN linked_acceptance_criteria_text TEXT;
