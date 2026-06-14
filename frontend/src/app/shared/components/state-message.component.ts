import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-state-message',
  standalone: true,
  template: `
    <div class="state-message" [class.error]="tone === 'error'">
      <strong>{{ title }}</strong>
      <p>{{ message }}</p>
    </div>
  `
})
export class StateMessageComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
  @Input() tone: 'neutral' | 'error' = 'neutral';
}
