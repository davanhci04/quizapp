import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatButtonModule, RouterLink],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>Chào mừng đến với Quiz App</mat-card-title>
        <mat-card-subtitle>Hệ thống quiz trắc nghiệm trực tuyến</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (auth.user(); as user) {
          <p>Xin chào <strong>{{ user.username }}</strong>! Bạn đã đăng nhập với vai trò {{ user.role }}.</p>
        } @else {
          <p>Đăng nhập hoặc đăng ký để làm quiz và xem kết quả của bạn.</p>
        }
      </mat-card-content>
      @if (!auth.isAuthenticated()) {
        <mat-card-actions>
          <a mat-flat-button routerLink="/login">Đăng nhập</a>
          <a mat-button routerLink="/register">Đăng ký</a>
        </mat-card-actions>
      }
    </mat-card>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
}
