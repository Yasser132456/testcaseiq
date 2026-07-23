import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoverageReportResponse } from '../../core/models/coverage.model';
import { StoryCoverageMatrixComponent } from './story-coverage-matrix.component';

describe('StoryCoverageMatrixComponent', () => {
  let fixture: ComponentFixture<StoryCoverageMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryCoverageMatrixComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryCoverageMatrixComponent);
  });

  it('renders requirement rows, linked case chips, and gaps', () => {
    fixture.componentRef.setInput('report', report());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('REQ-1');
    expect(text).toContain('Payment succeeds');
    expect(text).toContain('Checkout happy path');
    expect(text).toContain('REQ-2');
    expect(text).toContain('Generate targeted case');
    expect(text).toContain('1 of 2 requirements covered');
  });

  it('emits targeted generation guidance for a gap', () => {
    fixture.componentRef.setInput('report', report());
    spyOn(fixture.componentInstance.generateTargetedCase, 'emit');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.coverage-gap-action') as HTMLButtonElement;
    button.click();

    expect(fixture.componentInstance.generateTargetedCase.emit).toHaveBeenCalledWith(
      'Cover requirement REQ-2: Expired cards are declined'
    );
  });

  it('renders an empty state when there are no requirements', () => {
    fixture.componentRef.setInput('report', {
      storyId: 'story-1',
      requirements: [],
      gaps: [],
      coveredCount: 0,
      totalRequirements: 0
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No requirements to trace yet');
  });

  function report(): CoverageReportResponse {
    return {
      storyId: 'story-1',
      requirements: [
        {
          reference: 'REQ-1',
          title: 'Payment succeeds',
          riskLevel: 'HIGH',
          linkedCases: [
            { id: 'case-1', title: 'Checkout happy path', status: 'APPROVED' }
          ],
          covered: true
        },
        {
          reference: 'REQ-2',
          title: 'Expired cards are declined',
          riskLevel: 'CRITICAL',
          linkedCases: [],
          covered: false
        }
      ],
      gaps: [
        {
          key: 'REQ-2',
          description: 'Expired cards are declined',
          riskLevel: 'CRITICAL',
          kind: 'REQUIREMENT'
        }
      ],
      coveredCount: 1,
      totalRequirements: 2
    };
  }
});
