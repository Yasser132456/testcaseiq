import { CanDeactivateFn } from '@angular/router';
import type { StoryDetailPageComponent } from '../../pages/stories/story-detail-page.component';
import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const executeGuard: CanDeactivateFn<StoryDetailPageComponent> = (...guardParameters) =>
    unsavedChangesGuard(...guardParameters);

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  const originalConfirm = window.confirm;

  it('allows navigation without prompting when the story form is clean', () => {
    const component = componentWithDirtyState(false);
    window.confirm = jasmine.createSpy('confirm');

    const result = executeGuard(component, {} as never, {} as never, {} as never);

    expect(result).toBeTrue();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('prompts before navigating away from dirty story edits', () => {
    const component = componentWithDirtyState(true);
    window.confirm = jasmine.createSpy('confirm').and.returnValue(false);

    const result = executeGuard(component, {} as never, {} as never, {} as never);

    expect(window.confirm).toHaveBeenCalledOnceWith('You have unsaved changes on this story. Leave without saving?');
    expect(result).toBeFalse();
  });

  it('allows navigation from dirty story edits when the user confirms', () => {
    const component = componentWithDirtyState(true);
    window.confirm = jasmine.createSpy('confirm').and.returnValue(true);

    const result = executeGuard(component, {} as never, {} as never, {} as never);

    expect(result).toBeTrue();
  });

  function componentWithDirtyState(dirty: boolean): StoryDetailPageComponent {
    return { form: { dirty } } as StoryDetailPageComponent;
  }
});
