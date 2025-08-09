// import { Component, OnInit } from '@angular/core';
// import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { Observable } from 'rxjs';
// import { CoolSessionStorage } from '@angular-cool/storage';
// import { ConfigService } from '../../../app/services/config.service';
// @Component({
//   selector: 'app-login',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.css']
// })
// export class LoginComponent implements OnInit {
//   username: string = '';
//   password: string = '';
//   message: string = '';

//   private apiBaseUrl: any;

//   ngOnInit() {
//     this.apiBaseUrl = this.configService.apiBaseUrl;
//   }

//   constructor(private http: HttpClient, private router: Router, private sessionStorage: CoolSessionStorage, private configService: ConfigService) {}

  
//   onSubmit() {
//      this.apiBaseUrl = JSON.parse(sessionStorage.getItem('config') || '{}').url;
//     const payload = {
//       username: this.username,
//       password: this.password
//     };
//     this.http.post(`${this.apiBaseUrl}/api/Auth/user-login`, payload, { responseType: 'text' })
//       .subscribe({
//         next: (response) => {
//           this.message = response;
//           alert('Login Successful');
//           localStorage.setItem('isLoggedIn', 'true'); // <-- Set login flag
//           this.router.navigate(['/assets']);
//         },
//         error: (error) => {
//           if (error.status === 401) {
//             this.message = 'Invalid username or password.';
//           } else {
//             this.message = 'Login failed. Try again later.';
//           }
//         }
//       });
//   }
// }

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoolSessionStorage } from '@angular-cool/storage';
import { ConfigService } from '../../../app/services/config.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  message: string = '';

  private apiBaseUrl: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private sessionStorage: CoolSessionStorage,
    private configService: ConfigService
  ) {}

  ngOnInit() {
    const config = JSON.parse(sessionStorage.getItem('config') || '{}');
    this.apiBaseUrl = (config.url || '').replace(/\/+$/, ''); 
  }

  onSubmit() {
    const payload = {
      username: this.username,
      password: this.password
    };

    const loginUrl = `${this.apiBaseUrl}/api/Auth/user-login`;

    this.http.post(loginUrl, payload, { responseType: 'text' }).subscribe({
      next: (response) => {
        this.message = response;
        alert('Login Successful');
        localStorage.setItem('isLoggedIn', 'true');
        this.router.navigate(['/assets/pre-dashboard']);
      },
      error: (error) => {
        if (error.status === 401) {
          this.message = 'Invalid username or password.';
        } else {
          this.message = 'Login failed. Try again later.';
        }
      }
    });
  }
}
