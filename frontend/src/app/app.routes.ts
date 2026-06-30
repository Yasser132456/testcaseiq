import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { AppLayoutComponent } from './layout/app-layout.component';
import { AdminUsersPageComponent } from './pages/admin/admin-users-page.component';
import { AuditLogPageComponent } from './pages/admin/audit-log-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { ExportPageComponent } from './pages/export/export-page.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { ProjectDetailPageComponent } from './pages/projects/project-detail-page.component';
import { ProjectListPageComponent } from './pages/projects/project-list-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { SettingsPageComponent } from './pages/settings/settings-page.component';
import { StoryDetailPageComponent } from './pages/stories/story-detail-page.component';
import { TestSuitesListPageComponent } from './pages/test-suites/test-suites-list-page.component';
import { TestSuiteDetailPageComponent } from './pages/test-suites/test-suite-detail-page.component';
import { ReviewBoardPageComponent } from './pages/review-board/review-board-page.component';
import { WelcomePageComponent } from './pages/welcome/welcome-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: WelcomePageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardPageComponent, data: { requiresAuth: true } },
      { path: 'projects', component: ProjectListPageComponent, data: { requiresAuth: true } },
      { path: 'projects/:projectId', component: ProjectDetailPageComponent, data: { requiresAuth: true } },
      {
        path: 'stories',
        loadComponent: () => import('./pages/stories/stories-list-page.component')
          .then((m) => m.StoriesListPageComponent),
        data: { requiresAuth: true }
      },
      { path: 'stories/:storyId', component: StoryDetailPageComponent, canDeactivate: [unsavedChangesGuard], data: { requiresAuth: true } },
      { path: 'test-suites', component: TestSuitesListPageComponent, data: { requiresAuth: true } },
      { path: 'test-suites/:id', component: TestSuiteDetailPageComponent, data: { requiresAuth: true } },
      { path: 'review-board', component: ReviewBoardPageComponent, data: { requiresAuth: true } },
      { path: 'export', component: ExportPageComponent, data: { requiresAuth: true } },
      {
        path: 'admin/users',
        component: AdminUsersPageComponent,
        data: { requiresAuth: true, roles: ['ADMIN'] }
      },
      {
        path: 'admin/audit',
        component: AuditLogPageComponent,
        data: { requiresAuth: true, roles: ['ADMIN'] }
      },
      {
        path: 'settings',
        component: SettingsPageComponent,
        data: { requiresAuth: true, roles: ['ADMIN', 'QA_ENGINEER'] }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
