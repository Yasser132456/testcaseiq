import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, StateMessageComponent],
  template: `
    <main class="auth-shell">
      <section class="auth-panel">
        <a class="brand auth-brand" routerLink="/">
          <span class="brand-mark">TQ</span>
          <span>
            <strong>TestCaseIQ</strong>
            <small>QA workspace</small>
          </span>
        </a>

        <div class="auth-copy">
          <h1>Sign in to continue</h1>
          <p>Access traceable AI-assisted QA assets, review workflows, and export tooling.</p>
        </div>

        @if (error()) {
          <app-state-message title="Sign in failed" [message]="error()!" tone="error" />
        }

        <form class="form-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>
            <span>Email</span>
            <input type="email" autocomplete="email" formControlName="email" />
            @if (showError('email')) {
              <small class="field-error">Enter a valid email address.</small>
            }
          </label>

          <label>
            <span>Password</span>
            <input type="password" autocomplete="current-password" formControlName="password" />
            @if (showError('password')) {
              <small class="field-error">Password is required.</small>
            }
          </label>

          <button class="button" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <p class="auth-switch">
          New to this workspace?
          <a routerLink="/register">Create an account</a>
        </p>
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
