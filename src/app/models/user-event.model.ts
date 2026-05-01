export type EventType = 'view' | 'click' | 'complete' | 'skip' | 'rate';

export interface UserEventCreate {
    user_id: string;
    item_id: string;
    event_type: EventType;
}

export interface UserEvent {
    id: string;
    user_id: string;
    item_id: string;
    event_type: EventType;
    weight: number;
    created_at: string;
}
