import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists projects', () => {
    service.list().subscribe((projects) => {
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('Payments');
    });

    const request = http.expectOne('/api/projects');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'project-1',
        name: 'Payments',
        key: 'payments',
        description: null,
        createdAt: '2026-06-14T00:00:00Z',
        updatedAt: '2026-06-14T00:00:00Z'
      }
    ]);
  });

  it('creates a project', () => {
    service.create({ name: 'Claims', description: 'Claims QA' }).subscribe((project) => {
      expect(project.id).toBe('project-2');
    });

    const request = http.expectOne('/api/projects');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Claims', description: 'Claims QA' });
    request.flush({
      id: 'project-2',
      name: 'Claims',
      key: 'claims',
      description: 'Claims QA',
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    });
  });

  it('deletes a project', () => {
    service.delete('project-3').subscribe((response) => {
      expect(response).toBeNull();
    });

    const request = http.expectOne('/api/projects/project-3');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
