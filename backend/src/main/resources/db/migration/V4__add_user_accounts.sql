create table app_users (
    id uuid primary key,
    display_name varchar(160) not null,
    email varchar(180) not null unique,
    password_hash text not null,
    role varchar(64) not null,
    enabled boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index idx_app_users_email_lower on app_users (lower(email));
