import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';
import { ProjectListPageComponent } from './project-list-page.component';

describe('ProjectListPageComponent', () => {
  let fixture: ComponentFixture<ProjectListPageComponent>;

  beforeEach(async () => {
    const projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['list', 'create']);
    projectService.list.and.returnValue(of([
      {
        id: 'project-1',
        name: 'Payments',
        key: 'PAY',
        description: null,
        createdAt: '2026-06-10T00:00:00Z',
        updatedAt: '2026-06-20T00:00:00Z',
        storyCount: 3,
        suiteCount: 2,
        coveragePercent: 67
      } as any
    ]));

    await TestBed.configureTestingModule({
      imports: [ProjectListPageComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectService, useValue: projectService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['show']) },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signal(true),
            currentRole: signal('ADMIN')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListPageComponent);
    fixture.detectChanges();
  });

  it('renders projects as card grid entries with coverage, counts, activity, and open action', () => {
    const grid = fixture.nativeElement.querySelector('.project-card-grid') as HTMLElement;
    const card = fixture.nativeElement.querySelector('.project-card') as HTMLElement;

    expect(grid).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.data-table')).toBeNull();
    expect(card).not.toBeNull();
    expect(card.querySelector('.coverage-ring')).not.toBeNull();
    expect(card.textContent).toContain('Payments');
    expect(card.textContent).toContain('3 stories · 2 suites');
    expect(card.textContent).toContain('Last activity');
    expect((card.querySelector('.project-open-link') as HTMLAnchorElement).getAttribute('href')).toBe('/projects/project-1');
  });
});
