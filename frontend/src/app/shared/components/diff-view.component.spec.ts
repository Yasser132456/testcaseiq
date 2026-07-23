import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiffViewComponent } from './diff-view.component';

describe('DiffViewComponent', () => {
  let fixture: ComponentFixture<DiffViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffViewComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DiffViewComponent);
  });

  it('renders added, removed, and changed step rows', () => {
    fixture.componentRef.setInput('before', {
      title: 'Checkout decline',
      description: 'Old objective',
      expectedResult: 'Given a generic decline',
      steps: [
        { order: 1, action: 'Submit expired card.', expectedResult: 'Generic error appears.' },
        { order: 2, action: 'Retry same card.', expectedResult: 'Generic error remains.' }
      ]
    });
    fixture.componentRef.setInput('after', {
      title: 'Checkout decline revised',
      description: 'New objective',
      expectedResult: 'Given issuer decline guidance',
      steps: [
        { order: 1, action: 'Submit insufficient-funds card.', expectedResult: 'Issuer reason appears.' },
        { order: 3, action: 'Retry with expired card.', expectedResult: 'Expired-card correction appears.' }
      ]
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.diff-row')) as HTMLElement[];

    expect(text).toContain('Title');
    expect(rows.some((row) => row.classList.contains('diff-changed') && row.textContent?.includes('Submit insufficient-funds card.'))).toBeTrue();
    expect(rows.some((row) => row.classList.contains('diff-removed') && row.textContent?.includes('Retry same card.'))).toBeTrue();
    expect(rows.some((row) => row.classList.contains('diff-added') && row.textContent?.includes('Retry with expired card.'))).toBeTrue();
  });
});
