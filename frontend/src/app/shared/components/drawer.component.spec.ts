import { Component, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RevealDirective } from '../directives/reveal.directive';
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

  it('marks drawer content as staged reveal layers', () => {
    expect(fixture.debugElement.queryAll(By.directive(RevealDirective)).length).toBe(2);
  });

  it('requests close on backdrop click', fakeAsync(() => {
    spyOn(component.closed, 'emit');

    (fixture.nativeElement.querySelector('.drawer-backdrop') as HTMLElement).click();
    tick(250);

    expect(component.closed.emit).toHaveBeenCalled();
  }));

  it('requests close on Escape', fakeAsync(() => {
    spyOn(component.closed, 'emit');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    tick(250);

    expect(component.closed.emit).toHaveBeenCalled();
  }));
});

@Component({
  standalone: true,
  imports: [DrawerComponent],
  template: `
    <button class="drawer-trigger" type="button" (click)="openDrawer()">Open drawer</button>
    <app-drawer [open]="drawerOpen()" title="Filters" (closed)="drawerOpen.set(false)">
      <button class="body-action" type="button">Apply</button>
    </app-drawer>
  `
})
class DrawerHostComponent {
  readonly drawerOpen = signal(false);

  openDrawer(): void {
    this.drawerOpen.set(true);
  }
}

describe('DrawerComponent close animation and focus', () => {
  let fixture: ComponentFixture<DrawerHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DrawerHostComponent);
    fixture.detectChanges();
  });

  it('keeps the drawer visible until the exit animation completes', fakeAsync(() => {
    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();
    tick();

    (fixture.nativeElement.querySelector('.drawer-close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.drawer-panel')).not.toBeNull();

    tick(249);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer-panel')).not.toBeNull();

    tick(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer-panel')).toBeNull();
  }));

  it('focuses drawer body content on open and restores focus to the trigger on Escape', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('.drawer-trigger') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    tick();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.body-action'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger);
    expect(fixture.nativeElement.querySelector('.drawer-panel')).toBeNull();
  }));
});
