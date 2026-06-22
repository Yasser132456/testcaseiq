import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentRef.setInput('status', 'DRAFT');
    fixture.detectChanges();
  });

  it('adds and removes the flip class when status changes', fakeAsync(() => {
    fixture.componentRef.setInput('status', 'APPROVED');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(badge.classList).toContain('is-flipping');

    tick(350);
    fixture.detectChanges();

    expect(badge.classList).not.toContain('is-flipping');
  }));
});
