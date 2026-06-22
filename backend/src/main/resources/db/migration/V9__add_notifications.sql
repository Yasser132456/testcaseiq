create table notifications (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    message text not null,
    type varchar(64) not null,
    read boolean not null default false,
    created_at timestamptz not null
);

create index idx_notifications_user_created_at on notifications(user_id, created_at desc);
create index idx_notifications_user_unread on notifications(user_id) where read = false;
