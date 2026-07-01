import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { TiltDirective } from '../../shared/directives/tilt.directive';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, StateMessageComponent, TiltDirective],
  template: `
    <main class="auth-shell">
      <section class="auth-frame auth-frame--register" aria-labelledby="register-title">
        <div class="auth-hero-panel glass-surface glass-surface--1 glass-surface--flat glass-readable-scrim glass-scrim--1">
          <a class="brand auth-brand" routerLink="/">
            <span class="brand-mark">TQ</span>
            <span>
              <strong>TestCaseIQ</strong>
              <small>Black Glass Instrument</small>
            </span>
          </a>

          <div class="auth-copy auth-copy--hero">
            <h1 id="register-title">Start with the review gate intact.</h1>
            <p>Create a QA engineer workspace and move from raw requirements to approved, exportable test assets without losing traceability.</p>
          </div>

          <div class="auth-sequence" aria-hidden="true">
            <div>
              <span>01</span>
              <strong>Paste story</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Inspect draft</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Approve suite</strong>
            </div>
          </div>
        </div>

        <div
          class="auth-panel glass-surface glass-surface--3 glass-scrim glass-scrim--3"
          glassTilt
          [glassTiltGlare]="true"
          [glassTiltMaxDeg]="3"
          [glassTiltMaxGlare]="0.05"
        >
          <div class="auth-copy">
            <p class="auth-kicker">New workspace</p>
            <h2>Create account</h2>
            <p>New accounts start as QA engineers and can use the review workspace immediately.</p>
          </div>

          @if (error()) {
            <app-state-message title="Registration failed" [message]="error()!" tone="error" />
          }

          <form class="form-panel auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="register-display-name">
              <span>Display name</span>
              <input
                id="register-display-name"
                type="text"
                autocomplete="name"
                formControlName="displayName"
                [attr.aria-invalid]="showError('displayName')"
                [attr.aria-describedby]="showError('displayName') ? 'register-display-name-error' : null"
              />
              @if (showError('displayName')) {
                <small id="register-display-name-error" class="field-error">Please enter your display name.</small>
              }
            </label>

            <label for="register-email">
              <span>Email</span>
              <input
                id="register-email"
                type="email"
                autocomplete="email"
                formControlName="email"
                [attr.aria-invalid]="showError('email')"
                [attr.aria-describedby]="showError('email') ? 'register-email-error' : null"
              />
              @if (showError('email')) {
                <small id="register-email-error" class="field-error">Enter a valid email address.</small>
              }
            </label>

            <label for="register-password">
              <span>Password</span>
              <input
                id="register-password"
                type="password"
                autocomplete="new-password"
                formControlName="password"
                [attr.aria-invalid]="showError('password')"
                [attr.aria-describedby]="showError('password') ? 'register-password-error' : null"
              />
              @if (showError('password')) {
                <small id="register-password-error" class="field-error">Use at least 8 characters.</small>
              }
            </label>

            <button class="button auth-submit" type="submit" [disabled]="form.invalid || loading()" [attr.aria-busy]="loading()">
              {{ loading() ? 'Creating account...' : 'Create account' }}
            </button>
          </form>

          <p class="auth-switch">
            Already have an account?
            <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </section>
    </main>
  `
})
export class RegisterPageComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.authService.register(this.form.getRawValue()).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => this.error.set('Unable to create the account. The email may already be registered.')
    });
  }

  showError(fieldName: 'displayName' | 'email' | 'password'): boolean {
    const field = this.form.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }
}
