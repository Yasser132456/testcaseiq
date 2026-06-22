import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { AppSettings } from '../../core/models/settings.model';
import { AuthUser } from '../../core/models/auth.model';
import { SettingsPageComponent } from './settings-page.component';
import { provideRouter } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

const mockSettings: AppSettings = {
  activeProvider: 'MOCK',
  generationMode: 'BALANCED',
  maxTestCasesPerStory: 10,
  enableExplainability: true,
  enableQualityScoring: true,
  requireReviewBeforeExport: false,
  enforceAcceptanceCriteriaMapping: false,
  enforceAuth: false
};

function adminUser(): AuthUser {
  return { id: 'u1', email: 'admin@test.com', displayName: 'Admin', role: 'ADMIN' };
}

function buildAuthStub(hasRoleFn: (r: string | string[]) => boolean): Partial<AuthService> {
  return {
    isAuthenticated: signal(true) as any,
    currentUser: signal(adminUser()) as any,
    currentRole: signal('ADMIN') as any,
    hasRole: jasmine.createSpy('hasRole').and.callFake(hasRoleFn)
  };
}

describe('SettingsPageComponent', () => {
  let fixture: ComponentFixture<SettingsPageComponent>;
  let component: SettingsPageComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let authStub: Partial<AuthService>;

  async function setup(hasRoleFn: (r: string | string[]) => boolean = () => true): Promise<void> {
    authStub = buildAuthStub(hasRoleFn);

    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', ['getSettings', 'updateSettings']);
    settingsService.getSettings.and.returnValue(of(mockSettings));
    settingsService.updateSettings.and.returnValue(of(mockSettings));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        provideRouter([]),
        { provide: SettingsService, useValue: settingsService },
        { provide: AuthService, useValue: authStub },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup((roles) => {
      const r = Array.isArray(roles) ? roles : [roles];
      return r.includes('ADMIN');
    });
  });

  it('renders the settings page for ADMIN', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Settings');
    expect(text).toContain('AI Provider');
    expect(text).toContain('Security');
    expect(text).toContain('System');
  });

  it('loads settings on init', () => {
    expect(settingsService.getSettings).toHaveBeenCalledTimes(1);
    expect(component.settings()?.activeProvider).toBe('MOCK');
  });

  it('shows AI Provider tab by default', () => {
    expect(component.activeTab()).toBe('ai');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mock');
    expect(text).toContain('OpenAI');
  });

  it('switches to Security tab on click', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('security');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Require review before export');
  });

  it('switches to System tab on click', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[2].click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('system');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Authentication enforcement');
  });

  it('renders provider radio cards and reveals API key input for OpenAI', () => {
    const cards = fixture.nativeElement.querySelectorAll('.provider-card') as NodeListOf<HTMLButtonElement>;

    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Mock');
    expect(cards[1].textContent).toContain('OpenAI');

    cards[1].click();
    fixture.detectChanges();

    expect(component.draft.activeProvider).toBe('OPENAI');
    expect(fixture.nativeElement.querySelector('input[name="openAiApiKey"]')).not.toBeNull();
  });

  it('save calls updateSettings and shows success toast', () => {
    component.save();
    fixture.detectChanges();

    expect(settingsService.updateSettings).toHaveBeenCalledTimes(1);
    expect(toastService.show).toHaveBeenCalledWith('AI provider updated', 'success');
  });

  it('shows error when save fails', () => {
    settingsService.updateSettings.and.returnValue(throwError(() => new Error('500')));
    component.save();
    fixture.detectChanges();

    expect(toastService.show).toHaveBeenCalledWith('Settings could not be saved. Check input values and try again.', 'error');
  });

  it('isValid returns false when maxTestCasesPerStory is out of range', () => {
    component.draft.maxTestCasesPerStory = 0;
    expect(component.isValid()).toBeFalse();

    component.draft.maxTestCasesPerStory = 51;
    expect(component.isValid()).toBeFalse();

    component.draft.maxTestCasesPerStory = 10;
    expect(component.isValid()).toBeTrue();
  });

  it('canEdit returns false for QA_ENGINEER', async () => {
    TestBed.resetTestingModule();
    await setup((roles) => {
      const r = Array.isArray(roles) ? roles : [roles];
      return r.includes('QA_ENGINEER');
    });

    expect(component.canEdit()).toBeFalse();
    expect(component.canViewSettings()).toBeTrue();
  });

  it('shows access restricted for VIEWER', async () => {
    TestBed.resetTestingModule();
    await setup(() => false);

    expect(component.canViewSettings()).toBeFalse();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Access restricted');
  });

  it('shows load error when settings fetch fails', async () => {
    TestBed.resetTestingModule();

    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', ['getSettings', 'updateSettings']);
    settingsService.getSettings.and.returnValue(throwError(() => new Error('Network error')));
    authStub = buildAuthStub((r) => Array.isArray(r) ? r.includes('ADMIN') : r === 'ADMIN');

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        provideRouter([]),
        { provide: SettingsService, useValue: settingsService },
        { provide: AuthService, useValue: authStub },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['show']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.loadError()).toContain('could not be loaded');
  });

  it('does not expose secret values in the template', () => {
    const html = fixture.nativeElement.innerHTML as string;
    // Verify no credential values are rendered — mentions of env var names in help text are fine
    expect(html).not.toMatch(/bearer\s+[A-Za-z0-9+/=]{20,}/i);
    expect(html).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(html.toLowerCase()).not.toContain('password');
    expect(html.toLowerCase()).not.toContain('jwt_secret');
  });
});
