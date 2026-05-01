import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Item, PaginatedItems } from '../models/item.model';

export interface ItemListParams {
    page?: number;
    limit?: number;
    category?: string;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
    private readonly api = inject(ApiService);

    getAll(params?: ItemListParams): Observable<PaginatedItems> {
        return this.api.get<PaginatedItems>('/items/', params as Record<string, string | number | boolean>);
    }

    getById(id: string): Observable<Item> {
        return this.api.get<Item>(`/items/${id}`);
    }
}
