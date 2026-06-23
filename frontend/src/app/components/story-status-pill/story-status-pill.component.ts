import { Component, Input } from '@angular/core';

type StoryStatusPillState = 'DRAFT' | 'IN_REVIEW' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';

const STATUS_LABELS: Record<StoryStatusPillState, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  NEEDS_REVIEW: 'Needs Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

@Component({
  selector: 'app-story-status-pill',
  standalone: true,
  template: `
    <span
      class="status-pill-shell"
      [class.status-pill-shell--needs-review]="displayStatus === 'NEEDS_REVIEW'"
    >
      <span
        class="status-pill"
        [class.status-pill--draft]="displayStatus === 'DRAFT'"
        [class.status-pill--in-review]="displayStatus === 'IN_REVIEW'"
        [class.status-pill--needs-review]="displayStatus === 'NEEDS_REVIEW'"
        [class.status-pill--approved]="displayStatus === 'APPROVED'"
        [class.status-pill--rejected]="displayStatus === 'REJECTED'"
      >
        {{ label }}
      </span>
    </span>
  `,
  styleUrl: './story-status-pill.component.css'
})
export class StoryStatusPillComponent {
  @Input() status = 'DRAFT';

  get displayStatus(): StoryStatusPillState {
    if (this.status === 'NEEDS_REVIEW') return 'NEEDS_REVIEW';
    if (this.status === 'APPROVED' || this.status === 'REVIEWED' || this.status === 'EXPORTED' || this.status === 'ALL_REVIEWED') {
      return 'APPROVED';
    }
    if (this.status === 'REJECTED') return 'REJECTED';
    if (this.status === 'IN_REVIEW' || this.status === 'ANALYZED' || this.status === 'TESTS_GENERATED') return 'IN_REVIEW';
    return 'DRAFT';
  }

  get label(): string {
    return STATUS_LABELS[this.displayStatus];
  }
}
