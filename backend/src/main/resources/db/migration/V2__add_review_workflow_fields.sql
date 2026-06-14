alter table test_cases
    add column automation_candidate boolean not null default false;

alter table review_events
    add column action_type varchar(120),
    add column previous_value text,
    add column new_value text;
