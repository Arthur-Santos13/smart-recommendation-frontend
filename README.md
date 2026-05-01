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
ng build
```

Output is written to `dist/smart-recommendation-frontend/`. The build enables full AOT compilation, tree-shaking, and chunk splitting by default.
