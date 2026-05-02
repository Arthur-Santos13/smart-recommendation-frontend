export interface RecommendationItem {
    item_id: string;
    title: string;
    score: number;
    reason: string;
    category: string;
}

export interface RecommendationResponse {
    user_id: string;
    total: number;
    recommendations: RecommendationItem[];
}

export interface RecommendationParams {
    top_n?: number;
    category?: string;
}
