import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UserSessionService } from '../../services/user-session.service';
import { User } from '../../models/user.model';

@Component({
    selector: 'app-select-profile',
    imports: [CommonModule],
    templateUrl: './select-profile.html',
    styleUrl: './select-profile.scss',
})
export class SelectProfileComponent implements OnInit {
    private readonly userService = inject(UserService);
    private readonly session = inject(UserSessionService);
    private readonly router = inject(Router);

    users = signal<User[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    activeUserId = signal<string | null>(null);

    ngOnInit(): void {
        this.activeUserId.set(this.session.getUserId());
        this.userService.getAll().subscribe({
            next: (users) => {
                this.users.set(users.filter((u) => u.is_active));
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err.message ?? 'Failed to load profiles.');
                this.loading.set(false);
            },
        });
    }

    selectUser(user: User): void {
        this.session.setUserId(user.id);
        this.activeUserId.set(user.id);
        this.router.navigate(['/recommendations']);
    }

    initials(name: string): string {
        return name
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    }
}
