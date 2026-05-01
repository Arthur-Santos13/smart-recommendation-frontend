import { Injectable, inject, signal } from '@angular/core';
import { RecommendationService } from './recommendation.service';
import { RecommendationItem } from '../models/recommendation.model';
import { ItemCategory } from '../models/item.model';

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

    // ── Load ─────────────────────────────────────────────────────────────────
    load(userId: string, category: ItemCategory | ''): void {
        this.lastUserId = userId;
        this.selectedCategory.set(category);
        this.loading.set(true);
        this.error.set(null);

        this.recService
            .getForUser(userId, { top_n: 20, ...(category ? { category } : {}) })
            .subscribe({
                next: (res) => {
                    this.recommendations.set(res.recommendations);
                    this.total.set(res.total);
                    this.loading.set(false);
                },
                error: (err) => {
                    this.error.set(err.message ?? 'Failed to load recommendations.');
                    this.loading.set(false);
                },
            });
    }

    retryLoad(): void {
        if (this.lastUserId !== null) {
            this.load(this.lastUserId, this.selectedCategory());
        }
    }
}
