import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideBookOpenText } from '@lucide/angular';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    });
    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', LucideBookOpenText);
    fixture.componentRef.setInput('title', 'No stories found');
    fixture.componentRef.setInput('message', 'Try changing filters.');
  });

  it('does not render illustration art by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.es-art')).toBeNull();
  });

  it('renders CSS illustration art when requested', () => {
    fixture.componentRef.setInput('showArt', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.es-art')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.es-ring').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.es-dot').length).toBe(3);
  });
});
