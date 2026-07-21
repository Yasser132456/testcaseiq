import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { SearchModalComponent } from './search-modal.component';

describe('SearchModalComponent', () => {
  let fixture: ComponentFixture<SearchModalComponent>;
  let component: SearchModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchModalComponent],
      providers: [
        provideRouter([]),
        {
          provide: SearchService,
          useValue: { search: () => of({ projects: [], stories: [], testSuites: [], testCases: [] }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('caps row reveal delay at 300ms', () => {
    expect(component.rowDelay(0)).toBe('0ms');
    expect(component.rowDelay(4)).toBe('120ms');
    expect(component.rowDelay(99)).toBe('300ms');
  });

  it('emits navigating before routing the active result', () => {
    const navigating = spyOn(component.navigating, 'emit');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    component.results.set({
      projects: [{ id: 'p1', name: 'Alpha', type: 'PROJECT' }],
      stories: [],
      testSuites: [],
      testCases: []
    });
    component.query.set('alpha');

    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(navigating).toHaveBeenCalledBefore(navigate);
    expect(navigate).toHaveBeenCalledWith('/projects/p1');
  });

  it('moves the active row synchronously on ArrowDown', () => {
    component.recent.set([
      { id: 'p1', label: 'One', type: 'PROJECT', route: '/projects/p1' },
      { id: 'p2', label: 'Two', type: 'PROJECT', route: '/projects/p2' }
    ]);

    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    expect(component.activeIndex()).toBe(1);
  });

  it('preserves the dialog and search accessible names', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    const input = fixture.nativeElement.querySelector('input[type="search"]');

    expect(dialog.getAttribute('aria-label')).toBe('Global search');
    expect(input.getAttribute('aria-label')).toBe('Search');
  });
});
