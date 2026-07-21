import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<app-button [loading]="loading()" [variant]="variant()">Generate</app-button>`
})
class ButtonHostComponent {
  readonly loading = signal(false);
  readonly variant = signal<'primary' | 'secondary'>('primary');
}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<ButtonHostComponent>;
  let host: ButtonHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ButtonHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(ButtonHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps projected content mounted and exposes three decorative pending dots', () => {
    host.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-content')?.textContent).toContain('Generate');
    expect(fixture.nativeElement.querySelectorAll('.btn-pending-dot').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.btn-pending')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks the native button busy and disabled while pending', () => {
    host.loading.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('retains the requested variant class while pending', () => {
    host.variant.set('secondary');
    host.loading.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.classList).toContain('btn--secondary');
    expect(button.classList).toContain('btn--loading');
  });
});
