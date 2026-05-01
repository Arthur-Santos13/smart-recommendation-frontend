import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Item, ItemCreate, ItemUpdate, PaginatedItems } from '../models/item.model';

export interface ItemListParams {
    page?: number;
    limit?: number;
    category?: string;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
    private readonly api = inject(ApiService);

    getAll(params?: ItemListParams): Observable<PaginatedItems> {
        const cleaned = Object.fromEntries(
            Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '')
        ) as Record<string, string | number | boolean>;
        return this.api.get<PaginatedItems>('/items/', cleaned);
    }

    getById(id: string): Observable<Item> {
        return this.api.get<Item>(`/items/${id}`);
    }

    create(data: ItemCreate): Observable<Item> {
        return this.api.post<Item>('/items/', data);
    }

    update(id: string, data: ItemUpdate): Observable<Item> {
        return this.api.put<Item>(`/items/${id}`, data);
    }

    delete(id: string): Observable<void> {
        return this.api.delete<void>(`/items/${id}`);
    }
}
