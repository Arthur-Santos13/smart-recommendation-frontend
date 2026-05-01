import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecommendationService } from '../../services/recommendation.service';
import { UserSessionService } from '../../services/user-session.service';
import { RecommendationItem } from '../../models/recommendation.model';

@Component({
    selector: 'app-recommendations',
    imports: [CommonModule],
    templateUrl: './recommendations.html',
    styleUrl: './recommendations.scss',
})
export class RecommendationsComponent implements OnInit {
    private readonly recommendationService = inject(RecommendationService);
    private readonly session = inject(UserSessionService);

    recommendations = signal<RecommendationItem[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    total = signal(0);
    hasUser = signal(false);

    ngOnInit(): void {
        const userId = this.session.getUserId();
        if (!userId) {
            this.hasUser.set(false);
            this.loading.set(false);
            return;
        }
        this.hasUser.set(true);
        this.loadRecommendations(userId);
    }

    private loadRecommendations(userId: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.recommendationService.getForUser(userId, { top_n: 20 }).subscribe({
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
}
