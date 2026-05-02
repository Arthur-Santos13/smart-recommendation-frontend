import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { UserSessionService } from './user-session.service';
import { RecommendationStateService } from './recommendation-state.service';
import { EventType, UserEvent, UserEventCreate } from '../models/user-event.model';

@Injectable({ providedIn: 'root' })
export class InteractionService {
    private readonly api = inject(ApiService);
    private readonly session = inject(UserSessionService);
    private readonly recState = inject(RecommendationStateService);

    /**
     * Fire-and-forget: sends an event without blocking the UI flow.
     * Silently ignores errors so tracking never disrupts the user experience.
     * On success, invalidates the recommendation cache for the active user so
     * the next visit to the recommendations page fetches fresh results.
     */
    trackEvent(itemId: string, eventType: EventType): void {
        const userId = this.session.getUserId();
        if (!userId) return;

        const body: UserEventCreate = {
            user_id: userId,
            item_id: itemId,
            event_type: eventType,
        };
        this.api
            .post<UserEvent>('/events/', body)
            .pipe(catchError(() => of(null)))
            .subscribe(() => this.recState.invalidateUser(userId));
    }

    getUserEvents(userId: string): Observable<UserEvent[]> {
        return this.api.get<UserEvent[]>(`/events/user/${userId}`);
    }
}
