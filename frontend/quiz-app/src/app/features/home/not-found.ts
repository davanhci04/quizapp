import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, RouterLink],
  template: `
    <h1>Không tìm thấy trang</h1>
    <p>Đường dẫn bạn truy cập không tồn tại.</p>
    <a mat-flat-button routerLink="/">Về trang chủ</a>
  `,
})
export class NotFound {}
