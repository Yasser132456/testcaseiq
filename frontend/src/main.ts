import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppComponent } from './app/app.component';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { MotionService } from './app/core/motion/motion.service';
import { clearActiveViewTransitionNames } from './app/shared/directives/vt-name.directive';
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withViewTransitions({
      onViewTransitionCreated: ({ transition }) => {
        const motionService = inject(MotionService);
        if (motionService.reducedMotion()) {
          transition.skipTransition();
        }
        void transition.finished.finally(() => clearActiveViewTransitionNames());
      }
    }))
  ]
}).catch((error) => console.error(error));
