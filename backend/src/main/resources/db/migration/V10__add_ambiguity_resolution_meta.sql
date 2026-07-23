ALTER TABLE ambiguities ADD COLUMN resolution_status varchar(32) NOT NULL DEFAULT 'OPEN';
ALTER TABLE ambiguities ADD COLUMN resolved_by varchar(255);
ALTER TABLE ambiguities ADD COLUMN resolved_at timestamptz;
UPDATE ambiguities SET resolution_status = 'ANSWERED' WHERE resolved = true;
