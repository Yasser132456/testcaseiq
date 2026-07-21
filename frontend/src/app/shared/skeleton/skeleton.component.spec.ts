import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotionService } from '../../core/motion/motion.service';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;
  const documentVisible = signal(true);

  beforeEach(async () => {
    documentVisible.set(true);
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
      providers: [{ provide: MotionService, useValue: { documentVisible } }]
    }).compileComponents();
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

  it('pauses its shimmer host while the document is hidden', () => {
    fixture.detectChanges();

    documentVisible.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('is-motion-paused');
  });
});
