import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemStateService } from '../../services/item-state.service';
import { ItemService } from '../../services/item.service';
import { InteractionService } from '../../services/interaction.service';
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
    imports: [CommonModule, FormsModule],
    templateUrl: './items.html',
    styleUrl: './items.scss',
})
export class ItemsComponent implements OnInit {
    readonly state = inject(ItemStateService);
    private readonly itemService = inject(ItemService);
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

    constructor() { }

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

    categoryIcon(category: string): string {
        const map: Record<string, string> = {
            technology: '💻',
            science: '🔬',
            business: '📈',
            health: '🏃',
            education: '📚',
            general: '🌐',
        };
        return map[category] ?? '📄';
    }

    // ── CRUD modal state ──────────────────────────────────────────────────────
    readonly itemCategories = ITEM_CATEGORIES.filter((c) => c.value !== '');

    showCreateModal = signal(false);
    showEditModal = signal(false);
    showDeleteConfirm = signal(false);
    modalSaving = signal(false);
    modalError = signal<string | null>(null);

    itemForm = signal<{ title: string; description: string; category: ItemCategory; tags: string }>({
        title: '',
        description: '',
        category: 'general',
        tags: '',
    });

    private pendingDeleteItem: Item | null = null;
    private editingItemId: string | null = null;

    openCreateModal(): void {
        this.itemForm.set({ title: '', description: '', category: 'general', tags: '' });
        this.modalError.set(null);
        this.showCreateModal.set(true);
    }

    openEditModal(item: Item, event: Event): void {
        event.stopPropagation();
        this.editingItemId = item.id;
        this.itemForm.set({
            title: item.title,
            description: item.description ?? '',
            category: item.category,
            tags: item.tags ?? '',
        });
        this.modalError.set(null);
        this.showEditModal.set(true);
    }

    openDeleteConfirm(item: Item, event: Event): void {
        event.stopPropagation();
        this.pendingDeleteItem = item;
        this.modalError.set(null);
        this.showDeleteConfirm.set(true);
    }

    closeModals(): void {
        this.showCreateModal.set(false);
        this.showEditModal.set(false);
        this.showDeleteConfirm.set(false);
        this.modalError.set(null);
        this.pendingDeleteItem = null;
        this.editingItemId = null;
    }

    saveItem(): void {
        const form = this.itemForm();
        if (!form.title.trim()) {
            this.modalError.set('Title is required.');
            return;
        }
        this.modalSaving.set(true);
        this.modalError.set(null);

        const payload = {
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category,
            tags: form.tags.trim() || null,
        };

        const call$ = this.showCreateModal()
            ? this.itemService.create(payload)
            : this.itemService.update(this.editingItemId!, payload);

        call$.subscribe({
            next: () => {
                this.modalSaving.set(false);
                this.closeModals();
                this.state.invalidateAll();
            },
            error: (err) => {
                this.modalError.set(err.message ?? 'Operation failed.');
                this.modalSaving.set(false);
            },
        });
    }

    confirmDelete(): void {
        if (!this.pendingDeleteItem) return;
        const id = this.pendingDeleteItem.id;
        this.modalSaving.set(true);
        this.modalError.set(null);
        this.itemService.delete(id).subscribe({
            next: () => {
                this.modalSaving.set(false);
                this.closeModals();
                this.state.invalidateAll();
            },
            error: (err) => {
                this.modalError.set(err.message ?? 'Delete failed.');
                this.modalSaving.set(false);
            },
        });
    }

    get pendingDeleteTitle(): string {
        return this.pendingDeleteItem?.title ?? '';
    }

    updateForm(field: string, value: string): void {
        this.itemForm.update((f) => ({ ...f, [field]: value }));
    }
}
