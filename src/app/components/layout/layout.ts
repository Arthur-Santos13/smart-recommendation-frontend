import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserSessionService } from '../../services/user-session.service';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './layout.html',
    styleUrl: './layout.scss',
})
export class LayoutComponent implements OnInit {
    private readonly session = inject(UserSessionService);
    private readonly userService = inject(UserService);

    activeUserName = signal<string | null>(null);

    ngOnInit(): void {
        const userId = this.session.getUserId();
        if (!userId) return;
        this.userService.getById(userId).subscribe({
            next: (user) => this.activeUserName.set(user.name.split(' ')[0]),
            error: () => this.activeUserName.set(null),
        });
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
