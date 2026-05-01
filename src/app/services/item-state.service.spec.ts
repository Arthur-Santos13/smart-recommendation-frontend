import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ItemStateService } from './item-state.service';
import { PaginatedItems } from '../models/item.model';

const mockPage: PaginatedItems = {
    total: 2,
    page: 1,
    limit: 12,
    items: [
        { id: 'item-1', title: 'Item One', description: null, category: 'technology', tags: null, is_active: true },
        { id: 'item-2', title: 'Item Two', description: 'Desc', category: 'science', tags: 'a,b', is_active: true },
    ],
};

describe('ItemStateService', () => {
    let service: ItemStateService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(ItemStateService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created with initial signal values', () => {
        expect(service).toBeTruthy();
        expect(service.items()).toEqual([]);
        expect(service.loading()).toBeFalse();
        expect(service.error()).toBeNull();
        expect(service.total()).toBe(0);
    });

    it('load() sets loading=true then populates items on success', fakeAsync(() => {
        service.load(1, 12, '');

        expect(service.loading()).toBeTrue();

        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        expect(service.loading()).toBeFalse();
        expect(service.items()).toEqual(mockPage.items);
        expect(service.total()).toBe(2);
        expect(service.error()).toBeNull();
    }));

    it('load() sets error signal on failure', fakeAsync(() => {
        service.load(1, 12, '');

        httpMock
            .expectOne((r) => r.url.includes('/items/'))
            .flush('Error', { status: 500, statusText: 'Server Error' });
        tick();

        expect(service.loading()).toBeFalse();
        expect(service.error()).toBeTruthy();
    }));

    it('load() serves from cache on second identical call', fakeAsync(() => {
        service.load(1, 12, '');
        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        // Second call — cache hit, no new HTTP request
        service.load(1, 12, '');
        httpMock.expectNone((r) => r.url.includes('/items/'));

        expect(service.items()).toEqual(mockPage.items);
    }));

    it('load() deduplicates in-flight requests', () => {
        service.load(1, 12, '');
        service.load(1, 12, '');

        const req = httpMock.expectOne((r) => r.url.includes('/items/'));
        expect(req).toBeTruthy(); // only one request despite two calls
    });

    it('load() with different category does NOT hit cache', fakeAsync(() => {
        service.load(1, 12, 'technology');
        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        service.load(1, 12, 'science');

        // Different cache key — should fire a new request
        const req = httpMock.expectOne((r) => r.url.includes('/items/'));
        expect(req).toBeTruthy();
    }));

    it('retryLoad() evicts the cache entry and re-fetches', fakeAsync(() => {
        service.load(1, 12, '');
        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        service.retryLoad();

        // Should fire a new request despite the previously cached data
        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        expect(service.items()).toEqual(mockPage.items);
    }));

    it('invalidateAll() clears cache and triggers reload', fakeAsync(() => {
        service.load(1, 12, '');
        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        service.invalidateAll();

        // Should trigger a new HTTP request after invalidation
        httpMock.expectOne((r) => r.url.includes('/items/')).flush(mockPage);
        tick();

        expect(service.items()).toEqual(mockPage.items);
    }));
});
