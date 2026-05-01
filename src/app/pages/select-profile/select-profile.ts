import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    imports: [CommonModule, FormsModule],
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
        this.loadUsers();
    }

    private loadUsers(): void {
        this.loading.set(true);
        this.error.set(null);
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

    // ── CRUD modal state ──────────────────────────────────────────────────────
    showCreateModal = signal(false);
    showEditModal = signal(false);
    showDeleteConfirm = signal(false);
    modalSaving = signal(false);
    modalError = signal<string | null>(null);

    userForm = signal<{ name: string; email: string }>({ name: '', email: '' });

    private pendingDeleteUser: User | null = null;
    private editingUserId: string | null = null;

    openCreateModal(): void {
        this.userForm.set({ name: '', email: '' });
        this.modalError.set(null);
        this.showCreateModal.set(true);
    }

    openEditModal(user: User, event: Event): void {
        event.stopPropagation();
        this.editingUserId = user.id;
        this.userForm.set({ name: user.name, email: user.email });
        this.modalError.set(null);
        this.showEditModal.set(true);
    }

    openDeleteConfirm(user: User, event: Event): void {
        event.stopPropagation();
        this.pendingDeleteUser = user;
        this.modalError.set(null);
        this.showDeleteConfirm.set(true);
    }

    closeModals(): void {
        this.showCreateModal.set(false);
        this.showEditModal.set(false);
        this.showDeleteConfirm.set(false);
        this.modalError.set(null);
        this.pendingDeleteUser = null;
        this.editingUserId = null;
    }

    saveUser(): void {
        const form = this.userForm();
        if (!form.name.trim() || !form.email.trim()) {
            this.modalError.set('Name and email are required.');
            return;
        }
        this.modalSaving.set(true);
        this.modalError.set(null);

        const payload = { name: form.name.trim(), email: form.email.trim() };

        const call$ = this.showCreateModal()
            ? this.userService.create(payload)
            : this.userService.update(this.editingUserId!, payload);

        call$.subscribe({
            next: () => {
                this.modalSaving.set(false);
                this.closeModals();
                this.loadUsers();
            },
            error: (err) => {
                this.modalError.set(err.message ?? 'Operation failed.');
                this.modalSaving.set(false);
            },
        });
    }

    confirmDelete(): void {
        if (!this.pendingDeleteUser) return;
        const id = this.pendingDeleteUser.id;
        this.modalSaving.set(true);
        this.modalError.set(null);
        this.userService.delete(id).subscribe({
            next: () => {
                this.modalSaving.set(false);
                // If active user was deleted, clear session
                if (this.session.getUserId() === id) {
                    this.session.clearUserId();
                    this.activeUserId.set(null);
                }
                this.closeModals();
                this.loadUsers();
            },
            error: (err) => {
                this.modalError.set(err.message ?? 'Delete failed.');
                this.modalSaving.set(false);
            },
        });
    }

    get pendingDeleteName(): string {
        return this.pendingDeleteUser?.name ?? '';
    }

    updateForm(field: string, value: string): void {
        this.userForm.update((f) => ({ ...f, [field]: value }));
    }
}
