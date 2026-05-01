import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';

@Component({
    selector: 'app-items',
    imports: [CommonModule],
    templateUrl: './items.html',
    styleUrl: './items.scss',
})
export class ItemsComponent implements OnInit {
    private readonly itemService = inject(ItemService);

    items = signal<Item[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);

    ngOnInit(): void {
        this.itemService.getAll({ page: 1, limit: 20 }).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err.message ?? 'Failed to load items.');
                this.loading.set(false);
            },
        });
    }

    categoryLabel(category: string): string {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
}
