import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ItemsComponent, ITEM_CATEGORIES, SORT_OPTIONS } from './items';
import { ItemStateService } from '../../services/item-state.service';
import { Item } from '../../models/item.model';

const mockItems: Item[] = [
    { id: 'item-1', title: 'Zebra Science', description: null, category: 'science', tags: null, is_active: true },
    { id: 'item-2', title: 'Alpha Tech', description: 'Desc', category: 'technology', tags: 'a', is_active: true },
    { id: 'item-3', title: 'Mango Business', description: null, category: 'business', tags: null, is_active: true },
];

// ─── Pure methods ─────────────────────────────────────────────────────────────
describe('ItemsComponent — pure helper methods', () => {
    let component: ItemsComponent;
    let fixture: ComponentFixture<ItemsComponent>;
    let stateService: ItemStateService;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [ItemsComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        }).compileComponents();

        stateService = TestBed.inject(ItemStateService);
        fixture = TestBed.createComponent(ItemsComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => localStorage.clear());

    // ── categoryLabel ─────────────────────────────────────────────────────────
    describe('categoryLabel()', () => {
        it('capitalises "technology"', () => expect(component.categoryLabel('technology')).toBe('Technology'));
        it('capitalises "science"', () => expect(component.categoryLabel('science')).toBe('Science'));
        it('capitalises "business"', () => expect(component.categoryLabel('business')).toBe('Business'));
        it('capitalises "health"', () => expect(component.categoryLabel('health')).toBe('Health'));
        it('capitalises "education"', () => expect(component.categoryLabel('education')).toBe('Education'));
        it('capitalises "general"', () => expect(component.categoryLabel('general')).toBe('General'));
    });

    // ── categoryIcon ──────────────────────────────────────────────────────────
    describe('categoryIcon()', () => {
        it('returns 💻 for technology', () => expect(component.categoryIcon('technology')).toBe('💻'));
        it('returns 🔬 for science', () => expect(component.categoryIcon('science')).toBe('🔬'));
        it('returns 📈 for business', () => expect(component.categoryIcon('business')).toBe('📈'));
        it('returns 🏃 for health', () => expect(component.categoryIcon('health')).toBe('🏃'));
        it('returns 📚 for education', () => expect(component.categoryIcon('education')).toBe('📚'));
        it('returns 🌐 for general', () => expect(component.categoryIcon('general')).toBe('🌐'));
        it('returns 📄 for an unknown category', () => expect(component.categoryIcon('unknown')).toBe('📄'));
    });

    // ── sortedItems (computed) ─────────────────────────────────────────────────
    describe('sortedItems computed', () => {
        beforeEach(() => {
            stateService.items.set(mockItems);
        });

        it('sorts ascending by title when selectedSort is title_asc', () => {
            component.selectedSort.set('title_asc');
            const titles = component.sortedItems().map((i) => i.title);
            expect(titles).toEqual(['Alpha Tech', 'Mango Business', 'Zebra Science']);
        });

        it('sorts descending by title when selectedSort is title_desc', () => {
            component.selectedSort.set('title_desc');
            const titles = component.sortedItems().map((i) => i.title);
            expect(titles).toEqual(['Zebra Science', 'Mango Business', 'Alpha Tech']);
        });

        it('does not mutate the original state.items() array', () => {
            component.selectedSort.set('title_asc');
            component.sortedItems(); // trigger computation
            expect(stateService.items()[0].title).toBe('Zebra Science'); // original order unchanged
        });

        it('returns an empty array when state.items() is empty', () => {
            stateService.items.set([]);
            expect(component.sortedItems()).toEqual([]);
        });
    });
});

// ─── Category filter constants ────────────────────────────────────────────────
describe('ITEM_CATEGORIES constant', () => {
    it('includes an "All" option with empty value', () => {
        const all = ITEM_CATEGORIES.find((c) => c.value === '');
        expect(all?.label).toBe('All');
    });

    it('includes all six named categories', () => {
        const values = ITEM_CATEGORIES.filter((c) => c.value !== '').map((c) => c.value);
        expect(values).toContain('technology');
        expect(values).toContain('science');
        expect(values).toContain('business');
        expect(values).toContain('health');
        expect(values).toContain('education');
        expect(values).toContain('general');
    });
});

// ─── SORT_OPTIONS constant ────────────────────────────────────────────────────
describe('SORT_OPTIONS constant', () => {
    it('provides title_asc and title_desc options', () => {
        const values = SORT_OPTIONS.map((s) => s.value);
        expect(values).toContain('title_asc');
        expect(values).toContain('title_desc');
    });
});
