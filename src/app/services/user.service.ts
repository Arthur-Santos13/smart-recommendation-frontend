import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly api = inject(ApiService);

    getAll(): Observable<User[]> {
        return this.api.get<User[]>('/users/');
    }

    getById(id: string): Observable<User> {
        return this.api.get<User>(`/users/${id}`);
    }
}
