import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StoryService } from './story.service';

describe('StoryService', () => {
  let service: StoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(StoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists stories for a project', () => {
    service.listForProject('project-1').subscribe((stories) => {
      expect(stories.length).toBe(1);
      expect(stories[0].title).toBe('Checkout payment');
    });

    const request = http.expectOne('/api/projects/project-1/stories');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'story-1',
        projectId: 'project-1',
        title: 'Checkout payment',
        rawText: 'As a buyer, I can pay by card.',
        type: 'USER_STORY',
        status: 'DRAFT',
        externalReference: null,
        metadataJson: null,
        createdAt: '2026-06-14T00:00:00Z',
        updatedAt: '2026-06-14T00:00:00Z'
      }
    ]);
  });

  it('creates a story under a project', () => {
    service.create('project-1', {
      title: 'Checkout payment',
      rawText: 'As a buyer, I can pay by card.',
      type: 'USER_STORY'
    }).subscribe((story) => {
      expect(story.id).toBe('story-2');
    });

    const request = http.expectOne('/api/projects/project-1/stories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.title).toBe('Checkout payment');
    request.flush({
      id: 'story-2',
      projectId: 'project-1',
      title: 'Checkout payment',
      rawText: 'As a buyer, I can pay by card.',
      type: 'USER_STORY',
      status: 'DRAFT',
      externalReference: null,
      metadataJson: null,
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    });
  });

  it('updates a story', () => {
    service.update('story-1', { status: 'ANALYZED' }).subscribe((story) => {
      expect(story.status).toBe('ANALYZED');
    });

    const request = http.expectOne('/api/stories/story-1');
    expect(request.request.method).toBe('PATCH');
    request.flush({
      id: 'story-1',
      projectId: 'project-1',
      title: 'Checkout payment',
      rawText: 'As a buyer, I can pay by card.',
      type: 'USER_STORY',
      status: 'ANALYZED',
      externalReference: null,
      metadataJson: null,
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    });
  });
});
