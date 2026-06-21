import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SettingsService } from './settings.service';
import { AppSettings, AppSettingsUpdate } from '../models/settings.model';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  const mockSettings: AppSettings = {
    activeProvider: 'MOCK',
    generationMode: 'BALANCED',
    maxTestCasesPerStory: 10,
    enableExplainability: true,
    enableQualityScoring: true,
    requireReviewBeforeExport: false,
    enforceAcceptanceCriteriaMapping: false,
    enforceAuth: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SettingsService]
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getSettings sends GET to /api/settings', () => {
    service.getSettings().subscribe(s => {
      expect(s.activeProvider).toBe('MOCK');
      expect(s.generationMode).toBe('BALANCED');
    });

    const req = httpMock.expectOne('/api/settings');
    expect(req.request.method).toBe('GET');
    req.flush(mockSettings);
  });

  it('updateSettings sends PATCH to /api/settings with payload', () => {
    const update: AppSettingsUpdate = { activeProvider: 'OPENAI', maxTestCasesPerStory: 5 };
    const updated: AppSettings = { ...mockSettings, activeProvider: 'OPENAI', maxTestCasesPerStory: 5 };

    service.updateSettings(update).subscribe(s => {
      expect(s.activeProvider).toBe('OPENAI');
      expect(s.maxTestCasesPerStory).toBe(5);
    });

    const req = httpMock.expectOne('/api/settings');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(update);
    req.flush(updated);
  });
});
