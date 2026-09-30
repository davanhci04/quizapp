/** Độ lệch đồng hồ server so với client tại thời điểm nhận phản hồi (ms). */
export function clockOffsetMs(serverTime: string, clientNowMs = Date.now()): number {
  return Date.parse(serverTime) - clientNowMs;
}

/** Số ms còn lại tới hạn chót, tính theo đồng hồ server; không âm. */
export function remainingMs(expiresAt: string, serverOffsetMs: number, clientNowMs = Date.now()): number {
  return Math.max(0, Date.parse(expiresAt) - (clientNowMs + serverOffsetMs));
}

/** Định dạng mm:ss (làm tròn lên để không hiện 00:00 khi còn chưa tới 1 giây). */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
