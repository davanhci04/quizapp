import { AttemptStatus } from '../models/attempt.models';

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  InProgress: 'Đang làm',
  Submitted: 'Đã nộp',
  TimedOut: 'Hết giờ',
};

/** Nhãn kết quả: bài chưa nộp không có kết quả đạt/không đạt. */
export function resultLabel(isPassed: boolean | null): string {
  if (isPassed === null) return '—';
  return isPassed ? 'Đạt' : 'Không đạt';
}
