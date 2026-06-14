create table projects (
    id uuid primary key,
    name varchar(160) not null,
    project_key varchar(64) not null unique,
    description text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table stories (
    id uuid primary key,
    project_id uuid not null references projects(id) on delete cascade,
    title varchar(240) not null,
    story_text text,
    type varchar(64) not null,
    status varchar(64) not null,
    external_reference varchar(160),
    metadata_json jsonb,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table requirements (
    id uuid primary key,
    story_id uuid not null references stories(id) on delete cascade,
    title varchar(240) not null,
    description text,
    type varchar(64) not null,
    priority varchar(64),
    risk_level varchar(64),
    source_reference varchar(160),
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table ambiguities (
    id uuid primary key,
    story_id uuid not null references stories(id) on delete cascade,
    question text not null,
    context text,
    severity varchar(64) not null,
    resolved boolean not null default false,
    resolution_notes text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table coverage_items (
    id uuid primary key,
    story_id uuid not null references stories(id) on delete cascade,
    requirement_id uuid references requirements(id) on delete set null,
    category varchar(64) not null,
    description text not null,
    risk_level varchar(64),
    covered boolean not null default false,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table test_suites (
    id uuid primary key,
    story_id uuid not null references stories(id) on delete cascade,
    name varchar(180) not null,
    description text,
    test_layer varchar(64),
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table test_cases (
    id uuid primary key,
    test_suite_id uuid not null references test_suites(id) on delete cascade,
    title varchar(240) not null,
    description text,
    type varchar(64) not null,
    test_layer varchar(64),
    priority varchar(64),
    risk_level varchar(64),
    review_status varchar(64) not null,
    preconditions text,
    expected_result text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table test_steps (
    id uuid primary key,
    test_case_id uuid not null references test_cases(id) on delete cascade,
    step_order integer not null,
    action text not null,
    expected_result text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table test_data (
    id uuid primary key,
    test_case_id uuid not null references test_cases(id) on delete cascade,
    name varchar(160) not null,
    data_value_json jsonb,
    notes text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table review_events (
    id uuid primary key,
    test_case_id uuid not null references test_cases(id) on delete cascade,
    status varchar(64) not null,
    reviewer varchar(160),
    comment text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table ai_jobs (
    id uuid primary key,
    story_id uuid not null references stories(id) on delete cascade,
    job_type varchar(120) not null,
    status varchar(64) not null,
    input_payload_json jsonb,
    output_payload_json jsonb,
    error_message text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table export_jobs (
    id uuid primary key,
    story_id uuid not null references stories(id) on delete cascade,
    export_type varchar(120) not null,
    status varchar(64) not null,
    export_details_json jsonb,
    error_message text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table test_case_requirements (
    test_case_id uuid not null references test_cases(id) on delete cascade,
    requirement_id uuid not null references requirements(id) on delete cascade,
    primary key (test_case_id, requirement_id)
);

create index idx_stories_project_id on stories(project_id);
create index idx_requirements_story_id on requirements(story_id);
create index idx_test_suites_story_id on test_suites(story_id);
create index idx_test_cases_test_suite_id on test_cases(test_suite_id);
create index idx_test_steps_test_case_id on test_steps(test_case_id);
create index idx_review_events_test_case_id on review_events(test_case_id);
