import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let message: string;

            switch (error.status) {
                case 0:
                    message = 'Unable to reach the server. Check your connection.';
                    break;
                case 400:
                    message = error.error?.detail ?? 'Bad request.';
                    break;
                case 401:
                    message = 'Unauthorized. Please log in again.';
                    break;
                case 403:
                    message = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    message = 'The requested resource was not found.';
                    break;
                case 422:
                    message = error.error?.detail ?? 'Validation error.';
                    break;
                case 429:
                    message = 'Too many requests. Please slow down.';
                    break;
                default:
                    message =
                        error.status >= 500
                            ? 'A server error occurred. Please try again later.'
                            : `Unexpected error (${error.status}).`;
            }

            return throwError(() => ({ status: error.status, message }));
        })
    );
};
