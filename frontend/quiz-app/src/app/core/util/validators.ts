import { AbstractControl, ValidationErrors } from '@angular/forms';

/** BR-02: mật khẩu tối thiểu 8 ký tự, có cả chữ và số (khớp rule ở backend). */
export function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  if (!value) return null; // để `required` xử lý
  return /\p{L}/u.test(value) && /\d/.test(value) ? null : { passwordStrength: true };
}

/** Không chấp nhận chuỗi rỗng hoặc chỉ có khoảng trắng. */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  return value.trim().length > 0 ? null : { blank: true };
}

/** Kiểm tra hai control cùng tên nhóm có giá trị khớp nhau. */
export function matchFields(field: string, confirmField: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirmField)?.value;
    return a === b ? null : { mismatch: true };
  };
}
