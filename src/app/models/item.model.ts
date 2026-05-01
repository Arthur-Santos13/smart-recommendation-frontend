export type ItemCategory =
    | 'technology'
    | 'science'
    | 'business'
    | 'health'
    | 'education'
    | 'general';

export interface Item {
    id: string;
    title: string;
    description: string | null;
    category: ItemCategory;
    tags: string | null;
    is_active: boolean;
}

export interface PaginatedItems {
    total: number;
    page: number;
    limit: number;
    items: Item[];
}
