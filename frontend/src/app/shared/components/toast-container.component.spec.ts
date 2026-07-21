import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/services/toast.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastContainerComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastContainerComponent);
    toastService = TestBed.inject(ToastService);
  });

  it('renders an indeterminate shimmer only for progress toasts', () => {
    toastService.show('Saved.', 'success');
    toastService.showProgress('Analyzing...');
    fixture.detectChanges();

    const toasts = Array.from(fixture.nativeElement.querySelectorAll('.toast')) as HTMLElement[];
    expect(toasts[0].querySelector('.toast-progress')).toBeNull();
    expect(toasts[1].classList).toContain('toast--progress');
    expect(toasts[1].querySelector('.toast-progress')).not.toBeNull();
    expect(toasts[1].getAttribute('role')).toBe('status');
    expect(toasts[1].getAttribute('aria-busy')).toBe('true');
  });
});
