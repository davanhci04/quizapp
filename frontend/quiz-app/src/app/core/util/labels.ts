import { AttemptStatus, QuestionType } from '../models/attempt.models';
import { QuestionDifficulty, QuestionStatus } from '../models/question.models';

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  InProgress: 'Đang làm',
  Submitted: 'Đã nộp',
  TimedOut: 'Hết giờ',
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MultipleChoice: 'Nhiều lựa chọn',
  SingleChoice: 'Một lựa chọn',
  TrueFalse: 'Đúng / Sai',
  FillInTheBlanks: 'Điền vào chỗ trống',
  ShortAnswer: 'Trả lời ngắn',
  LongAnswer: 'Trả lời dài',
};

export const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = {
  Easy: 'Dễ',
  Medium: 'Trung bình',
  Hard: 'Khó',
};

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  Active: 'Đang dùng',
  Archived: 'Đã archive',
};

export const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as QuestionDifficulty[];
export const QUESTION_STATUSES = Object.keys(QUESTION_STATUS_LABEL) as QuestionStatus[];

/** Nhãn kết quả: bài chưa nộp không có kết quả đạt/không đạt. */
export function resultLabel(isPassed: boolean | null): string {
  if (isPassed === null) return '—';
  return isPassed ? 'Đạt' : 'Không đạt';
}
