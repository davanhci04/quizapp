import { HttpParams } from '@angular/common/http';

/** Tạo HttpParams từ object, bỏ qua giá trị undefined/null/chuỗi rỗng. */
export function toParams(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
