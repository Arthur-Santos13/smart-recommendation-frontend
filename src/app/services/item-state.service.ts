import { Injectable, inject, signal } from '@angular/core';
import { ItemService } from './item.service';
import { Item, PaginatedItems } from '../models/item.model';

interface ItemCacheEntry {
    data: PaginatedItems;
    cachedAt: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes — items change less frequently

@Injectable({ providedIn: 'root' })
export class ItemStateService {
    private readonly itemService = inject(ItemService);

    // ── Public state signals ─────────────────────────────────────────────────
    items = signal<Item[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    total = signal(0);

    private readonly cache = new Map<string, ItemCacheEntry>();
    private inflightKey: string | null = null;
    private lastParams: { page: number; limit: number; category: string } | null = null;

    private cacheKey(page: number, limit: number, category: string): string {
        return `${page}:${limit}:${category}`;
    }

    private getCached(page: number, limit: number, category: string): PaginatedItems | null {
        const key = this.cacheKey(page, limit, category);
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    // ── Load ─────────────────────────────────────────────────────────────────
    load(page: number, limit: number, category: string): void {
        this.lastParams = { page, limit, category };
        const key = this.cacheKey(page, limit, category);

        // Dedup: skip if the same request is already in-flight
        if (this.inflightKey === key) return;

        // Cache hit: serve immediately without an HTTP call
        const cached = this.getCached(page, limit, category);
        if (cached) {
            this.items.set(cached.items);
            this.total.set(cached.total);
            this.loading.set(false);
            this.error.set(null);
            return;
        }

        this.inflightKey = key;
        this.loading.set(true);
        this.error.set(null);

        this.itemService
            .getAll({ page, limit, ...(category ? { category } : {}) })
            .subscribe({
                next: (res) => {
                    this.cache.set(key, { data: res, cachedAt: Date.now() });
                    this.items.set(res.items);
                    this.total.set(res.total);
                    this.loading.set(false);
                    this.inflightKey = null;
                },
                error: (err) => {
                    this.error.set(err.message ?? 'Failed to load items.');
                    this.loading.set(false);
                    this.inflightKey = null;
                },
            });
    }

    retryLoad(): void {
        if (this.lastParams) {
            // Clear cache for the last key so retry always hits the network
            this.cache.delete(
                this.cacheKey(this.lastParams.page, this.lastParams.limit, this.lastParams.category)
            );
            this.load(this.lastParams.page, this.lastParams.limit, this.lastParams.category);
        }
    }
}
