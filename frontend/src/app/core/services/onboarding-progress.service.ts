import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type OnboardingMilestone =
  | 'account-created'
  | 'project-created'
  | 'story-created'
  | 'analysis-completed'
  | 'generation-completed'
  | 'first-approval'
  | 'first-export';

export type OnboardingNudge =
  | 'add-first-story'
  | 'analyze-story'
  | 'review-board'
  | 'export-hub';

interface StoredOnboardingProgress {
  completed: Partial<Record<OnboardingMilestone, true>>;
  dismissed: Partial<Record<OnboardingNudge, true>>;
  updatedAt: string;
}

const STORAGE_PREFIX = 'testcaseiq.onboarding';

@Injectable({ providedIn: 'root' })
export class OnboardingProgressService {
  private readonly authService = inject(AuthService);
  private readonly revision = signal(0);

  readonly progressLabel = computed(() => {
    this.revision();
    const completed = this.snapshot().completed;
    const count = [
      'project-created',
      'story-created',
      'analysis-completed',
      'generation-completed',
      'first-approval',
      'first-export'
    ].filter((milestone) => completed[milestone as OnboardingMilestone]).length;
    return `Step ${Math.min(count + 1, 6)} of 6`;
  });

  readonly isFreshAccount = computed(() => this.isComplete('account-created') && !this.isComplete('project-created'));

  complete(milestone: OnboardingMilestone): void {
    const progress = this.snapshot();
    if (progress.completed[milestone]) return;
    this.persist({
      ...progress,
      completed: { ...progress.completed, [milestone]: true }
    });
  }

  dismiss(nudge: OnboardingNudge): void {
    const progress = this.snapshot();
    if (progress.dismissed[nudge]) return;
    this.persist({
      ...progress,
      dismissed: { ...progress.dismissed, [nudge]: true }
    });
  }

  isComplete(milestone: OnboardingMilestone): boolean {
    this.revision();
    return this.snapshot().completed[milestone] === true;
  }

  isDismissed(nudge: OnboardingNudge): boolean {
    this.revision();
    return this.snapshot().dismissed[nudge] === true;
  }

  shouldShowNudge(nudge: OnboardingNudge, condition: boolean): boolean {
    return condition && !this.isDismissed(nudge);
  }

  private snapshot(): StoredOnboardingProgress {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return this.emptyProgress();
      const parsed = JSON.parse(raw) as Partial<StoredOnboardingProgress>;
      return {
        completed: parsed.completed ?? {},
        dismissed: parsed.dismissed ?? {},
        updatedAt: parsed.updatedAt ?? new Date().toISOString()
      };
    } catch {
      return this.emptyProgress();
    }
  }

  private persist(progress: StoredOnboardingProgress): void {
    const next = { ...progress, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(next));
    } catch {
      // Storage can be unavailable; the current page still updates through the revision signal.
    }
    this.revision.update((value) => value + 1);
  }

  private storageKey(): string {
    return `${STORAGE_PREFIX}.${this.userId()}`;
  }

  private userId(): string {
    try {
      return this.authService.currentUser()?.id ?? 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  private emptyProgress(): StoredOnboardingProgress {
    return { completed: {}, dismissed: {}, updatedAt: new Date().toISOString() };
  }
}
