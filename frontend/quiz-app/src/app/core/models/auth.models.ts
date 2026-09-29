// Khớp với DTO của backend (QuizApp.Api/DTOs/AuthDtos.cs).

export type RoleName = 'Admin' | 'User';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  email: string;
  role: RoleName;
}

export interface AuthResponse {
  token: string;
  /** ISO 8601 UTC, ví dụ "2026-09-29T09:53:32Z". */
  expiresAt: string;
  user: UserInfo;
}
