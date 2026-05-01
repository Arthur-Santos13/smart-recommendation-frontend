import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { RecommendationsComponent } from './recommendations';
import { RecommendationStateService } from '../../services/recommendation-state.service';
import { UserSessionService } from '../../services/user-session.service';
import { RecommendationItem } from '../../models/recommendation.model';

const MOCK_ITEMS: RecommendationItem[] = [
    {
        item_id: 'item-1',
        score: 0.92,
        reason: "Similar to 'Machine Learning 101'",
        category: 'technology',
    },
    {
        item_id: 'item-2',
        score: 0.75,
        reason: 'Based on your browsing activity',
        category: 'science',
    },
];

// ─── Helper: component logic (pure methods) ──────────────────────────────────
describe('RecommendationsComponent — pure helper methods', () => {
    let component: RecommendationsComponent;
    let fixture: ComponentFixture<RecommendationsComponent>;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [RecommendationsComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RecommendationsComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => localStorage.clear());

    // ── scorePercent ─────────────────────────────────────────────────────────
    describe('scorePercent()', () => {
        it('converts 0.92 to 92', () => expect(component.scorePercent(0.92)).toBe(92));
        it('converts 0.0 to 0', () => expect(component.scorePercent(0)).toBe(0));
        it('converts 1.0 to 100', () => expect(component.scorePercent(1)).toBe(100));
        it('rounds 0.756 to 76', () => expect(component.scorePercent(0.756)).toBe(76));
    });

    // ── categoryLabel ────────────────────────────────────────────────────────
    describe('categoryLabel()', () => {
        it('capitalises technology', () => expect(component.categoryLabel('technology')).toBe('Technology'));
        it('capitalises science', () => expect(component.categoryLabel('science')).toBe('Science'));
        it('capitalises general', () => expect(component.categoryLabel('general')).toBe('General'));
    });

    // ── reasonTypeOf ─────────────────────────────────────────────────────────
    describe('reasonTypeOf()', () => {
        it('returns "similar" for a "Similar to…" reason', () => {
            expect(component.reasonTypeOf("Similar to 'AI Basics'")).toBe('similar');
        });

        it('is case-insensitive for "similar to"', () => {
            expect(component.reasonTypeOf("similar to 'something'")).toBe('similar');
        });

        it('returns "activity" for activity-based reason', () => {
            expect(component.reasonTypeOf('Based on your browsing activity')).toBe('activity');
        });

        it('returns "activity" for an unknown reason string', () => {
            expect(component.reasonTypeOf('Trending in your network')).toBe('activity');
        });
    });

    // ── extractReasonTitle ───────────────────────────────────────────────────
    describe('extractReasonTitle()', () => {
        it("extracts title from \"Similar to 'Machine Learning 101'\"", () => {
            expect(component.extractReasonTitle("Similar to 'Machine Learning 101'")).toBe('Machine Learning 101');
        });

        it('returns null for an activity-based reason', () => {
            expect(component.extractReasonTitle('Based on your activity')).toBeNull();
        });

        it('returns null for an empty string', () => {
            expect(component.extractReasonTitle('')).toBeNull();
        });
    });
});

// ─── Helper: DOM rendering ───────────────────────────────────────────────────
describe('RecommendationsComponent — DOM rendering', () => {
    let component: RecommendationsComponent;
    let fixture: ComponentFixture<RecommendationsComponent>;
    let stateService: RecommendationStateService;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [RecommendationsComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        }).compileComponents();

        stateService = TestBed.inject(RecommendationStateService);
        fixture = TestBed.createComponent(RecommendationsComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => localStorage.clear());

    it('shows the no-session empty state when hasUser is false', () => {
        component.hasUser = false;
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('.rec-empty')).toBeTruthy();
        expect(el.querySelector('.rec-empty')?.textContent).toContain('No active session');
    });

    it('shows the loading skeleton while state.loading() is true', () => {
        component.hasUser = true;
        stateService.loading.set(true);
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('.rec-skeleton-list')).toBeTruthy();
    });

    it('shows the error block when state.error() is set', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set('Network error');
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('.rec-error')).toBeTruthy();
        expect(el.querySelector('.rec-error__message')?.textContent).toContain('Network error');
    });

    it('shows the empty-recommendations state when list is empty', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set(null);
        stateService.recommendations.set([]);
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('.rec-empty')).toBeTruthy();
    });

    it('renders a recommendation card for each item', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set(null);
        stateService.recommendations.set(MOCK_ITEMS);
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        const cards = el.querySelectorAll('.rec-card');
        expect(cards.length).toBe(MOCK_ITEMS.length);
    });

    it('renders the score bar width as a percentage', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set(null);
        stateService.recommendations.set([MOCK_ITEMS[0]]);
        fixture.detectChanges();

        const fill = fixture.nativeElement.querySelector('.rec-card__score-fill') as HTMLElement;
        expect(fill.style.width).toBe('92%');
    });

    it('shows the refresh banner when pendingRefresh is true and there are results', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set(null);
        stateService.recommendations.set(MOCK_ITEMS);
        stateService.pendingRefresh.set(true);
        fixture.detectChanges();

        const banner = fixture.nativeElement.querySelector('.rec-refresh-banner');
        expect(banner).toBeTruthy();
    });

    it('does NOT show the refresh banner when pendingRefresh is false', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.recommendations.set(MOCK_ITEMS);
        stateService.pendingRefresh.set(false);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.rec-refresh-banner')).toBeNull();
    });

    it('renders the similar-type explanation icon (🔗) for similar reasons', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set(null);
        stateService.recommendations.set([MOCK_ITEMS[0]]); // similar reason
        fixture.detectChanges();

        const text = fixture.nativeElement.querySelector('.rec-card__explanation-text')?.textContent ?? '';
        expect(text).toContain('Machine Learning 101');
    });

    it('renders the activity-type explanation for activity-based reasons', () => {
        component.hasUser = true;
        stateService.loading.set(false);
        stateService.error.set(null);
        stateService.recommendations.set([MOCK_ITEMS[1]]); // activity reason
        fixture.detectChanges();

        const text = fixture.nativeElement.querySelector('.rec-card__explanation-text')?.textContent ?? '';
        expect(text).toContain('browsing activity');
    });
});
