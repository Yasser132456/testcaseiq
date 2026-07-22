import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { BackgroundSceneComponent } from './shared/background/background-scene.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

export function usesWelcomeBackground(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return path === '' || path === '/';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BackgroundSceneComponent, ToastContainerComponent],
  template: `
    @if (sharedBackgroundVisible()) {
      <app-background-scene />
    }
    <main class="app-content-layer">
      <router-outlet />
    </main>
    <app-toast-container />
  `,
  styles: [`
    :host {
      position: relative;
      display: block;
      min-height: 100vh;
      isolation: isolate;
    }

    .app-content-layer {
      position: relative;
      z-index: 1;
      min-height: 100vh;
    }

    app-toast-container {
      position: relative;
      z-index: var(--z-toast);
    }
  `]
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly sharedBackgroundVisible = signal(!usesWelcomeBackground(this.initialRouteUrl()));

  constructor() {
    this.authService.loadCurrentUser().subscribe();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.sharedBackgroundVisible.set(
          !usesWelcomeBackground(event.urlAfterRedirects || event.url)
        );
      });
  }

  private initialRouteUrl(): string {
    const location = this.document.defaultView?.location;
    return location
      ? `${location.pathname}${location.search}${location.hash}`
      : this.router.url;
  }
}
