import { Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { AppSettings, AppSettingsUpdate, AiProvider, GenerationMode } from '../../core/models/settings.model';
import { ToastService } from '../../core/services/toast.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type SettingsTab = 'ai' | 'security' | 'system';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, StateMessageComponent, SkeletonComponent],
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
            [class.active]="activeTab() === 'security'"
            type="button"
            (click)="setTab('security')">Security</button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'system'"
            type="button"
            (click)="setTab('system')">System</button>
        </nav>

        @if (loadError()) {
          <app-state-message title="Could not load settings" [message]="loadError()" tone="error" />
          <button class="button secondary" type="button" (click)="load()">Try again</button>
        } @else if (loading()) {
          <app-skeleton [rows]="4" [cols]="2" />
        } @else {
          @if (activeTab() === 'ai') {
            <div class="panel settings-panel">
              <h3>AI Provider</h3>
              <p class="muted-text">Configure which AI provider generates test cases and how generation behaves.</p>

              <div class="provider-card-grid" role="radiogroup" aria-label="AI provider">
                <button
                  class="provider-card"
                  type="button"
                  role="radio"
                  [class.selected]="draft.activeProvider === 'MOCK'"
                  [attr.aria-checked]="draft.activeProvider === 'MOCK'"
                  [disabled]="!canEdit()"
                  (click)="setProvider('MOCK')"
                >
                  <strong>Mock</strong>
                  <span>Built-in deterministic provider for demos, offline work, and predictable QA reviews.</span>
                </button>
                <button
                  class="provider-card"
                  type="button"
                  role="radio"
                  [class.selected]="draft.activeProvider === 'OPENAI'"
                  [attr.aria-checked]="draft.activeProvider === 'OPENAI'"
                  [disabled]="!canEdit()"
                  (click)="setProvider('OPENAI')"
                >
                  <strong>OpenAI</strong>
                  <span>Production provider for generated test design using your configured API credentials.</span>
                </button>
              </div>

              @if (draft.activeProvider === 'OPENAI') {
                <label class="openai-key-field">
                  <span>API key</span>
                  <input
                    type="password"
                    [(ngModel)]="openAiApiKey"
                    [disabled]="!canEdit()"
                    name="openAiApiKey"
                    autocomplete="off"
                    placeholder="Stored outside TestCaseIQ"
                  />
                </label>
              }

              <div class="settings-grid">
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

          @if (activeTab() === 'security') {
            <div class="panel settings-panel">
              <h3>Security</h3>
              <p class="muted-text">Rules that govern review gates, export readiness, and acceptance criteria traceability.</p>

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
    .settings-tabs { display: inline-flex; gap: 0.25rem; padding: 0.25rem; border: 1px solid var(--glass-edge); border-radius: 9999px; background: var(--glass-bg-2); backdrop-filter: var(--glass-blur-sm); -webkit-backdrop-filter: var(--glass-blur-sm); box-shadow: var(--glass-border-highlight); margin-bottom: 1.5rem; }
    .tab-btn { background: transparent; border: 1px solid transparent; border-radius: 9999px; color: var(--color-text-2); cursor: pointer; font-size: 0.875rem; font-weight: 500; padding: 0.45rem 0.9rem; transition: background var(--dur) var(--ease), color var(--dur) var(--ease); }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .tab-btn:active:not(:disabled) { transform: scale(0.97); }
    .tab-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .tab-btn[aria-busy="true"], .tab-btn.loading { opacity: 0.7; cursor: progress; }
    .tab-btn.error { color: var(--color-red); border-color: var(--color-red-border); background: var(--color-red-bg); }
    .tab-btn.success { color: var(--color-green); border-color: var(--color-green-border); background: var(--color-green-bg); }
    .tab-btn.active { background: var(--glass-bg-2); color: var(--color-text); border-color: var(--glass-edge-strong); }
    .settings-panel h3 { margin-bottom: 0.25rem; }
    .provider-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; margin-top: 1.25rem; }
    .provider-card { display: grid; gap: 0.4rem; min-height: 8rem; padding: 1rem; border: 1px solid var(--glass-edge); border-radius: var(--radius-lg); background: var(--glass-bg-2); backdrop-filter: var(--glass-blur-md); -webkit-backdrop-filter: var(--glass-blur-md); box-shadow: var(--glass-border-highlight); color: var(--color-text); text-align: left; cursor: pointer; transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease), transform var(--dur) var(--ease), box-shadow var(--dur-slow) var(--ease); }
    .provider-card:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--color-accent-border); box-shadow: var(--glass-border-highlight), var(--glass-shadow); }
    .provider-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .provider-card:active:not(:disabled) { transform: scale(0.97); }
    .provider-card:disabled { opacity: 0.45; cursor: not-allowed; }
    .provider-card[aria-busy="true"], .provider-card.loading { opacity: 0.7; cursor: progress; }
    .provider-card.error { border-color: var(--color-red-border); background: var(--color-red-bg); }
    .provider-card.success { border-color: var(--color-green-border); background: var(--color-green-bg); }
    .provider-card.selected { border-color: var(--color-accent-border); background: var(--color-accent-bg); }
    .provider-card span { color: var(--color-text-2); font-size: 0.82rem; line-height: 1.5; }
    .openai-key-field { display: grid; gap: 0.4rem; margin-top: 1rem; overflow: hidden; }
    .settings-grid { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem; }
    .setting-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; padding: 0.875rem 0; border-bottom: 1px solid var(--color-border-subtle); }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { flex: 1; }
    .setting-label strong { display: block; font-size: 0.9rem; margin-bottom: 0.2rem; }
    .setting-label small { color: var(--color-text-2); font-size: 0.8rem; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; white-space: nowrap; }
    .toggle-label input[disabled] { cursor: not-allowed; }
    .number-input { width: 80px; text-align: right; }
    select { background: var(--glass-bg-1); color: var(--color-text); border: 1px solid var(--glass-edge); border-radius: 4px; padding: 0.35rem 0.5rem; font-size: 0.875rem; }
    select[disabled] { opacity: 0.6; cursor: not-allowed; }
    .save-row { display: flex; align-items: center; gap: 1rem; margin-top: 1.25rem; }
    .field-error { color: var(--color-red); font-size: 0.8rem; }
    @media (max-width: 900px) {
      .provider-card-grid { grid-template-columns: 1fr; }
      .setting-row { flex-direction: column; }
    }
  `]
})
export class SettingsPageComponent implements OnInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly settingsService = inject(SettingsService);
  private readonly toastService = inject(ToastService);
  private readonly motion = inject(MotionService);
  readonly authService = inject(AuthService);

  readonly settings = signal<AppSettings | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal('');
  readonly activeTab = signal<SettingsTab>('ai');
  openAiApiKey = '';

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

  setProvider(provider: AiProvider): void {
    if (!this.canEdit()) {
      return;
    }
    this.draft.activeProvider = provider;
    if (provider === 'OPENAI') {
      this.animateOpenAiInput();
    }
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
        this.toastService.show('AI provider updated', 'success');
        this.saving.set(false);
      },
      error: () => {
        const message = 'Settings could not be saved. Check input values and try again.';
        this.saveError.set(message);
        this.toastService.show(message, 'error');
        this.saving.set(false);
      }
    });
  }

  load(): void {
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

  private animateOpenAiInput(): void {
    if (this.motion.reducedMotion()) {
      return;
    }
    queueMicrotask(() => {
      const input = this.host.nativeElement.querySelector('.openai-key-field');
      if (input) {
        gsap.from(input, { height: 0, opacity: 0, duration: 0.22, ease: 'power2.out' });
      }
    });
  }

}
