import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('adds a typed toast and auto-marks it for dismissal after four seconds', fakeAsync(() => {
    service.show('AI provider updated', 'success');

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('AI provider updated');
    expect(service.toasts()[0].type).toBe('success');

    tick(4000);

    expect(service.toasts()[0].exiting).toBeTrue();
  }));

  it('removes a toast after dismissal animation completes', () => {
    service.show('Could not save settings', 'error');
    const id = service.toasts()[0].id;

    service.dismiss(id);
    service.remove(id);

    expect(service.toasts()).toEqual([]);
  });
});
