import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, tap, throwError } from 'rxjs';
import { User } from './user.model';

export interface AuthResponseData {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered?: string;
}

@Injectable()
export class AuthService {
  user = new BehaviorSubject<User>(null);
  tokenExpirationTimer: any;

  constructor(private http: HttpClient, private router: Router) {}

  private handleError(errorRes: HttpErrorResponse) {
    let msg: string = 'An unknown error occurred';

    try {
      switch (errorRes.error.error.message) {
        case 'EMAIL_EXISTS':
          msg = 'The email address is already in use by another account.';
          break;
        case 'OPERATION_NOT_ALLOWED':
          msg = 'Password sign-in is disabled for this project.';
          break;
        case 'TOO_MANY_ATTEMPTS_TRY_LATER':
          msg =
            'We have blocked all requests from this device due to unusual activity. Try again later.';
          break;
        case 'EMAIL_NOT_FOUND':
          msg = 'There is no user record corresponding to this identifier.';
          break;
        case 'INVALID_PASSWORD':
          msg = 'The password is invalid or the user does not have a password.';
          break;
        case 'USER_DISABLED':
          msg = 'The user account has been disabled by an administrator.';
          break;
      }
    } finally {
      return throwError(() => new Error(msg));
    }
  }

  private handleAuthentication(resData: AuthResponseData) {
    const curDate = new Date().getTime();
    const expirationTimeInMs = +resData.expiresIn * 1000;
    const expirationDate = new Date(curDate + expirationTimeInMs);
    const newUser = new User(
      resData.email,
      resData.localId,
      resData.idToken,
      expirationDate
    );

    this.user.next(newUser);
    this.autoLogout(expirationTimeInMs);
    localStorage.setItem('userData', JSON.stringify(newUser));
  }

  signUp(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDKsFD2qG9eQVf_MpiudEe1YiVAB4g4egY',
        { email: email, password: password, returnSecureToken: true }
      )
      .pipe(
        catchError(this.handleError),
        tap((resData) => this.handleAuthentication(resData))
      );
  }

  autoLogin() {
    const userData = localStorage.getItem('userData');

    if (!userData) return;

    const parsedUser = JSON.parse(userData);
    const expirationTime = parsedUser._tokenExpirationDate;
    const loadedUser = new User(
      parsedUser.email,
      parsedUser.id,
      parsedUser._token,
      new Date(expirationTime)
    );

    if (!loadedUser.token) return;
    this.user.next(loadedUser);

    const curTime = new Date().getTime();
    const timeLeft = expirationTime - curTime;
    this.autoLogout(timeLeft);
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDKsFD2qG9eQVf_MpiudEe1YiVAB4g4egY',
        { email: email, password: password, returnSecureToken: true }
      )
      .pipe(
        catchError(this.handleError),
        tap((resData) => this.handleAuthentication(resData))
      );
  }

  autoLogout(expirationDurationInMs: number) {
    this.tokenExpirationTimer = setTimeout(
      () => this.logout(),
      expirationDurationInMs
    );
  }

  logout() {
    this.user.next(null);
    this.router.navigate(['/auth']);
    localStorage.removeItem('userData');
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
  }
}
