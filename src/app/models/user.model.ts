export interface User {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
}

export interface UserCreate {
    name: string;
    email: string;
}

export interface UserUpdate {
    name?: string | null;
    email?: string | null;
}
