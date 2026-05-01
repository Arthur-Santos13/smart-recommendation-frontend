import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RecommendationService } from '../../services/recommendation.service';
import { UserSessionService } from '../../services/user-session.service';
import { RecommendationItem } from '../../models/recommendation.model';
import { ItemCategory } from '../../models/item.model';

export const REC_CATEGORIES: { value: ItemCategory | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'technology', label: 'Technology' },
    { value: 'science', label: 'Science' },
    { value: 'business', label: 'Business' },
    { value: 'health', label: 'Health' },
    { value: 'education', label: 'Education' },
    { value: 'general', label: 'General' },
];

@Component({
    selector: 'app-recommendations',
    imports: [CommonModule],
    templateUrl: './recommendations.html',
    styleUrl: './recommendations.scss',
})
export class RecommendationsComponent implements OnInit {
    private readonly recommendationService = inject(RecommendationService);
    private readonly session = inject(UserSessionService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly categories = REC_CATEGORIES;

    recommendations = signal<RecommendationItem[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    total = signal(0);
    hasUser = signal(false);
    selectedCategory = signal<ItemCategory | ''>('');

    ngOnInit(): void {
        const userId = this.session.getUserId();
        if (!userId) {
            this.hasUser.set(false);
            this.loading.set(false);
            return;
        }
        this.hasUser.set(true);
        this.route.queryParams.subscribe((params) => {
            const category = (params['category'] as ItemCategory) ?? '';
            this.selectedCategory.set(category);
            this.loadRecommendations(userId);
        });
    }

    selectCategory(category: ItemCategory | ''): void {
        this.router.navigate([], {
            queryParams: { category: category || null },
            queryParamsHandling: 'merge',
        });
    }

    private loadRecommendations(userId: string): void {
        this.loading.set(true);
        this.error.set(null);
        const params = {
            top_n: 20,
            ...(this.selectedCategory() ? { category: this.selectedCategory() } : {}),
        };
        this.recommendationService.getForUser(userId, params).subscribe({
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

    scorePercent(score: number): number {
        return Math.round(score * 100);
    }

    categoryLabel(category: string): string {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    /**
     * Classifies the reason string produced by the backend into a display type.
     * 'similar'  → content-based: "Similar to 'X' that you interacted with"
     * 'activity' → fallback:      "Based on your activity"
     */
    reasonTypeOf(reason: string): 'similar' | 'activity' {
        return reason.toLowerCase().startsWith('similar to') ? 'similar' : 'activity';
    }

    /**
     * Extracts the referenced item title from a 'similar' reason string.
     * Returns null for fallback reasons.
     * Input: "Similar to 'API com Java' that you interacted with"
     * Output: "API com Java"
     */
    extractReasonTitle(reason: string): string | null {
        const match = reason.match(/Similar to '(.+?)'/i);
        return match ? match[1] : null;
    }
}
