import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { ProjectDetailPageComponent } from './pages/projects/project-detail-page.component';
import { ProjectListPageComponent } from './pages/projects/project-list-page.component';
import { StoryDetailPageComponent } from './pages/stories/story-detail-page.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', component: DashboardPageComponent },
      { path: 'projects', component: ProjectListPageComponent },
      { path: 'projects/:projectId', component: ProjectDetailPageComponent },
      { path: 'stories/:storyId', component: StoryDetailPageComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
