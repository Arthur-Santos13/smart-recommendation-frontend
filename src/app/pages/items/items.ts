import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemStateService } from '../../services/item-state.service';
import { InteractionService } from '../../services/interaction.service';
import { ItemCategory } from '../../models/item.model';

export const ITEM_CATEGORIES: { value: ItemCategory | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'technology', label: 'Technology' },
    { value: 'science', label: 'Science' },
    { value: 'business', label: 'Business' },
    { value: 'health', label: 'Health' },
    { value: 'education', label: 'Education' },
    { value: 'general', label: 'General' },
];

export type SortOption = 'title_asc' | 'title_desc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'title_asc', label: 'Title A → Z' },
    { value: 'title_desc', label: 'Title Z → A' },
];

@Component({
    selector: 'app-items',
    imports: [CommonModule],
    templateUrl: './items.html',
    styleUrl: './items.scss',
})
export class ItemsComponent implements OnInit {
    readonly state = inject(ItemStateService);
    private readonly interactionService = inject(InteractionService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly categories = ITEM_CATEGORIES;
    readonly sortOptions = SORT_OPTIONS;

    selectedCategory = signal<ItemCategory | ''>('');
    currentPage = signal(1);
    selectedSort = signal<SortOption>('title_asc');
    readonly limit = 12;

    totalPages = computed(() => Math.max(1, Math.ceil(this.state.total() / this.limit)));
    hasPrev = computed(() => this.currentPage() > 1);
    hasNext = computed(() => this.currentPage() < this.totalPages());

    sortedItems = computed(() => {
        const list = [...this.state.items()];
        return this.selectedSort() === 'title_asc'
            ? list.sort((a, b) => a.title.localeCompare(b.title))
            : list.sort((a, b) => b.title.localeCompare(a.title));
    });

    constructor() {
        // Fire a 'view' event for every item that appears in the grid.
        // effect() re-runs whenever state.items() changes, so it tracks views
        // both on initial load and on every page / category change.
        effect(() => {
            const items = this.state.items();
            items.forEach((item) => this.interactionService.trackEvent(item.id, 'view'));
        });
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            const category = (params['category'] as ItemCategory) ?? '';
            const page = Number(params['page'] ?? 1);
            const sort = (params['sort'] as SortOption) ?? 'title_asc';
            this.selectedCategory.set(category);
            this.currentPage.set(page);
            this.selectedSort.set(sort);
            this.state.load(page, this.limit, category);
        });
    }

    selectCategory(category: ItemCategory | ''): void {
        this.router.navigate([], {
            queryParams: { category: category || null, page: 1 },
            queryParamsHandling: 'merge',
        });
    }

    setSort(sort: SortOption): void {
        this.router.navigate([], {
            queryParams: { sort, page: 1 },
            queryParamsHandling: 'merge',
        });
    }

    goToPage(page: number): void {
        this.router.navigate([], {
            queryParams: { page },
            queryParamsHandling: 'merge',
        });
    }

    onItemClick(itemId: string): void {
        this.interactionService.trackEvent(itemId, 'click');
        this.interactedItemId.set(itemId);
        setTimeout(() => this.interactedItemId.set(null), 1500);
    }

    /** Tracks the last interacted item id for visual feedback. Cleared after 1.5 s. */
    interactedItemId = signal<string | null>(null);

    retryLoad(): void {
        this.state.retryLoad();
    }

    categoryLabel(category: string): string {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
}
