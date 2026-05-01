import { Injectable, inject, signal } from '@angular/core';
import { RecommendationService } from './recommendation.service';
import { RecommendationItem, RecommendationResponse } from '../models/recommendation.model';
import { ItemCategory } from '../models/item.model';

interface CacheEntry {
    data: RecommendationResponse;
    cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class RecommendationStateService {
    private readonly recService = inject(RecommendationService);

    // ── Public state signals ─────────────────────────────────────────────────
    recommendations = signal<RecommendationItem[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    total = signal(0);
    selectedCategory = signal<ItemCategory | ''>('');

    private lastUserId: string | null = null;

    // ── Cache ─────────────────────────────────────────────────────────────────
    private readonly cache = new Map<string, CacheEntry>();
    private inflightKey: string | null = null;

    private cacheKey(userId: string, category: ItemCategory | ''): string {
        return `${userId}:${category}`;
    }

    private getCached(userId: string, category: ItemCategory | ''): RecommendationResponse | null {
        const key = this.cacheKey(userId, category);
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    private setCached(userId: string, category: ItemCategory | '', data: RecommendationResponse): void {
        this.cache.set(this.cacheKey(userId, category), { data, cachedAt: Date.now() });
    }

    /** Removes all cached entries for a given user (call after an interaction event). */
    invalidateUser(userId: string): void {
        const prefix = `${userId}:`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) this.cache.delete(key);
        }
    }

    // ── Load ─────────────────────────────────────────────────────────────────
    load(userId: string, category: ItemCategory | ''): void {
        this.lastUserId = userId;
        this.selectedCategory.set(category);

        const key = this.cacheKey(userId, category);

        // Dedup: skip if an identical request is already in-flight
        if (this.inflightKey === key) return;

        const cached = this.getCached(userId, category);
        if (cached) {
            this.recommendations.set(cached.recommendations);
            this.total.set(cached.total);
            this.loading.set(false);
            this.error.set(null);
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.inflightKey = key;

        this.recService
            .getForUser(userId, { top_n: 20, ...(category ? { category } : {}) })
            .subscribe({
                next: (res) => {
                    this.setCached(userId, category, res);
                    this.recommendations.set(res.recommendations);
                    this.total.set(res.total);
                    this.loading.set(false);
                    this.inflightKey = null;
                },
                error: (err) => {
                    this.error.set(err.message ?? 'Failed to load recommendations.');
                    this.loading.set(false);
                    this.inflightKey = null;
                },
            });
    }

    retryLoad(): void {
        if (this.lastUserId !== null) {
            this.load(this.lastUserId, this.selectedCategory());
        }
    }
}
