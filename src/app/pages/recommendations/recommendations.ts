import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UserSessionService } from '../../services/user-session.service';
import { RecommendationStateService } from '../../services/recommendation-state.service';
import { AdminService } from '../../services/admin.service';
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
    imports: [CommonModule, RouterLink],
    templateUrl: './recommendations.html',
    styleUrl: './recommendations.scss',
})
export class RecommendationsComponent implements OnInit {
    readonly state = inject(RecommendationStateService);
    private readonly session = inject(UserSessionService);
    private readonly admin = inject(AdminService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly categories = REC_CATEGORIES;
    hasUser = false;
    retraining = signal(false);

    ngOnInit(): void {
        const userId = this.session.getUserId();
        if (!userId) {
            this.hasUser = false;
            this.state.loading.set(false);
            return;
        }
        this.hasUser = true;
        this.route.queryParams.subscribe((params) => {
            const category = (params['category'] as ItemCategory) ?? '';
            this.state.load(userId, category);
        });
    }

    selectCategory(category: ItemCategory | ''): void {
        this.router.navigate([], {
            queryParams: { category: category || null },
            queryParamsHandling: 'merge',
        });
    }

    /**
     * Triggers a server-side model retraining (POST /admin/retrain) and then
     * forces a fresh fetch of recommendations. Called from the pendingRefresh banner.
     */
    retrain(): void {
        if (this.retraining()) return;
        this.retraining.set(true);
        this.admin.retrain().subscribe({
            next: () => {
                this.state.forceLoad();
                this.retraining.set(false);
            },
            error: () => {
                // Retraining failed — still force-refresh so the user gets the latest
                // results from the current model.
                this.state.forceLoad();
                this.retraining.set(false);
            },
        });
    }

    scorePercent(score: number): number {
        return Math.round(score * 100);
    }

    categoryLabel(category: string): string {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    reasonTypeOf(reason: string): 'similar' | 'activity' {
        return reason.toLowerCase().startsWith('similar to') ? 'similar' : 'activity';
    }

    extractReasonTitle(reason: string): string | null {
        const match = reason.match(/Similar to '(.+?)'/i);
        return match ? match[1] : null;
    }
}
