import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { BackgroundSceneComponent } from './shared/background/background-scene.component';
import { BackgroundSceneRenderMode, backgroundSceneModeForRoute } from './shared/background/background-scene.service';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BackgroundSceneComponent, ToastContainerComponent],
  template: `
    <app-background-scene [mode]="backgroundMode()" />
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
  private readonly router = inject(Router);
  readonly backgroundMode = signal<BackgroundSceneRenderMode>(backgroundSceneModeForRoute(this.router.url));

  constructor() {
    this.authService.loadCurrentUser().subscribe();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.backgroundMode.set(backgroundSceneModeForRoute(event.urlAfterRedirects || event.url)));
  }
}
