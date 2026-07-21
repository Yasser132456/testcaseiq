import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService progress lifecycle', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('creates an explicit persistent progress toast', () => {
    const id = service.showProgress('Generating tests...');

    expect(service.toasts()).toEqual([
      jasmine.objectContaining({ id, message: 'Generating tests...', type: 'info', progress: true, exiting: false })
    ]);
  });

  it('settles a progress toast into an ordinary notification', () => {
    const id = service.showProgress('Generating tests...');

    service.settleProgress(id, 'Tests generated.', 'success');

    expect(service.toasts()[0]).toEqual(jasmine.objectContaining({
      id, message: 'Tests generated.', type: 'success', progress: false
    }));
  });
});
