import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserCreate, UserUpdate } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly api = inject(ApiService);

    getAll(): Observable<User[]> {
        return this.api.get<User[]>('/users/');
    }

    getById(id: string): Observable<User> {
        return this.api.get<User>(`/users/${id}`);
    }

    create(data: UserCreate): Observable<User> {
        return this.api.post<User>('/users/', data);
    }

    update(id: string, data: UserUpdate): Observable<User> {
        return this.api.put<User>(`/users/${id}`, data);
    }

    delete(id: string): Observable<void> {
        return this.api.delete<void>(`/users/${id}`);
    }
}
