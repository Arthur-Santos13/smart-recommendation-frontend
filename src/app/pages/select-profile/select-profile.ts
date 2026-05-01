import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UserSessionService } from '../../services/user-session.service';
import { User } from '../../models/user.model';

interface PersonaInfo {
    label: string;
    icon: string;
    colorClass: string;
}

const PERSONA_MAP: Record<string, PersonaInfo> = {
    'alice@example.com': { label: 'Tech Enthusiast', icon: '💻', colorClass: 'avatar--tech' },
    'bruno@example.com': { label: 'Tech Enthusiast', icon: '💻', colorClass: 'avatar--tech' },
    'carlos@example.com': { label: 'Tech Enthusiast', icon: '💻', colorClass: 'avatar--tech' },
    'diana@example.com': { label: 'Business Analyst', icon: '📊', colorClass: 'avatar--business' },
    'eduardo@example.com': { label: 'Business Analyst', icon: '📊', colorClass: 'avatar--business' },
    'fernanda@example.com': { label: 'Business Analyst', icon: '📊', colorClass: 'avatar--business' },
    'gabriel@example.com': { label: 'Health Seeker', icon: '🏃', colorClass: 'avatar--health' },
    'helena@example.com': { label: 'Health Seeker', icon: '🏃', colorClass: 'avatar--health' },
    'igor@example.com': { label: 'Health Seeker', icon: '🏃', colorClass: 'avatar--health' },
    'julia@example.com': { label: 'Generalist', icon: '🌐', colorClass: 'avatar--generalist' },
    'klaus@example.com': { label: 'Generalist', icon: '🌐', colorClass: 'avatar--generalist' },
    'larissa@example.com': { label: 'Generalist', icon: '🌐', colorClass: 'avatar--generalist' },
};

const DEFAULT_PERSONA: PersonaInfo = { label: 'User', icon: '👤', colorClass: 'avatar--default' };

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

    persona(email: string): PersonaInfo {
        return PERSONA_MAP[email] ?? DEFAULT_PERSONA;
    }
}
