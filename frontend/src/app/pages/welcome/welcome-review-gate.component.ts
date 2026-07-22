import { Component, computed, effect, inject, signal } from '@angular/core';
import { MotionService } from '../../core/motion/motion.service';

export type ReviewGateState = 'intake' | 'analyzing' | 'drafting' | 'approved';

const REVIEW_GATE_STATES: readonly ReviewGateState[] = ['intake', 'analyzing', 'drafting', 'approved'];
const REVIEW_GATE_DWELL_MS = 2200;

@Component({
  selector: 'app-welcome-review-gate',
  standalone: true,
  templateUrl: './welcome-review-gate.component.html',
  styleUrl: './welcome-review-gate.component.css'
})
export class WelcomeReviewGateComponent {
  private readonly motion = inject(MotionService);
  private cycling = false;

  readonly state = signal<ReviewGateState>('intake');
  readonly phaseLabels: Record<ReviewGateState, string> = {
    intake: 'Story intake',
    analyzing: 'Analyzing intent',
    drafting: 'Drafting BDD',
    approved: 'Review gate active'
  };
  readonly aiState = computed<'analysis' | 'generation' | null>(() => {
    if (this.state() === 'analyzing') {
      return 'analysis';
    }

    return this.state() === 'drafting' ? 'generation' : null;
  });

  private readonly cycleEffect = effect((onCleanup) => {
    const motionEnabled = this.motion.motionEnabled();
    const reducedMotion = this.motion.reducedMotion();
    const documentVisible = this.motion.documentVisible();

    if (reducedMotion || (!motionEnabled && documentVisible)) {
      this.cycling = false;
      this.state.set('approved');
      return;
    }

    if (!documentVisible || !motionEnabled) {
      return;
    }

    if (!this.cycling) {
      this.cycling = true;
      this.state.set('intake');
    }

    const index = REVIEW_GATE_STATES.indexOf(this.state());
    const timer = window.setTimeout(() => {
      this.state.set(REVIEW_GATE_STATES[(index + 1) % REVIEW_GATE_STATES.length]);
    }, REVIEW_GATE_DWELL_MS);

    onCleanup(() => window.clearTimeout(timer));
  });
}
