import { clockOffsetMs, formatClock, remainingMs } from './timer';

describe('timer utils', () => {
  const now = Date.parse('2026-09-29T10:00:00Z');

  it('computes the server clock offset', () => {
    expect(clockOffsetMs('2026-09-29T10:00:05Z', now)).toBe(5000);
    expect(clockOffsetMs('2026-09-29T09:59:55Z', now)).toBe(-5000);
  });

  it('computes remaining time without skew', () => {
    expect(remainingMs('2026-09-29T10:10:00Z', 0, now)).toBe(10 * 60 * 1000);
  });

  it('compensates for a client clock that is behind the server', () => {
    // Server nhanh hơn client 5 giây => còn ít hơn 5 giây so với đồng hồ client.
    expect(remainingMs('2026-09-29T10:10:00Z', 5000, now)).toBe(10 * 60 * 1000 - 5000);
  });

  it('never returns a negative value', () => {
    expect(remainingMs('2026-09-29T09:00:00Z', 0, now)).toBe(0);
  });

  it('formats mm:ss and rounds partial seconds up', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(1)).toBe('00:01');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(90 * 60_000)).toBe('90:00');
  });
});
