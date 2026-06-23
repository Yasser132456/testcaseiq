import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminUser } from '../../core/models/admin-user.model';
import { UserRole } from '../../core/models/auth.model';
import { AdminUserService } from '../../core/services/admin-user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  QA_ENGINEER: 'QA Engineer',
  VIEWER: 'Viewer'
};

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [DatePipe, StateMessageComponent, SkeletonComponent],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Users</h2>
        <p class="section-subtitle">Manage user accounts and roles. Changes take effect on next login.</p>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="6" />
      } @else if (loadError()) {
        <app-state-message title="Could not load users" [message]="loadError()" tone="error" />
      } @else if (users().length === 0) {
        <app-state-message title="No users found" message="No user accounts exist yet." />
      } @else {
        <div class="panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr [class.row-disabled]="!user.enabled">
                  <td>
                    <span class="user-name">{{ user.displayName }}</span>
                    @if (user.id === currentUserId()) {
                      <span class="badge-you">you</span>
                    }
                  </td>
                  <td class="td-muted">{{ user.email }}</td>
                  <td>
                    <span [class]="roleBadgeClass(user.role)">{{ roleLabel(user.role) }}</span>
                  </td>
                  <td>
                    @if (user.enabled) {
                      <span class="status-active">Active</span>
                    } @else {
                      <span class="status-disabled">Disabled</span>
                    }
                  </td>
                  <td class="td-muted">{{ user.createdAt | date:'mediumDate' }}</td>
                  <td class="action-cell">
                    <select
                      class="role-select"
                      [value]="user.role"
                      [disabled]="busy()"
                      (change)="onRoleChange(user, $any($event.target).value)"
                      [attr.aria-label]="'Change role for ' + user.displayName"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="QA_ENGINEER">QA Engineer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    @if (user.id !== currentUserId()) {
                      <button
                        class="button secondary small"
                        type="button"
                        [disabled]="busy()"
                        (click)="onToggleStatus(user)"
                      >
                        {{ user.enabled ? 'Disable' : 'Enable' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [`
    .section-subtitle { color: var(--color-text-2); margin-top: 0.25rem; font-size: 0.875rem; }
    .data-table tr.row-disabled td { opacity: 0.5; }
    .user-name { font-weight: 600; }
    .badge-you { margin-left: 0.4rem; font-size: 0.7rem; background: var(--color-accent-bg); color: var(--color-accent); border-radius: 4px; padding: 0.1rem 0.35rem; vertical-align: middle; }
    .td-muted { color: var(--color-text-2); }
    .status-active { color: var(--color-green); font-size: 0.8rem; }
    .status-disabled { color: var(--color-text-2); font-size: 0.8rem; }
    .action-cell { display: flex; gap: 0.5rem; align-items: center; }
    .role-select { background: var(--glass-1); color: var(--color-text); border: 1px solid var(--glass-border); border-radius: 4px; padding: 0.25rem 0.4rem; font-size: 0.85rem; cursor: pointer; }
    .role-select:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class AdminUsersPageComponent implements OnInit {
  private readonly adminUserService = inject(AdminUserService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly loadError = signal('');
  readonly currentUserId = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.currentUserId.set(user?.id ?? null);
    this.loadUsers();
  }

  onRoleChange(user: AdminUser, newRole: UserRole): void {
    if (newRole === user.role) return;

    const confirm = window.confirm(
      `Change ${user.displayName}'s role from ${ROLE_LABELS[user.role]} to ${ROLE_LABELS[newRole]}?`
    );
    if (!confirm) {
      this.users.update(list => [...list]);
      return;
    }

    this.busy.set(true);
    this.adminUserService.updateRole(user.id, { role: newRole }).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.toastService.show(`${updated.displayName} is now ${ROLE_LABELS[updated.role]}.`, 'success');
        this.busy.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'The role could not be updated. Please try again.';
        this.toastService.show(msg, 'error');
        this.users.update(list => [...list]);
        this.busy.set(false);
      }
    });
  }

  onToggleStatus(user: AdminUser): void {
    const action = user.enabled ? 'disable' : 'enable';
    const confirm = window.confirm(`Are you sure you want to ${action} ${user.displayName}'s account?`);
    if (!confirm) return;

    this.busy.set(true);
    this.adminUserService.updateStatus(user.id, { enabled: !user.enabled }).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        const label = updated.enabled ? 'enabled' : 'disabled';
        this.toastService.show(`${updated.displayName}'s account has been ${label}.`, 'success');
        this.busy.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'The account status could not be updated. Please try again.';
        this.toastService.show(msg, 'error');
        this.busy.set(false);
      }
    });
  }

  roleBadgeClass(role: UserRole): string {
    if (role === 'VIEWER') return 'role-tag role-viewer';
    if (role === 'QA_ENGINEER') return 'role-tag role-qa';
    return 'role-tag role-admin';
  }

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.adminUserService.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load users. Confirm the backend is running and you have admin access.');
        this.loading.set(false);
      }
    });
  }

}
