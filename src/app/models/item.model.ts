export type ItemCategory =
    | 'technology'
    | 'science'
    | 'business'
    | 'health'
    | 'education'
    | 'general';

export interface ItemCreate {
    title: string;
    description?: string | null;
    category: ItemCategory;
    tags?: string | null;
}

export interface ItemUpdate {
    title?: string | null;
    description?: string | null;
    category?: ItemCategory | null;
    tags?: string | null;
}

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
