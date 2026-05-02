import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InteractionService } from './interaction.service';
import { UserSessionService } from './user-session.service';
import { RecommendationStateService } from './recommendation-state.service';

describe('InteractionService', () => {
    let service: InteractionService;
    let httpMock: HttpTestingController;
    let sessionService: UserSessionService;
    let recState: RecommendationStateService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(InteractionService);
        httpMock = TestBed.inject(HttpTestingController);
        sessionService = TestBed.inject(UserSessionService);
        recState = TestBed.inject(RecommendationStateService);
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('trackEvent() does nothing when no user is in session', () => {
        // No userId stored
        service.trackEvent('item-1', 'click');

        httpMock.expectNone(() => true);
        expect(service).toBeTruthy(); // no HTTP request was made
    });

    it('trackEvent() posts to /events/ with correct payload', fakeAsync(() => {
        sessionService.setUserId('user-1');

        service.trackEvent('item-42', 'click');

        const req = httpMock.expectOne((r) => r.url.includes('/events/'));
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            user_id: 'user-1',
            item_id: 'item-42',
            event_type: 'click',
        });

        req.flush({ id: 'event-1', user_id: 'user-1', item_id: 'item-42', event_type: 'click' });
        tick();
    }));

    it('trackEvent() calls recState.invalidateUser() after successful post', fakeAsync(() => {
        sessionService.setUserId('user-1');
        spyOn(recState, 'invalidateUser');

        service.trackEvent('item-1', 'view');

        httpMock.expectOne((r) => r.url.includes('/events/')).flush({});
        tick();

        expect(recState.invalidateUser).toHaveBeenCalledWith('user-1');
    }));

    it('trackEvent() calls invalidateUser even on non-200 (fire-and-forget via catchError)', fakeAsync(() => {
        sessionService.setUserId('user-1');
        spyOn(recState, 'invalidateUser');

        service.trackEvent('item-1', 'click');

        httpMock
            .expectOne((r) => r.url.includes('/events/'))
            .flush('Error', { status: 500, statusText: 'Server Error' });
        tick();

        // catchError returns of(null), so subscribe callback still runs
        expect(recState.invalidateUser).toHaveBeenCalledWith('user-1');
    }));

    it('trackEvent() supports view and click event types', fakeAsync(() => {
        sessionService.setUserId('user-1');

        service.trackEvent('item-1', 'view');
        const viewReq = httpMock.expectOne((r) => r.url.includes('/events/'));
        expect(viewReq.request.body.event_type).toBe('view');
        viewReq.flush({});
        tick();

        service.trackEvent('item-2', 'click');
        const clickReq = httpMock.expectOne((r) => r.url.includes('/events/'));
        expect(clickReq.request.body.event_type).toBe('click');
        clickReq.flush({});
        tick();
    }));
});
