// Khớp với QuizApp.Api/DTOs/QuizDtos.cs.

import { QuestionType } from './attempt.models';
import { QuestionDifficulty, QuestionStatus } from './question.models';

export type QuizStatus = 'Draft' | 'Published' | 'Archived';

export interface QuizListItem {
  quizId: number;
  title: string;
  description: string | null;
  duration: number;
  passingScore: number;
  status: QuizStatus;
  isPublic: boolean;
  createdAt: string;
  createdBy: number;
  questionCount: number;
  totalScoreWeight: number;
}

export interface QuizQuestionItem {
  quizQuestionId: number;
  questionId: number;
  content: string;
  questionType: QuestionType;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  questionStatus: QuestionStatus;
  displayOrder: number;
  scoreWeight: number;
}

export interface QuizDetail {
  quizId: number;
  title: string;
  description: string | null;
  duration: number;
  passingScore: number;
  status: QuizStatus;
  isPublic: boolean;
  createdAt: string;
  createdBy: number;
  totalScoreWeight: number;
  questions: QuizQuestionItem[];
}

export interface QuizRequest {
  title: string;
  description: string | null;
  duration: number;
  passingScore: number;
  isPublic: boolean;
}

export interface QuizQuery {
  search?: string;
  status?: QuizStatus | '';
  isPublic?: boolean | '';
  page?: number;
  pageSize?: number;
}

export interface AddQuizQuestionRequest {
  questionId: number;
  scoreWeight?: number;
  displayOrder?: number;
}

export interface UpdateQuizQuestionRequest {
  scoreWeight?: number;
  displayOrder?: number;
}
