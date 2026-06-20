create table audit_events (
    id uuid primary key,
    timestamp timestamptz not null,
    actor_user_id uuid,
    actor_email varchar(180),
    actor_role varchar(64),
    action varchar(100) not null,
    resource_type varchar(100),
    resource_id varchar(255),
    outcome varchar(32) not null,
    summary text,
    request_path varchar(500),
    request_method varchar(16),
    ip_address varchar(64)
);

create index idx_audit_events_timestamp on audit_events (timestamp desc);
create index idx_audit_events_actor_user_id on audit_events (actor_user_id);
create index idx_audit_events_action on audit_events (action);
create index idx_audit_events_outcome on audit_events (outcome);
