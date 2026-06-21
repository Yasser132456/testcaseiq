import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { AppSettings, AppSettingsUpdate, AiProvider, GenerationMode } from '../../core/models/settings.model';
import { StateMessageComponent } from '../../shared/components/state-message.component';

type SettingsTab = 'ai' | 'qa' | 'system';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, StateMessageComponent],
  template: `
    <section class="page-stack">
      <div class="page-header">
        <h2>Settings</h2>
        <p class="muted-text">Configure AI provider behaviour, QA rules, and system options.</p>
      </div>

      @if (!canViewSettings()) {
        <app-state-message
          title="Access restricted"
          message="You do not have permission to view settings."
          tone="error" />
      } @else {
        <nav class="settings-tabs" aria-label="Settings sections">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'ai'"
            type="button"
            (click)="setTab('ai')">AI Provider</button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'qa'"
            type="button"
            (click)="setTab('qa')">QA Behaviour</button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'system'"
            type="button"
            (click)="setTab('system')">System</button>
        </nav>

        @if (loadError()) {
          <app-state-message title="Could not load settings" [message]="loadError()" tone="error" />
        } @else if (loading()) {
          <app-state-message title="Loading settings" message="Fetching current configuration." />
        } @else {
          @if (saveSuccess()) {
            <app-state-message title="Settings saved" message="Your changes have been applied." tone="success" />
          }
          @if (saveError()) {
            <app-state-message title="Could not save settings" [message]="saveError()" tone="error" />
          }

          @if (activeTab() === 'ai') {
            <div class="panel settings-panel">
              <h3>AI Provider</h3>
              <p class="muted-text">Configure which AI provider generates test cases and how generation behaves. API keys and credentials are never stored here.</p>

              <div class="settings-grid">
                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Active provider</strong>
                    <small>The AI backend used for test generation. API keys must be set via environment variables.</small>
                  </div>
                  <select
                    [(ngModel)]="draft.activeProvider"
                    [disabled]="!canEdit()"
                    name="activeProvider">
                    @for (p of providerOptions; track p.value) {
                      <option [value]="p.value">{{ p.label }}</option>
                    }
                  </select>
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Generation mode</strong>
                    <small>Controls creativity vs. coverage strictness during test case generation.</small>
                  </div>
                  <select
                    [(ngModel)]="draft.generationMode"
                    [disabled]="!canEdit()"
                    name="generationMode">
                    @for (m of modeOptions; track m.value) {
                      <option [value]="m.value">{{ m.label }}</option>
                    }
                  </select>
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Max test cases per story</strong>
                    <small>Upper bound on test cases generated per story (1–50).</small>
                  </div>
                  <input
                    type="number"
                    [(ngModel)]="draft.maxTestCasesPerStory"
                    [disabled]="!canEdit()"
                    min="1"
                    max="50"
                    name="maxTestCasesPerStory"
                    class="number-input" />
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Enable explainability</strong>
                    <small>Adds rationale and linked acceptance criteria text to each generated test case.</small>
                  </div>
                  <label class="toggle-label">
                    <input
                      type="checkbox"
                      [(ngModel)]="draft.enableExplainability"
                      [disabled]="!canEdit()"
                      name="enableExplainability" />
                    <span>{{ draft.enableExplainability ? 'On' : 'Off' }}</span>
                  </label>
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Enable quality scoring</strong>
                    <small>Computes a deterministic quality score (0–100) and confidence level for each generated test case.</small>
                  </div>
                  <label class="toggle-label">
                    <input
                      type="checkbox"
                      [(ngModel)]="draft.enableQualityScoring"
                      [disabled]="!canEdit()"
                      name="enableQualityScoring" />
                    <span>{{ draft.enableQualityScoring ? 'On' : 'Off' }}</span>
                  </label>
                </div>
              </div>

              @if (canEdit()) {
                <div class="save-row">
                  <button class="button" type="button" (click)="save()" [disabled]="saving() || !isValid()">
                    {{ saving() ? 'Saving…' : 'Save AI settings' }}
                  </button>
                  @if (!isValid()) {
                    <small class="field-error">Max test cases must be between 1 and 50.</small>
                  }
                </div>
              } @else {
                <div class="inline-note amber-note">You have read-only access to these settings.</div>
              }
            </div>
          }

          @if (activeTab() === 'qa') {
            <div class="panel settings-panel">
              <h3>QA Behaviour</h3>
              <p class="muted-text">Rules that govern the review and export workflow.</p>

              <div class="settings-grid">
                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Require review before export</strong>
                    <small>When enabled, test cases must be reviewed before they can be exported.</small>
                  </div>
                  <label class="toggle-label">
                    <input
                      type="checkbox"
                      [(ngModel)]="draft.requireReviewBeforeExport"
                      [disabled]="!canEdit()"
                      name="requireReviewBeforeExport" />
                    <span>{{ draft.requireReviewBeforeExport ? 'Enabled' : 'Disabled' }}</span>
                  </label>
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Enforce acceptance criteria mapping</strong>
                    <small>Requires generated test cases to be linked to acceptance criteria text.</small>
                  </div>
                  <label class="toggle-label">
                    <input
                      type="checkbox"
                      [(ngModel)]="draft.enforceAcceptanceCriteriaMapping"
                      [disabled]="!canEdit()"
                      name="enforceAcceptanceCriteriaMapping" />
                    <span>{{ draft.enforceAcceptanceCriteriaMapping ? 'Enabled' : 'Disabled' }}</span>
                  </label>
                </div>
              </div>

              @if (canEdit()) {
                <div class="save-row">
                  <button class="button" type="button" (click)="save()" [disabled]="saving()">
                    {{ saving() ? 'Saving…' : 'Save QA settings' }}
                  </button>
                </div>
              } @else {
                <div class="inline-note amber-note">You have read-only access to these settings.</div>
              }
            </div>
          }

          @if (activeTab() === 'system') {
            <div class="panel settings-panel">
              <h3>System</h3>
              <p class="muted-text">Read-only system configuration values. These are set via environment variables.</p>

              <div class="settings-grid">
                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Authentication enforcement</strong>
                    <small>When enabled, all API requests require a valid JWT. Controlled via TESTCASEIQ_SECURITY_ENFORCE_AUTH.</small>
                  </div>
                  <span class="badge" [class.status-badge]="settings()?.enforceAuth">
                    {{ settings()?.enforceAuth ? 'Enforced' : 'Demo mode' }}
                  </span>
                </div>

                <div class="setting-row">
                  <div class="setting-label">
                    <strong>Audit logging</strong>
                    <small>Audit events are always recorded for administrative actions.</small>
                  </div>
                  <span class="badge status-badge">Active</span>
                </div>
              </div>

              <div class="inline-note">System settings cannot be changed from this interface. Update environment variables and restart the service to apply changes.</div>
            </div>
          }
        }
      }
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .settings-tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--border); margin-bottom: 1.5rem; }
    .tab-btn { background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); cursor: pointer; font-size: 0.875rem; font-weight: 500; padding: 0.5rem 1rem; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { border-bottom-color: var(--accent); color: var(--accent); }
    .settings-panel h3 { margin-bottom: 0.25rem; }
    .settings-grid { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem; }
    .setting-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; padding: 0.875rem 0; border-bottom: 1px solid var(--border-subtle); }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { flex: 1; }
    .setting-label strong { display: block; font-size: 0.9rem; margin-bottom: 0.2rem; }
    .setting-label small { color: var(--text-muted); font-size: 0.8rem; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; white-space: nowrap; }
    .toggle-label input[disabled] { cursor: not-allowed; }
    .number-input { width: 80px; text-align: right; }
    select { background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 0.35rem 0.5rem; font-size: 0.875rem; }
    select[disabled] { opacity: 0.6; cursor: not-allowed; }
    .save-row { display: flex; align-items: center; gap: 1rem; margin-top: 1.25rem; }
    .field-error { color: var(--red); font-size: 0.8rem; }
  `]
})
export class SettingsPageComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  readonly authService = inject(AuthService);

  readonly settings = signal<AppSettings | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal('');
  readonly activeTab = signal<SettingsTab>('ai');

  draft: AppSettingsUpdate & { maxTestCasesPerStory: number } = {
    activeProvider: 'MOCK',
    generationMode: 'BALANCED',
    maxTestCasesPerStory: 10,
    enableExplainability: true,
    enableQualityScoring: true,
    requireReviewBeforeExport: false,
    enforceAcceptanceCriteriaMapping: false
  };

  readonly canViewSettings = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    return this.authService.hasRole(['ADMIN', 'QA_ENGINEER']);
  });

  readonly canEdit = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    return this.authService.hasRole('ADMIN');
  });

  readonly providerOptions: { value: AiProvider; label: string }[] = [
    { value: 'MOCK', label: 'Mock (built-in, no API key needed)' },
    { value: 'OPENAI', label: 'OpenAI (requires OPENAI_API_KEY env var)' }
  ];

  readonly modeOptions: { value: GenerationMode; label: string }[] = [
    { value: 'STRICT', label: 'Strict — maximum coverage, fewer creative cases' },
    { value: 'BALANCED', label: 'Balanced — recommended default' },
    { value: 'CREATIVE', label: 'Creative — broader scenarios, more variation' }
  ];

  ngOnInit(): void {
    if (!this.canViewSettings()) {
      this.loading.set(false);
      return;
    }
    this.load();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.saveSuccess.set(false);
    this.saveError.set('');
  }

  isValid(): boolean {
    const max = this.draft.maxTestCasesPerStory;
    return max >= 1 && max <= 50;
  }

  save(): void {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set('');

    this.settingsService.updateSettings(this.draft).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.applyToDraft(updated);
        this.saveSuccess.set(true);
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set('Settings could not be saved. Check input values and try again.');
        this.saving.set(false);
      }
    });
  }

  private load(): void {
    this.settingsService.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.applyToDraft(s);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Settings could not be loaded. The backend may be unavailable.');
        this.loading.set(false);
      }
    });
  }

  private applyToDraft(s: AppSettings): void {
    this.draft = {
      activeProvider: s.activeProvider,
      generationMode: s.generationMode,
      maxTestCasesPerStory: s.maxTestCasesPerStory,
      enableExplainability: s.enableExplainability,
      enableQualityScoring: s.enableQualityScoring,
      requireReviewBeforeExport: s.requireReviewBeforeExport,
      enforceAcceptanceCriteriaMapping: s.enforceAcceptanceCriteriaMapping
    };
  }
}
