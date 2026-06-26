import {
  AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, computed, inject, signal
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap, Subject, takeUntil } from 'rxjs';
import {
  LucideDynamicIcon, LucideFolderKanban, LucideBookOpenText, LucideClipboardList,
  LucideCheckSquare2, LucideClock, LucideClock3, LucideHistory, LucideIconInput, LucideSearch, LucideX
} from '@lucide/angular';
import { SearchService } from '../../core/services/search.service';
import {
  RecentSearchItem, SearchResultsResponse, SearchResultType,
  ProjectSearchResult, StorySearchResult, TestSuiteSearchResult, TestCaseSearchResult
} from '../../core/models/search.model';

type SearchRow = RecentSearchItem & { icon: LucideIconInput };
type SearchGroup = { label: string; icon: LucideIconInput; rows: SearchRow[] };

const RECENT_KEY = 'tq_recent_searches';
const RECENT_SEARCHES_KEY = 'tiq_recent_searches';
const EMPTY_RESULTS: SearchResultsResponse = { projects: [], stories: [], testSuites: [], testCases: [] };

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [LucideDynamicIcon],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.css'
})
export class SearchModalComponent implements AfterViewInit, OnDestroy {
  @Output() readonly closed = new EventEmitter<void>();
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;

  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly input$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly LucideSearch = LucideSearch;
  readonly LucideX = LucideX;
  readonly LucideClock = LucideClock;
  readonly LucideHistory = LucideHistory;
  readonly query = signal('');
  readonly loading = signal(false);
  readonly results = signal<SearchResultsResponse>(EMPTY_RESULTS);
  readonly recent = signal<RecentSearchItem[]>(this.readRecent());
  readonly recentSearches = signal<string[]>(this.getRecentSearches());
  readonly activeIndex = signal(0);
  readonly showingRecent = computed(() => this.query().length === 0);
  readonly groups = computed(() => this.buildGroups());
  readonly rows = computed(() => this.groups().flatMap(group => group.rows));

  constructor() {
    this.input$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) => {
        const normalized = query.trim().slice(0, 100);
        this.query.set(normalized);
        this.activeIndex.set(0);
        if (!normalized) {
          this.results.set(EMPTY_RESULTS);
          this.loading.set(false);
          return of(EMPTY_RESULTS);
        }
        this.loading.set(true);
        return this.searchService.search(normalized).pipe(
          catchError(() => of(EMPTY_RESULTS)),
          finalize(() => this.loading.set(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => this.results.set(results));
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(value: string): void {
    this.input$.next(value);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.selectActive();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  select(row: RecentSearchItem): void {
    this.saveSearch(this.query());
    this.saveRecent(row);
    this.close();
    void this.router.navigateByUrl(row.route);
  }

  setQuery(term: string): void {
    const normalized = term.trim().slice(0, 100);
    if (!normalized) return;
    if (this.searchInput) {
      this.searchInput.nativeElement.value = normalized;
      this.searchInput.nativeElement.focus();
    }
    this.query.set(normalized);
    this.input$.next(normalized);
  }

  clearRecent(): void {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore storage errors; the visible modal state can still be cleared.
    }
    this.recentSearches.set([]);
  }

  isEmpty(): boolean {
    const results = this.results();
    return this.query().length > 0
      && !this.loading()
      && results.projects.length + results.stories.length + results.testSuites.length + results.testCases.length === 0;
  }

  close(): void {
    this.closed.emit();
  }

  private moveActive(delta: number): void {
    const rows = this.rows();
    if (rows.length === 0) return;
    this.activeIndex.set((this.activeIndex() + delta + rows.length) % rows.length);
  }

  private selectActive(): void {
    const row = this.rows()[this.activeIndex()];
    if (row) {
      this.select(row);
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = this.panel?.nativeElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private buildGroups(): SearchGroup[] {
    if (this.showingRecent()) {
      return [{
        label: 'Recent',
        icon: LucideClock3,
        rows: this.recent().map(item => ({ ...item, icon: this.iconFor(item.type) }))
      }];
    }
    const results = this.results();
    return [
      { label: 'Projects', icon: LucideFolderKanban, rows: results.projects.map(item => this.projectRow(item)) },
      { label: 'Stories', icon: LucideBookOpenText, rows: results.stories.map(item => this.storyRow(item)) },
      { label: 'Test Suites', icon: LucideClipboardList, rows: results.testSuites.map(item => this.suiteRow(item)) },
      { label: 'Test Cases', icon: LucideCheckSquare2, rows: results.testCases.map(item => this.testCaseRow(item)) }
    ].filter(group => group.rows.length > 0);
  }

  private projectRow(item: ProjectSearchResult): SearchRow {
    return { id: item.id, label: item.name, type: item.type, route: `/projects/${item.id}`, icon: LucideFolderKanban };
  }

  private storyRow(item: StorySearchResult): SearchRow {
    return { id: item.id, label: item.title, type: item.type, route: `/stories/${item.id}`, icon: LucideBookOpenText };
  }

  private suiteRow(item: TestSuiteSearchResult): SearchRow {
    return { id: item.id, label: item.name, type: item.type, route: `/test-suites/${item.id}`, icon: LucideClipboardList };
  }

  private testCaseRow(item: TestCaseSearchResult): SearchRow {
    return {
      id: item.id,
      label: item.title,
      type: item.type,
      route: item.storyId ? `/stories/${item.storyId}` : '/review-board',
      icon: LucideCheckSquare2
    };
  }

  private iconFor(type: SearchResultType): LucideIconInput {
    if (type === 'PROJECT') return LucideFolderKanban;
    if (type === 'STORY') return LucideBookOpenText;
    if (type === 'TEST_SUITE') return LucideClipboardList;
    return LucideCheckSquare2;
  }

  private readRecent(): RecentSearchItem[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentSearchItem[];
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  private saveRecent(item: RecentSearchItem): void {
    const next = [item, ...this.recent().filter(recent => recent.id !== item.id)].slice(0, 5);
    this.recent.set(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      return;
    }
  }

  private getRecentSearches(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]') as string[];
      return Array.isArray(parsed)
        ? parsed.filter((term): term is string => typeof term === 'string' && term.trim().length > 0).slice(0, 5)
        : [];
    } catch {
      return [];
    }
  }

  private saveSearch(query: string): void {
    const normalized = query.trim().slice(0, 100);
    if (!normalized) return;
    const next = [normalized, ...this.getRecentSearches().filter(term => term !== normalized)].slice(0, 5);
    this.recentSearches.set(next);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      return;
    }
  }
}
