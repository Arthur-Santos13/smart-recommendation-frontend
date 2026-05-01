import { Component, OnInit, inject, signal } from '@angular/core';
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

    items = signal<Item[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    total = signal(0);

    selectedCategory = signal<ItemCategory | ''>('');
    currentPage = signal(1);
    readonly limit = 12;

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            const category = (params['category'] as ItemCategory) ?? '';
            const page = Number(params['page'] ?? 1);
            this.selectedCategory.set(category);
            this.currentPage.set(page);
            this.loadItems();
        });
    }

    selectCategory(category: ItemCategory | ''): void {
        this.router.navigate([], {
            queryParams: { category: category || null, page: 1 },
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
