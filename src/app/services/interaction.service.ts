import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { EventType, UserEvent, UserEventCreate } from '../models/user-event.model';

@Injectable({ providedIn: 'root' })
export class InteractionService {
    private readonly api = inject(ApiService);

    trackEvent(userId: string, itemId: string, eventType: EventType): void {
        const body: UserEventCreate = {
            user_id: userId,
            item_id: itemId,
            event_type: eventType,
        };
        this.api
            .post<UserEvent>('/user-events/', body)
            .pipe(catchError(() => of(null)))
            .subscribe();
    }

    getUserEvents(userId: string): Observable<UserEvent[]> {
        return this.api.get<UserEvent[]>(`/user-events/user/${userId}`);
    }
}
