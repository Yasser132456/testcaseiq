import { CanDeactivateFn } from '@angular/router';
import type { StoryDetailPageComponent } from '../../pages/stories/story-detail-page.component';

export const unsavedChangesGuard: CanDeactivateFn<StoryDetailPageComponent> = (component) => {
  if (!component.form.dirty) {
    return true;
  }

  return window.confirm('You have unsaved changes on this story. Leave without saving?');
};
