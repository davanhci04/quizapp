import { HttpErrorResponse } from '@angular/common/http';

/** ProblemDetails do ASP.NET Core trả về (RFC 9457), kèm lỗi validation nếu có. */
interface ProblemDetails {
  detail?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

/** Lấy thông báo lỗi dễ đọc từ phản hồi lỗi của API. */
export function errorMessage(error: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Không kết nối được tới máy chủ.';

  const body = error.error as ProblemDetails | null;
  if (body?.detail) return body.detail;
  if (body?.errors) {
    const first = Object.values(body.errors).flat()[0];
    if (first) return first;
  }
  return body?.title ?? fallback;
}
