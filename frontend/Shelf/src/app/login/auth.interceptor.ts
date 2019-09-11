import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { LoginService } from '../login/login.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: LoginService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler) {
        const authToken = this.authService.getAuthToken();
        if (authToken) {
            const authRequest = req.clone({
                headers: req.headers.set('token', authToken)
            });
            return next.handle(authRequest);

        } else {
            const authRequest = req.clone();
            return next.handle(authRequest);
        }
    }
}
