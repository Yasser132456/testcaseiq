import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AppLayoutComponent } from './layout/app-layout.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { ProjectDetailPageComponent } from './pages/projects/project-detail-page.component';
import { ProjectListPageComponent } from './pages/projects/project-list-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { StoryDetailPageComponent } from './pages/stories/story-detail-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', component: DashboardPageComponent, data: { requiresAuth: true } },
      { path: 'projects', component: ProjectListPageComponent, data: { requiresAuth: true } },
      { path: 'projects/:projectId', component: ProjectDetailPageComponent, data: { requiresAuth: true } },
      { path: 'stories/:storyId', component: StoryDetailPageComponent, data: { requiresAuth: true } }
    ]
  },
  { path: '**', redirectTo: '' }
];
