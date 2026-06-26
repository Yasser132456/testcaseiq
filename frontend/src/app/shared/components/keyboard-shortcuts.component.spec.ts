import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardShortcutsComponent } from './keyboard-shortcuts.component';

describe('KeyboardShortcutsComponent', () => {
  let fixture: ComponentFixture<KeyboardShortcutsComponent>;

  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true
    } as MediaQueryList);

    TestBed.configureTestingModule({
      imports: [KeyboardShortcutsComponent]
    });
    fixture = TestBed.createComponent(KeyboardShortcutsComponent);
    fixture.detectChanges();
  });

  it('opens the shortcuts dialog on question mark', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ks-panel')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Keyboard Shortcuts');
  });

  it('ignores question mark while focus is in a form field', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ks-panel')).toBeNull();
    input.remove();
  });

  it('closes the dialog on Escape', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ks-panel')).toBeNull();
  });
});
