import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';

describe('UserSessionService', () => {
    let service: UserSessionService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(UserSessionService);
    });

    afterEach(() => localStorage.clear());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getUserId() returns null when nothing is stored', () => {
        expect(service.getUserId()).toBeNull();
    });

    it('setUserId() persists the id', () => {
        service.setUserId('abc-123');
        expect(service.getUserId()).toBe('abc-123');
    });

    it('setUserId() overwrites a previously stored id', () => {
        service.setUserId('first');
        service.setUserId('second');
        expect(service.getUserId()).toBe('second');
    });

    it('clearUserId() removes the stored id', () => {
        service.setUserId('abc-123');
        service.clearUserId();
        expect(service.getUserId()).toBeNull();
    });
});
