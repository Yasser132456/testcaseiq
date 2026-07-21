import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-state-message',
  standalone: true,
  template: `
    <div
      class="state-message glass-surface glass-surface--2 glass-surface--flat"
      [class.error]="tone === 'error'"
      [class.success]="tone === 'success'"
      [class.warning]="tone === 'warning'"
      [class.info]="tone === 'info'"
      [attr.role]="tone === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="tone === 'error' ? 'assertive' : 'polite'"
    >
      <strong>{{ title }}</strong>
      <p>{{ message }}</p>
    </div>
  `
})
export class StateMessageComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
  @Input() tone: 'neutral' | 'error' | 'success' | 'warning' | 'info' = 'neutral';
}
