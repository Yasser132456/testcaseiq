import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-register-page',
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
          <h1>Register for TestCaseIQ</h1>
          <p>New accounts are created as QA engineers by the backend and can use the review workspace immediately.</p>
        </div>

        @if (error()) {
          <app-state-message title="Registration failed" [message]="error()!" tone="error" />
        }

        <form class="form-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>
            <span>Display name</span>
            <input type="text" autocomplete="name" formControlName="displayName" />
            @if (showError('displayName')) {
              <small class="field-error">Display name is required.</small>
            }
          </label>

          <label>
            <span>Email</span>
            <input type="email" autocomplete="email" formControlName="email" />
            @if (showError('email')) {
              <small class="field-error">Enter a valid email address.</small>
            }
          </label>

          <label>
            <span>Password</span>
            <input type="password" autocomplete="new-password" formControlName="password" />
            @if (showError('password')) {
              <small class="field-error">Use at least 8 characters.</small>
            }
          </label>

          <button class="button" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating account...' : 'Create account' }}
          </button>
        </form>

        <p class="auth-switch">
          Already have an account?
          <a routerLink="/login">Sign in</a>
        </p>
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
