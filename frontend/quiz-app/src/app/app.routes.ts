import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Danh sách quiz',
    loadComponent: () => import('./features/catalog/quiz-list').then((m) => m.QuizList),
  },
  {
    path: 'quizzes/:id',
    title: 'Chi tiết quiz',
    loadComponent: () => import('./features/catalog/quiz-detail').then((m) => m.QuizDetail),
  },
  {
    path: 'attempts',
    title: 'Lịch sử làm bài',
    canActivate: [authGuard],
    loadComponent: () => import('./features/attempts/attempt-history').then((m) => m.AttemptHistory),
  },
  {
    path: 'attempts/:id',
    title: 'Bài làm',
    canActivate: [authGuard],
    loadComponent: () => import('./features/attempts/attempt-page').then((m) => m.AttemptPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: 'questions',
        title: 'Ngân hàng câu hỏi',
        loadComponent: () => import('./features/admin/questions/question-list').then((m) => m.QuestionList),
      },
      {
        path: 'questions/new',
        title: 'Thêm câu hỏi',
        loadComponent: () => import('./features/admin/questions/question-form').then((m) => m.QuestionForm),
      },
      {
        path: 'questions/:id/edit',
        title: 'Sửa câu hỏi',
        loadComponent: () => import('./features/admin/questions/question-form').then((m) => m.QuestionForm),
      },
      { path: '', pathMatch: 'full', redirectTo: 'questions' },
    ],
  },
  {
    path: 'login',
    title: 'Đăng nhập',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Đăng ký',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: '**',
    title: 'Không tìm thấy trang',
    loadComponent: () => import('./features/home/not-found').then((m) => m.NotFound),
  },
];
