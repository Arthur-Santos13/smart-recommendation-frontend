import { Injectable, signal } from '@angular/core';

const USER_ID_KEY = 'smart_rec_user_id';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
    /** Reactive signal — update whenever the active user changes. */
    readonly userId = signal<string | null>(localStorage.getItem(USER_ID_KEY));

    getUserId(): string | null {
        return this.userId();
    }

    setUserId(id: string): void {
        localStorage.setItem(USER_ID_KEY, id);
        this.userId.set(id);
    }

    clearUserId(): void {
        localStorage.removeItem(USER_ID_KEY);
        this.userId.set(null);
    }
}
