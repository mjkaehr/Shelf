import { Injectable } from '@angular/core';
import { AuthData } from '../models/auth.data.model';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import { Router } from '@angular/router';
import {Observable, of, throwError} from 'rxjs';
import { Subject } from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {loginRoute, logoutRoute, registerRoute} from "../constants/constants.routes";

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    observe: 'response' as 'response'
};

@Injectable({ providedIn: 'root' })

export class LoginService {

    private tokenTimer: any;
    private token: string;
    private isAuthenticated = false;
    private authStatusListener = new Subject<boolean>();
    responseLogin = 'NULL';

    constructor(private http: HttpClient, private router: Router) { }

    registerUser(authData: AuthData): Observable<any> {
        return this.http.post<any>(registerRoute, authData);
    }

    loginUser(username: string, password: string): Observable<any> {
      const userInfo: AuthData = {username, password, email: '', birthday: ''};

      return this.http.post<object>(loginRoute, userInfo, httpOptions).pipe(
        map(response => {
          const token = response.headers.get('token');
          this.token = token;
          if (token) {
            const expiresInDuration = 7200;
            this.setAuthTimer(expiresInDuration);
            this.isAuthenticated = true;
            this.authStatusListener.next(true);
            const now = new Date();
            const expirationDate = new Date(now.getTime() + expiresInDuration * 1000);
            this.responseLogin = 'complete';
            localStorage.setItem('token', token);
            localStorage.setItem('expiresIn', expirationDate.toISOString());
            localStorage.setItem('user', username);
          }
        }),
        catchError(error => throwError(error)))
    }



    logoutUser() {
        const user = localStorage.getItem('user');
        return this.http.post<object>(logoutRoute, { username: user }).toPromise();
    }

    logout() {
        this.token = null;
        this.isAuthenticated = false;
        this.authStatusListener.next(false);
        clearTimeout(this.tokenTimer);
        localStorage.removeItem('token');
        localStorage.removeItem('expiresIn');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
    }

    checkAuthenticationStatus() {
        const authInfo = this.getAuthenticationData();
        if (!authInfo) {
            return;
        }

        const currentTime: Date = new Date();
        const expiresIn = new Date(authInfo.expirationDate).getTime() - currentTime.getTime();
        if (expiresIn > 0) {
            this.token = authInfo.token;
            this.isAuthenticated = true;
            this.setAuthTimer(expiresIn / 1000);
            this.authStatusListener.next(true);
        }
    }

    private getAuthenticationData() {
        const token = localStorage.getItem('token');
        const expirationDate = localStorage.getItem('expiration');
        if (!token || !expirationDate) {
            return;
        }
        return { token, expirationDate };
    }

    private setAuthTimer(duration: number) {
        console.log('Setting timer: ' + duration);
        this.tokenTimer = setTimeout(() => {
            this.logout();
        }, duration * 1000);
    }

    getAuthToken() {
        if (localStorage.getItem('token')) {
            return localStorage.getItem('token');
        }
        return false;
    }

    getIsAuth() {
        return this.isAuthenticated;
    }
}