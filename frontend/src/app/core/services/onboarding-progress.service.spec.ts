import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { OnboardingProgressService } from './onboarding-progress.service';

describe('OnboardingProgressService', () => {
  const user = signal({
    id: 'user-1',
    displayName: 'QA User',
    email: 'qa@example.com',
    role: 'QA_ENGINEER' as const
  });

  beforeEach(() => {
    user.set({
      id: 'user-1',
      displayName: 'QA User',
      email: 'qa@example.com',
      role: 'QA_ENGINEER'
    });
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        OnboardingProgressService,
        { provide: AuthService, useValue: { currentUser: user.asReadonly() } }
      ]
    });
  });

  it('persists completed milestones for the current user', () => {
    const service = TestBed.inject(OnboardingProgressService);

    service.complete('project-created');

    expect(service.isComplete('project-created')).toBeTrue();
    expect(localStorage.getItem('testcaseiq.onboarding.user-1')).toContain('project-created');
  });

  it('keeps dismissed nudges scoped to each user', () => {
    const service = TestBed.inject(OnboardingProgressService);

    service.dismiss('add-first-story');
    expect(service.isDismissed('add-first-story')).toBeTrue();

    user.set({
      id: 'user-2',
      displayName: 'Second User',
      email: 'second@example.com',
      role: 'QA_ENGINEER'
    });

    expect(service.isDismissed('add-first-story')).toBeFalse();
  });

  it('shows a nudge only when its condition is true and it has not been dismissed', () => {
    const service = TestBed.inject(OnboardingProgressService);

    expect(service.shouldShowNudge('analyze-story', true)).toBeTrue();
    service.dismiss('analyze-story');

    expect(service.shouldShowNudge('analyze-story', true)).toBeFalse();
    expect(service.shouldShowNudge('review-board', false)).toBeFalse();
  });
});
