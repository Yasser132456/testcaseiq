import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideBookOpenText } from '@lucide/angular';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Project } from '../../core/models/project.model';
import { STORY_TYPES, Story, StoryType } from '../../core/models/story.model';
import { ProjectService } from '../../core/services/project.service';
import { StoryService } from '../../core/services/story.service';
import { StoryStatusPillComponent } from '../../components/story-status-pill/story-status-pill.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableStaggerDirective } from '../../shared/directives/table-stagger.directive';

type StoryDisplayStatus = 'DRAFT' | 'ANALYZED' | 'TESTS_GENERATED' | 'ALL_REVIEWED';

interface StoryListItem {
  project: Project;
  story: Story;
}

@Component({
  selector: 'app-stories-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    StateMessageComponent,
    EmptyStateComponent,
    SkeletonComponent,
    TableStaggerDirective,
    StoryStatusPillComponent
  ],
  templateUrl: './stories-list-page.component.html',
  styleUrl: './stories-list-page.component.css'
})
export class StoriesListPageComponent implements OnInit {
  readonly LucideBookOpenText = LucideBookOpenText;

  private readonly projectService = inject(ProjectService);
  private readonly storyService = inject(StoryService);
  private readonly router = inject(Router);

  readonly storyTypes = STORY_TYPES;
  readonly storyStatuses: StoryDisplayStatus[] = ['DRAFT', 'ANALYZED', 'TESTS_GENERATED', 'ALL_REVIEWED'];
  readonly projects = signal<Project[]>([]);
  readonly storyItems = signal<StoryListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);
  readonly pageSize = 20;

  projectFilter = '';
  typeFilter: StoryType | '' = '';
  statusFilter: StoryDisplayStatus | '' = '';

  readonly filteredStories = computed(() => this.storyItems().filter(({ project, story }) => {
    if (this.projectFilter && project.id !== this.projectFilter) return false;
    if (this.typeFilter && story.type !== this.typeFilter) return false;
    if (this.statusFilter && this.displayStatus(story) !== this.statusFilter) return false;
    return true;
  }));

  readonly totalPages = computed(() => Math.max(Math.ceil(this.filteredStories().length / this.pageSize), 1));

  readonly pagedStories = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.filteredStories().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(): void {
    this.currentPage.set(0);
  }

  resetFilters(): void {
    this.projectFilter = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.currentPage.set(0);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.max(0, Math.min(this.totalPages() - 1, page)));
  }

  openStory(item: StoryListItem): void {
    void this.router.navigate(['/stories', item.story.id], {
      state: { projectContext: this.projectContextFor(item.project) }
    });
  }

  displayStatus(story: Story): StoryDisplayStatus {
    if (story.status === 'REVIEWED' || story.status === 'EXPORTED') return 'ALL_REVIEWED';
    return story.status;
  }

  formatLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.projectService.list().pipe(
      switchMap((projects) => {
        this.projects.set(projects);
        if (projects.length === 0) return of([]);
        return forkJoin(projects.map((project) => this.storyService.listForProject(project.id).pipe(
          map((stories) => stories.map((story) => ({ project, story }))),
          catchError(() => of([]))
        ))).pipe(map((groups) => groups.flat()));
      })
    ).subscribe({
      next: (items) => {
        this.storyItems.set(items.sort((a, b) => b.story.createdAt.localeCompare(a.story.createdAt)));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load stories. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }

  private projectContextFor(project: Project) {
    const stories = this.storyItems().filter((item) => item.project.id === project.id).map((item) => item.story);
    const reviewed = stories.filter((story) => this.displayStatus(story) === 'ALL_REVIEWED').length;
    return {
      projectId: project.id,
      name: project.name,
      storyCount: stories.length,
      coveragePercent: stories.length === 0 ? 0 : Math.round(reviewed / stories.length * 100)
    };
  }
}
