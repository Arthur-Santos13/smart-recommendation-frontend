import { Injectable } from '@angular/core';

const USER_ID_KEY = 'smart_rec_user_id';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
    getUserId(): string | null {
        return localStorage.getItem(USER_ID_KEY);
    }

    setUserId(userId: string): void {
        localStorage.setItem(USER_ID_KEY, userId);
    }

    clearUserId(): void {
        localStorage.removeItem(USER_ID_KEY);
    }
}
