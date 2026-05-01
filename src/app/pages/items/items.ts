import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Item, ItemCategory } from '../../models/item.model';

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
    private readonly itemService = inject(ItemService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly categories = ITEM_CATEGORIES;
    readonly sortOptions = SORT_OPTIONS;

    items = signal<Item[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    total = signal(0);

    selectedCategory = signal<ItemCategory | ''>('');
    currentPage = signal(1);
    selectedSort = signal<SortOption>('title_asc');
    readonly limit = 12;

    totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));
    hasPrev = computed(() => this.currentPage() > 1);
    hasNext = computed(() => this.currentPage() < this.totalPages());

    sortedItems = computed(() => {
        const list = [...this.items()];
        return this.selectedSort() === 'title_asc'
            ? list.sort((a, b) => a.title.localeCompare(b.title))
            : list.sort((a, b) => b.title.localeCompare(a.title));
    });

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            const category = (params['category'] as ItemCategory) ?? '';
            const page = Number(params['page'] ?? 1);
            const sort = (params['sort'] as SortOption) ?? 'title_asc';
            this.selectedCategory.set(category);
            this.currentPage.set(page);
            this.selectedSort.set(sort);
            this.loadItems();
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

    private loadItems(): void {
        this.loading.set(true);
        this.error.set(null);
        const params = {
            page: this.currentPage(),
            limit: this.limit,
            ...(this.selectedCategory() ? { category: this.selectedCategory() } : {}),
        };
        this.itemService.getAll(params).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.total.set(res.total);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err.message ?? 'Failed to load items.');
                this.loading.set(false);
            },
        });
    }

    categoryLabel(category: string): string {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
}
