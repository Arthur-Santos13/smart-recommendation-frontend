import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly api = inject(ApiService);

    /** Triggers a synchronous model retraining on the server. */
    retrain(): Observable<{ detail: string }> {
        return this.api.post<{ detail: string }>('/admin/retrain', {});
    }
}
