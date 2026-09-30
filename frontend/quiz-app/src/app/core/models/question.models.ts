// Khớp với QuizApp.Api/DTOs/QuestionDtos.cs.

import { QuestionType } from './attempt.models';

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionStatus = 'Active' | 'Archived';

/** Loại câu hỏi hiện backend chấm điểm được (schema chỉ lưu 1 đáp án được chọn mỗi câu). */
export const GRADABLE_TYPES: readonly QuestionType[] = ['SingleChoice', 'TrueFalse'];

export interface AdminAnswer {
  answerId: number;
  answerText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface QuestionDetail {
  questionId: number;
  createdBy: number;
  content: string;
  questionType: QuestionType;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  status: QuestionStatus;
  createdAt: string;
  /** Số quiz đang dùng câu hỏi này. */
  quizCount: number;
  answers: AdminAnswer[];
}

export interface QuestionListItem {
  questionId: number;
  content: string;
  questionType: QuestionType;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  status: QuestionStatus;
  createdAt: string;
  answerCount: number;
  quizCount: number;
}

export interface AnswerRequest {
  /** Có khi sửa đáp án hiện có; bỏ trống khi thêm mới. display_order lấy theo vị trí trong mảng. */
  answerId?: number;
  answerText: string;
  isCorrect: boolean;
}

export interface QuestionRequest {
  content: string;
  questionType: QuestionType;
  category: string | null;
  difficulty: QuestionDifficulty | null;
  answers: AnswerRequest[];
}

export interface QuestionQuery {
  search?: string;
  category?: string;
  difficulty?: QuestionDifficulty | '';
  questionType?: QuestionType | '';
  status?: QuestionStatus | '';
  page?: number;
  pageSize?: number;
}

export interface DeleteQuestionResult {
  /** Deleted: đã xóa hẳn; Archived: câu hỏi đã có trong bài nộp nên chỉ archive. */
  outcome: 'Deleted' | 'Archived';
  message: string;
}
