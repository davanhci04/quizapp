// Khớp với QuizApp.Api/DTOs/AttemptDtos.cs.

export type QuestionType =
  | 'MultipleChoice'
  | 'SingleChoice'
  | 'TrueFalse'
  | 'FillInTheBlanks'
  | 'ShortAnswer'
  | 'LongAnswer';

export type AttemptStatus = 'InProgress' | 'Submitted' | 'TimedOut';

export interface AttemptOption {
  answerId: number;
  answerText: string;
  displayOrder: number;
  /** Chỉ có giá trị sau khi bài đã nộp; khi đang làm bài luôn là null. */
  isCorrect: boolean | null;
}

export interface AttemptQuestion {
  questionId: number;
  content: string;
  questionType: QuestionType;
  displayOrder: number;
  scoreWeight: number;
  answers: AttemptOption[];
  selectedAnswerId: number | null;
  /** Snapshot lúc chấm bài; null khi chưa nộp. */
  isCorrect: boolean | null;
}

export interface Attempt {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  status: AttemptStatus;
  startedAt: string;
  /** Hạn chót nộp bài (ISO 8601 UTC). */
  expiresAt: string;
  /** Giờ server lúc trả về; dùng để bù lệch đồng hồ client. */
  serverTime: string;
  submittedAt: string | null;
  totalScore: number | null;
  maxScore: number;
  passingScore: number;
  isPassed: boolean | null;
  questions: AttemptQuestion[];
}

export interface AttemptListItem {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number | null;
  isPassed: boolean | null;
}
