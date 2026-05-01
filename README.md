# SmartRecommendation — Frontend

Angular 20 client for the [SmartRecommendation API](../smart-recommendation-api/README.md). Displays personalised item recommendations driven by a hybrid collaborative-filtering + content-based ML engine, with full CRUD management for items and users.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Pages & Routing](#pages--routing)
- [Service Layer](#service-layer)
- [Recommendation API Integration](#recommendation-api-integration)
- [User Interaction Flow](#user-interaction-flow)
- [State Management](#state-management)
- [HTTP Client & Error Handling](#http-client--error-handling)
- [Data Models](#data-models)
- [Running Tests](#running-tests)
- [Building for Production](#building-for-production)
- [Docker](#docker)
- [Project Roadmap](#project-roadmap)

---

## Getting Started

**Prerequisites:** Node 22+, Angular CLI 20.

```bash
# Install dependencies
npm install

# Start the development server
ng serve
```

Navigate to `http://localhost:4200`. The backend API must be running at `http://localhost:8000` (see `src/environments/environment.ts`).

---

## Project Architecture

```
src/app/
├── components/
│   └── layout/          # Shell layout: sidebar nav + <router-outlet>
├── core/
│   ├── guards/          # Route guards
│   └── interceptors/    # HTTP interceptors (error handler)
├── models/              # TypeScript interfaces for all API contracts
├── pages/               # One directory per lazy-loaded route
│   ├── home/
│   ├── items/
│   ├── recommendations/
│   └── select-profile/
└── services/            # Stateful services (signals) + raw API wrappers
```

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| Standalone components | Every component uses `imports: [...]`, no `NgModule` |
| Signals-based state | `signal()`, `computed()`, `effect()` replace RxJS subjects for UI state |
| Thin components | Components delegate all HTTP and cache logic to services |
| Lazy routing | Each page is loaded on-demand via `loadComponent` |
| Single HTTP wrapper | `ApiService` owns all `HttpClient` calls; services never touch `HttpClient` directly |

---

## Pages & Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/home` | `HomeComponent` | Landing dashboard with navigation cards |
| `/items` | `ItemsComponent` | Paginated item catalogue with category filter, sort, and CRUD |
| `/recommendations` | `RecommendationsComponent` | Personalised recommendation list with explainability |
| `/select-profile` | `SelectProfileComponent` | User profile selector with CRUD |
| `/**` | — | Redirects to `/home` |

Routes are defined in `src/app/app.routes.ts`. The shell `LayoutComponent` wraps all routes, providing the navigation sidebar.

---

## Service Layer

### `ApiService`
Base HTTP wrapper. All services inject `ApiService` instead of `HttpClient` directly.

```
GET  /…        → api.get<T>(path, params?)
POST /…        → api.post<T>(path, body)
PUT  /…        → api.put<T>(path, body)
DELETE /…      → api.delete<T>(path)
```

Base URL is read from `environment.apiBaseUrl` (`http://localhost:8000/api/v1` by default).

### `UserSessionService`
Persists the active user ID in `localStorage` under the key `smart_rec_user_id`.

```typescript
getUserId(): string | null
setUserId(id: string): void
clearUserId(): void
```

### `ItemService` / `UserService`
Thin wrappers over `ApiService` for raw CRUD operations on the `/items/` and `/users/` endpoints.

### `ItemStateService`
Stateful layer over `ItemService`. Manages a 3-minute TTL in-memory cache keyed by `page:limit:category`. Exposes Angular signals for reactive template bindings.

### `RecommendationStateService`
Stateful layer over `RecommendationService`. Manages a 5-minute TTL cache keyed by `userId:category`. See [Recommendation API Integration](#recommendation-api-integration) for the full flow.

### `InteractionService`
Fire-and-forget bridge between user clicks/views and the recommendation engine. See [User Interaction Flow](#user-interaction-flow).

---

## Recommendation API Integration

The recommendation pipeline connects the frontend to the hybrid ML engine exposed at `GET /api/v1/recommendations/{user_id}`.

### Request

```
GET /api/v1/recommendations/{user_id}?top_n=20[&category=technology]
```

Parameters are forwarded by `RecommendationService.getForUser()` and assembled in `RecommendationStateService.load()`.

### Response shape

```jsonc
{
  "user_id": "uuid",
  "total": 12,
  "recommendations": [
    {
      "item_id": "uuid",
      "score": 0.92,           // normalised similarity score [0, 1]
      "reason": "Similar to 'Machine Learning 101'",
      "category": "technology"
    }
  ]
}
```

### Explainability

Each recommendation exposes a human-readable `reason` string. The frontend classifies it into one of two visual types:

| `reasonTypeOf(reason)` | Condition | Icon | Template text |
|------------------------|-----------|------|---------------|
| `'similar'` | reason starts with `"Similar to"` | 🔗 | "Recommended because you interacted with **'`<title>`'**" |
| `'activity'` | everything else | 📊 | "Recommended based on your browsing activity" |

`extractReasonTitle()` uses a regex (`/'([^']+)'/`) to pull the item title out of the reason string for the `'similar'` variant.

### Category filter

A chip bar on the recommendations page calls `RecommendationStateService.load(userId, category)`. An empty string means "all categories". The selected category is reflected in `state.selectedCategory()`.

---

## User Interaction Flow

Every user action feeds back into the recommendation engine through the following pipeline:

```
User views items page
        │
        ▼
effect() fires on state.items() change
        │
        ▼
InteractionService.trackEvent(itemId, 'view')  ← for each visible item
        │
User clicks an item card
        │
        ▼
InteractionService.trackEvent(itemId, 'click')
        │
        ▼
POST /api/v1/user-events/
{ user_id, item_id, event_type }
        │
     success
        │
        ▼
RecommendationStateService.invalidateUser(userId)
  • evicts all cached recommendation entries for this user
  • sets pendingRefresh signal → true
        │
        ▼
Refresh banner appears on /recommendations
"✨ Your activity has been updated"
        │
User clicks "Refresh"
        │
        ▼
RecommendationStateService.forceLoad()
  • clears inflight key
  • calls load() bypassing the cache
        │
        ▼
Fresh recommendations rendered
```

### Fire-and-forget contract

`InteractionService.trackEvent()` never throws. Errors are swallowed via `catchError(() => of(null))`. The UI flow is never blocked by a failed event post.

### No-op guard

If `UserSessionService.getUserId()` returns `null`, `trackEvent()` exits immediately without making any HTTP call.

---

## State Management

The app uses Angular Signals as the primary reactivity primitive. There is no NgRx or external state library.

### Pattern

```typescript
// Service exposes writable signals
items    = signal<Item[]>([]);
loading  = signal(false);
error    = signal<string | null>(null);

// Component reads via computed or direct signal call
sortedItems = computed(() =>
  [...this.state.items()].sort(/* … */)
);
```

### Cache strategy

Both `ItemStateService` and `RecommendationStateService` implement an in-memory TTL cache:

| Service | TTL | Cache key |
|---------|-----|-----------|
| `ItemStateService` | 3 min | `page:limit:category` |
| `RecommendationStateService` | 5 min | `userId:category` |

Duplicate in-flight requests are deduplicated via an `inflightKey` guard — a second identical call while the first is pending is silently dropped.

---

## HTTP Client & Error Handling

`provideHttpClient(withInterceptors([errorInterceptor]))` is registered in `app.config.ts`.

The `errorInterceptor` normalises all `HttpErrorResponse` objects into a consistent `{ status, message }` shape before re-throwing:

| Status | User-facing message |
|--------|---------------------|
| `0` | Unable to reach the server |
| `400` | `error.detail` or "Bad request" |
| `401` | Unauthorized |
| `403` | Permission denied |
| `404` | Resource not found |
| `422` | `error.detail` or "Validation error" |
| `429` | Too many requests |
| `5xx` | Server error — try again later |

Services bind the normalised `err.message` to their `error` signal, which is rendered directly in the template.

---

## Data Models

All models live in `src/app/models/`.

### `Item`

```typescript
interface Item {
  id: string;
  title: string;
  description: string | null;
  category: ItemCategory;   // 'technology' | 'science' | 'business' | 'health' | 'education' | 'general'
  tags: string | null;
  is_active: boolean;
}
```

### `RecommendationItem`

```typescript
interface RecommendationItem {
  item_id: string;
  score: number;    // [0, 1]
  reason: string;
  category: string;
}
```

### `UserEvent`

```typescript
interface UserEvent {
  user_id: string;
  item_id: string;
  event_type: EventType;   // 'view' | 'click'
}
```

---

## Running Tests

```bash
# Run all tests once (headless)
ng test --watch=false --browsers=ChromeHeadless

# Run in watch mode (interactive)
ng test
```

Test coverage spans:

| File | What's tested |
|------|---------------|
| `user-session.service.spec.ts` | localStorage persistence |
| `recommendation-state.service.spec.ts` | TTL cache, dedup, `invalidateUser`, `forceLoad`, `retryLoad` |
| `item-state.service.spec.ts` | TTL cache, dedup, `invalidateAll`, `retryLoad` |
| `interaction.service.spec.ts` | fire-and-forget, no-op guard, `invalidateUser` call-through |
| `recommendations.spec.ts` | pure helpers + DOM rendering states |
| `items.spec.ts` | `sortedItems` computed, `categoryIcon`, `categoryLabel` |

---

## Building for Production

```bash
# Standard production build
npm run build:prod

# Build + emit webpack stats JSON (for bundle analysis)
npm run build:stats

# Build and verify index.html is present in the output
npm run build:validate
```

Output is written to `dist/smart-recommendation-frontend/browser/`. The build enables full AOT compilation, tree-shaking, chunk splitting, critical CSS inlining, and font inlining by default.

### Bundle budgets

| Budget type | Warning | Error |
|-------------|---------|-------|
| Initial bundle | 400 kB | 800 kB |
| Any component stylesheet | 13 kB | 20 kB |

---

## Docker

The frontend ships as a two-stage Docker image: Node 22 compiles the Angular app, nginx 1.27 serves the static output.

### Build the image

```bash
docker build -t smart-recommendation-frontend .
```

### Run the container

```bash
docker run -p 8080:80 smart-recommendation-frontend
```

Open `http://localhost:8080`. In production the container expects the API to be reachable at `/api/v1` (proxied by the same nginx or an upstream reverse proxy). To point at a different backend, override `environment.prod.ts` before building or mount a custom nginx config.

### nginx highlights

- Angular SPA fallback: all routes resolve to `index.html` via `try_files`
- Content-hashed assets (`*.js`, `*.css`, fonts) are served with `Cache-Control: public, immutable` and a 1-year expiry
- `index.html` itself is served with `no-store` to ensure users always receive the latest shell
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-XSS-Protection`

---

## Project Roadmap

All 14 phases of the frontend roadmap are complete.

- [x] **Phase 1 — Project Setup**: Angular 20 workspace, SCSS global tokens, dark theme, `ApiService`, environment files, `LayoutComponent` shell with sidebar nav
- [x] **Phase 2 — Base API Integration**: `HttpClient` wired via `provideHttpClient`, `errorInterceptor` registered, base URL from `environment.apiBaseUrl`, all HTTP verbs on `ApiService`
- [x] **Phase 3 — Domain Base (Users & Items)**: TypeScript models for `User`, `Item`, `UserEvent`, `RecommendationItem`; `UserService` and `ItemService` raw CRUD wrappers; `UserSessionService` with localStorage persistence
- [x] **Phase 4 — Listing with Filters**: `ItemsComponent` paginated grid, category chip filter, A→Z / Z→A sort, `ItemStateService` with 3-min TTL cache and in-flight deduplication
- [x] **Phase 5 — User Interactions**: `SelectProfileComponent` profile picker, `InteractionService` fire-and-forget event tracking (`view` / `click`), session stored in localStorage
- [x] **Phase 6 — Recommendations Page**: `RecommendationsComponent`, `RecommendationStateService` with 5-min TTL cache, loading skeleton, error state, empty state
- [x] **Phase 7 — Recommendation Filters**: Category chip bar on recommendations page, filter state reflected in `state.selectedCategory()`, cache keyed by `userId:category`
- [x] **Phase 8 — Explainability**: `reasonTypeOf()` and `extractReasonTitle()` classify each recommendation as `'similar'` or `'activity'`; distinct icons and explanation copy per type
- [x] **Phase 9 — UX & Feedback**: Loading skeletons, error banners with retry, empty states with CTAs, card interaction highlight (1.5 s pulse), per-category gradient thumbnails with emoji icons
- [x] **Phase 10 — State & Optimisations**: `computed()` signals for derived values, `effect()` for side-effect tracking, `invalidateAll()` on `ItemStateService`, `forceLoad()` / `retryLoad()` on `RecommendationStateService`
- [x] **Phase 11 — Full Integration**: Interaction → recommendation feedback loop wired end-to-end; `invalidateUser()` on success; `pendingRefresh` signal; refresh banner on recommendations page; inline CRUD modals for items and users
- [x] **Phase 12 — Tests**: Jasmine unit tests for all services (`UserSessionService`, `ItemStateService`, `RecommendationStateService`, `InteractionService`) and page components (`RecommendationsComponent`, `ItemsComponent`); 73 specs, all passing
- [x] **Phase 13 — Technical README**: Architecture overview, API integration contract, user interaction flow diagram, state management strategy, HTTP error table, data models, test coverage map
- [x] **Phase 14 — Production Build & Final Documentation**: Production `angular.json` configuration with critical CSS inlining and font inlining, `.browserslistrc` for modern-only targets, two-stage Docker image with nginx, bundle budgets, `build:prod` / `build:validate` scripts, final README with roadmap checklist
