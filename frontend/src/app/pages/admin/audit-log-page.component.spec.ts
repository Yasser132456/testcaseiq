import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuditEventService } from '../../core/services/audit-event.service';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { AuditLogPageComponent } from './audit-log-page.component';

describe('AuditLogPageComponent', () => {
  let fixture: ComponentFixture<AuditLogPageComponent>;
  let component: AuditLogPageComponent;
  let auditEventService: jasmine.SpyObj<AuditEventService>;

  beforeEach(async () => {
    auditEventService = jasmine.createSpyObj<AuditEventService>('AuditEventService', ['listEvents']);
    auditEventService.listEvents.and.returnValue(of({
      content: [
        {
          id: 'event-1',
          timestamp: '2026-06-14T00:00:00Z',
          actorUserId: 'user-1',
          actorEmail: 'qa@example.com',
          actorRole: 'QA_ENGINEER',
          action: 'TEST_GENERATION_REQUESTED',
          resourceType: 'STORY',
          resourceId: 'story-1',
          outcome: 'SUCCESS',
          summary: 'Generated tests',
          requestPath: '/api/stories/story-1/tests',
          requestMethod: 'POST',
          ipAddress: '127.0.0.1',
          metadata: {}
        }
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true
    }));

    await TestBed.configureTestingModule({
      imports: [AuditLogPageComponent, DrawerComponent],
      providers: [
        provideRouter([]),
        { provide: AuditEventService, useValue: auditEventService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders filter chips instead of the full filter form by default', () => {
    component.actionFilter = 'TEST_GENERATION_REQUESTED';
    component.outcomeFilter = 'SUCCESS';
    component.onFilterChange();
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('.filter-chip') as NodeListOf<HTMLElement>;

    expect(chips.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.filter-panel')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('TEST_GENERATION_REQUESTED');
  });

  it('opens the full filter form in a drawer', async () => {
    component.openFilters();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.filterDrawerOpen()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.drawer-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.filter-select')).not.toBeNull();
  });

  it('dismisses an active filter chip and reloads the audit events', () => {
    component.actionFilter = 'TEST_GENERATION_REQUESTED';
    component.onFilterChange();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.filter-chip button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.actionFilter).toBe('');
    expect(auditEventService.listEvents).toHaveBeenCalledTimes(3);
  });
});
