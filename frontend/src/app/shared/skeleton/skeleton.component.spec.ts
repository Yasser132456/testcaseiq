import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SkeletonComponent] }).compileComponents();
    fixture = TestBed.createComponent(SkeletonComponent);
  });

  it('places every cell on the shared shimmer timeline', () => {
    fixture.componentRef.setInput('rows', 2);
    fixture.componentRef.setInput('cols', 3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.tcq-skeleton-shimmer').length).toBe(6);
  });

  it('preserves the loading status semantics', () => {
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('[role="status"]');

    expect(status.getAttribute('aria-label')).toBe('Loading');
  });
});
