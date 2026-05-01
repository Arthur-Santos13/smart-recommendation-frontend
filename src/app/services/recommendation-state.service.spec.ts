import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RecommendationStateService } from './recommendation-state.service';
import { RecommendationService } from './recommendation.service';
import { RecommendationResponse } from '../models/recommendation.model';
import { environment } from '../../environments/environment';

const mockResponse: RecommendationResponse = {
    user_id: 'user-1',
    total: 2,
    recommendations: [
        { item_id: 'item-1', score: 0.9, reason: "Similar to 'AI Basics'", category: 'technology' },
        { item_id: 'item-2', score: 0.7, reason: 'Based on your activity', category: 'science' },
    ],
};

describe('RecommendationStateService', () => {
    let service: RecommendationStateService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(RecommendationStateService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created with initial signal values', () => {
        expect(service).toBeTruthy();
        expect(service.recommendations()).toEqual([]);
        expect(service.loading()).toBeFalse();
        expect(service.error()).toBeNull();
        expect(service.total()).toBe(0);
        expect(service.pendingRefresh()).toBeFalse();
    });

    it('load() sets loading=true then populates recommendations on success', fakeAsync(() => {
        service.load('user-1', '');

        expect(service.loading()).toBeTrue();

        const req = httpMock.expectOne((r) =>
            r.url.includes('/recommendations/user-1')
        );
        req.flush(mockResponse);
        tick();

        expect(service.loading()).toBeFalse();
        expect(service.recommendations()).toEqual(mockResponse.recommendations);
        expect(service.total()).toBe(2);
        expect(service.error()).toBeNull();
        expect(service.pendingRefresh()).toBeFalse();
    }));

    it('load() sets error signal on HTTP failure', fakeAsync(() => {
        service.load('user-1', '');

        const req = httpMock.expectOne((r) =>
            r.url.includes('/recommendations/user-1')
        );
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
        tick();

        expect(service.loading()).toBeFalse();
        expect(service.error()).toBeTruthy();
    }));

    it('load() serves from cache on second call with same params (no second HTTP request)', fakeAsync(() => {
        service.load('user-1', '');
        httpMock.expectOne((r) => r.url.includes('/recommendations/user-1')).flush(mockResponse);
        tick();

        // Second call — must NOT produce a new HTTP request
        service.load('user-1', '');
        httpMock.expectNone((r) => r.url.includes('/recommendations/user-1'));

        expect(service.recommendations()).toEqual(mockResponse.recommendations);
    }));

    it('load() deduplicates in-flight requests', () => {
        service.load('user-1', '');
        service.load('user-1', ''); // duplicate while first is in-flight

        // Only one HTTP call should be pending
        const req = httpMock.expectOne((r) => r.url.includes('/recommendations/user-1'));
        expect(req).toBeTruthy();
    });

    it('invalidateUser() sets pendingRefresh when userId matches active user', fakeAsync(() => {
        service.load('user-1', '');
        httpMock.expectOne((r) => r.url.includes('/recommendations/user-1')).flush(mockResponse);
        tick();

        service.invalidateUser('user-1');

        expect(service.pendingRefresh()).toBeTrue();
    }));

    it('invalidateUser() does not set pendingRefresh for a different user', fakeAsync(() => {
        service.load('user-1', '');
        httpMock.expectOne((r) => r.url.includes('/recommendations/user-1')).flush(mockResponse);
        tick();

        service.invalidateUser('user-99');

        expect(service.pendingRefresh()).toBeFalse();
    }));

    it('forceLoad() bypasses cache and fires a new HTTP request', fakeAsync(() => {
        // Prime the cache
        service.load('user-1', '');
        httpMock.expectOne((r) => r.url.includes('/recommendations/user-1')).flush(mockResponse);
        tick();

        // Force a refresh — must produce a NEW HTTP request despite cached data
        service.forceLoad();

        const req = httpMock.expectOne((r) => r.url.includes('/recommendations/user-1'));
        req.flush({ ...mockResponse, total: 3 });
        tick();

        expect(service.total()).toBe(3);
        expect(service.pendingRefresh()).toBeFalse();
    }));

    it('retryLoad() re-fetches with the last used params', fakeAsync(() => {
        service.load('user-1', 'technology');
        httpMock.expectOne((r) => r.url.includes('/recommendations/user-1')).flush(mockResponse);
        tick();

        // Invalidate so cache is cleared, then retry
        service.invalidateUser('user-1');
        service.retryLoad();

        httpMock.expectOne((r) => r.url.includes('/recommendations/user-1')).flush(mockResponse);
        tick();

        expect(service.recommendations()).toEqual(mockResponse.recommendations);
    }));
});
