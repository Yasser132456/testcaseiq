import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { TiltDirective } from '../../shared/directives/tilt.directive';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, StateMessageComponent, TiltDirective],
  template: `
    <main class="auth-shell">
      <section class="auth-frame" aria-labelledby="login-title">
        <div class="auth-hero-panel glass-surface glass-surface--1 glass-surface--flat glass-readable-scrim glass-scrim--1">
          <a class="brand auth-brand" routerLink="/">
            <span class="brand-mark">TQ</span>
            <span>
              <strong>TestCaseIQ</strong>
              <small>Black Glass Instrument</small>
            </span>
          </a>

          <div class="auth-copy auth-copy--hero">
            <h1 id="login-title">Open the review cockpit.</h1>
            <p>Return to traceable QA work: story analysis, generated BDD drafts, human approval, and clean exports from one calibrated surface.</p>
          </div>

          <div class="auth-instrument" aria-hidden="true">
            <div class="auth-instrument__rail">
              <span>Analyze</span>
              <strong>Requirements mapped</strong>
            </div>
            <div class="auth-instrument__rail auth-instrument__rail--cyan">
              <span>Generate</span>
              <strong>BDD draft ready</strong>
            </div>
            <div class="auth-instrument__rail auth-instrument__rail--green">
              <span>Review</span>
              <strong>Human gate active</strong>
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
            <p class="auth-kicker">Workspace access</p>
            <h2>Sign in</h2>
            <p>Use your TestCaseIQ credentials to continue.</p>
          </div>

          @if (error()) {
            <app-state-message title="Sign in failed" [message]="error()!" tone="error" />
          }

          <form class="form-panel auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="login-email">
              <span>Email</span>
              <input
                id="login-email"
                type="email"
                autocomplete="email"
                formControlName="email"
                [attr.aria-invalid]="showError('email')"
                [attr.aria-describedby]="showError('email') ? 'login-email-error' : null"
              />
              @if (showError('email')) {
                <small id="login-email-error" class="field-error">Enter a valid email address.</small>
              }
            </label>

            <label for="login-password">
              <span>Password</span>
              <input
                id="login-password"
                type="password"
                autocomplete="current-password"
                formControlName="password"
                [attr.aria-invalid]="showError('password')"
                [attr.aria-describedby]="showError('password') ? 'login-password-error' : null"
              />
              @if (showError('password')) {
                <small id="login-password-error" class="field-error">Please enter your password.</small>
              }
            </label>

            <button class="button auth-submit" type="submit" [disabled]="form.invalid || loading()" [attr.aria-busy]="loading()">
              {{ loading() ? 'Opening workspace...' : 'Sign in' }}
            </button>
          </form>

          <p class="auth-switch">
            New to this workspace?
            <a routerLink="/register">Create an account</a>
          </p>
        </div>
      </section>
    </main>
  `
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.authService.login(this.form.getRawValue()).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        void this.router.navigateByUrl(returnUrl);
      },
      error: () => this.error.set('Check your email and password, then try again.')
    });
  }

  showError(fieldName: 'email' | 'password'): boolean {
    const field = this.form.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }
}
