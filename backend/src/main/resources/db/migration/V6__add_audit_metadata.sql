ALTER TABLE audit_events ADD COLUMN metadata text;
CREATE INDEX idx_audit_events_actor_email ON audit_events (actor_email);
