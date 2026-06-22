import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawerComponent } from './drawer.component';

describe('DrawerComponent', () => {
  let fixture: ComponentFixture<DrawerComponent>;
  let component: DrawerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('title', 'Filters');
    fixture.detectChanges();
  });

  it('renders an open drawer with backdrop and title', () => {
    expect(fixture.nativeElement.querySelector('.drawer-backdrop')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.drawer-panel')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Filters');
  });

  it('requests close on backdrop click', () => {
    spyOn(component.closed, 'emit');

    (fixture.nativeElement.querySelector('.drawer-backdrop') as HTMLElement).click();

    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('requests close on Escape', () => {
    spyOn(component.closed, 'emit');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
