import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { RecommendationParams, RecommendationResponse } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
    private readonly api = inject(ApiService);

    getForUser(userId: string, params?: RecommendationParams): Observable<RecommendationResponse> {
        const cleanParams: Record<string, string | number | boolean> = {};
        if (params?.top_n != null) cleanParams['top_n'] = params.top_n;
        if (params?.category) cleanParams['category'] = params.category;
        return this.api.get<RecommendationResponse>(`/recommendations/hybrid/${userId}`, cleanParams);
    }
}
