import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { BackgroundSceneComponent } from './shared/background/background-scene.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BackgroundSceneComponent, ToastContainerComponent],
  template: `
    <app-background-scene />
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

  constructor() {
    this.authService.loadCurrentUser().subscribe();
  }
}
