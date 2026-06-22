import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TestSuitePage, TestSuiteSummary } from '../../core/models/test-suite.model';
import { ExportService } from '../../core/services/export.service';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportPageComponent } from './export-page.component';

describe('ExportPageComponent', () => {
  let fixture: ComponentFixture<ExportPageComponent>;
  let testSuiteService: jasmine.SpyObj<TestSuiteService>;
  let exportService: jasmine.SpyObj<ExportService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let objectUrlSpy: jasmine.Spy;
  let revokeUrlSpy: jasmine.Spy;

  beforeEach(async () => {
    testSuiteService = jasmine.createSpyObj<TestSuiteService>('TestSuiteService', ['listSuites']);
    exportService = jasmine.createSpyObj<ExportService>('ExportService', ['exportApprovedTestCases']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);

    testSuiteService.listSuites.and.returnValue(of(pageWithSuites()));
    exportService.exportApprovedTestCases.and.returnValue(of(new HttpResponse({
      body: new Blob(['suite export'], { type: 'text/csv' }),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="approved.csv"' })
    })));
    objectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    revokeUrlSpy = spyOn(URL, 'revokeObjectURL').and.stub();

    await TestBed.configureTestingModule({
      imports: [ExportPageComponent],
      providers: [
        provideRouter([]),
        { provide: TestSuiteService, useValue: testSuiteService },
        { provide: ExportService, useValue: exportService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExportPageComponent);
    fixture.detectChanges();
  });

  it('loads approved suites and renders the export-ready table', () => {
    expect(testSuiteService.listSuites).toHaveBeenCalledOnceWith({ approvedOnly: true }, 0);

    const headers = Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLTableCellElement>)
      .map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Suite name', 'Project', 'Story', 'Approved cases', 'Layer', 'Created']);
    expect(fixture.nativeElement.textContent).toContain('Checkout export suite');
    expect(fixture.nativeElement.textContent).toContain('Commerce');
    expect(fixture.nativeElement.textContent).toContain('Checkout accepts valid card');
    expect(fixture.nativeElement.textContent).toContain('6 / 8');
  });

  it('shows the export-ready empty state when approved suites do not exist', () => {
    testSuiteService.listSuites.and.returnValue(of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
      first: true,
      last: true
    }));

    const nextFixture = TestBed.createComponent(ExportPageComponent);
    nextFixture.detectChanges();

    expect(nextFixture.nativeElement.textContent).toContain('Nothing export-ready');
    expect(nextFixture.nativeElement.textContent).toContain('Approve test cases in the Review Board to unlock export.');
  });

  it('exports the selected suite through the existing export service', () => {
    exportButtonByText('Playwright').click();
    fixture.detectChanges();

    expect(exportService.exportApprovedTestCases).toHaveBeenCalledOnceWith('story-1', 'playwright');
    expect(objectUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:test');
    expect(toastService.show).toHaveBeenCalledWith('Playwright export download started.', 'success');
  });

  it('shows an error toast when an export fails', () => {
    exportService.exportApprovedTestCases.and.returnValue(throwError(() => new Error('backend unavailable')));

    exportButtonByText('Postman').click();
    fixture.detectChanges();

    expect(exportService.exportApprovedTestCases).toHaveBeenCalledWith('story-1', 'postman');
    expect(toastService.show).toHaveBeenCalledWith(
      'The Postman export could not be downloaded. Confirm the backend is running and try again.',
      'error'
    );
  });

  function exportButtonByText(text: string): HTMLButtonElement {
    const button = Array.from(fixture.nativeElement.querySelectorAll('.export-card'))
      .find((candidate) => (candidate as HTMLButtonElement).textContent?.includes(text)) as HTMLButtonElement | undefined;
    if (!button) {
      throw new Error(`Export button not found: ${text}`);
    }
    return button;
  }

  function pageWithSuites(): TestSuitePage {
    return {
      content: [suiteSummary()],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true
    };
  }

  function suiteSummary(): TestSuiteSummary {
    return {
      id: 'suite-1',
      storyId: 'story-1',
      storyTitle: 'Checkout accepts valid card',
      projectId: 'project-1',
      projectName: 'Commerce',
      name: 'Checkout export suite',
      description: null,
      testLayer: 'UI',
      totalCases: 8,
      approvedCases: 6,
      rejectedCases: 0,
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    };
  }
});
