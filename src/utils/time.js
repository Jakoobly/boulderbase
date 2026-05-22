export function secondsLeft(session) {
  if (!session?.startedAt || !session?.timerMinutes) return 0;
  return Math.max(0, Math.ceil((session.startedAt + session.timerMinutes * 60000 - Date.now()) / 1000));
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
