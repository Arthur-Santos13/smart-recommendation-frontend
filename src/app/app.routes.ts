import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            {
                path: 'home',
                loadComponent: () =>
                    import('./pages/home/home').then((m) => m.HomeComponent),
            },
            {
                path: 'items',
                loadComponent: () =>
                    import('./pages/items/items').then((m) => m.ItemsComponent),
            },
            {
                path: 'recommendations',
                loadComponent: () =>
                    import('./pages/recommendations/recommendations').then(
                        (m) => m.RecommendationsComponent
                    ),
            },
            {
                path: 'select-profile',
                loadComponent: () =>
                    import('./pages/select-profile/select-profile').then(
                        (m) => m.SelectProfileComponent
                    ),
            },
        ],
    },
    { path: '**', redirectTo: 'home' },
];
