import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthResponseData, AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent {
  @ViewChild('f', { static: false }) authForm: NgForm;
  errorMsg: string;
  isLoginMode = true;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  onSubmit() {
    if (!this.authForm.valid) {
      return;
    }

    let authObs: Observable<AuthResponseData>;
    const email = this.authForm.value.email;
    const password = this.authForm.value.password;

    if (this.isLoginMode) {
      authObs = this.authService.login(email, password);
    } else {
      authObs = this.authService.signUp(email, password);
    }

    this.isLoading = true;

    authObs.subscribe({
      next: (respData) => {
        this.isLoading = false;
        this.errorMsg = null;
        this.router.navigate(['/recipes']);
      },
      error: (error: Error) => {
        this.isLoading = false;
        this.errorMsg = error.message;
      },
    });

    this.authForm.reset();
  }
}
