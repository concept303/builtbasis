import { useEffect, useState } from 'react';
import { calendarToday } from '../../domain';
export function useToday(): string {
  const [today, setToday] = useState(() => calendarToday());
  useEffect(() => { const refresh = () => setToday(calendarToday()); const timer = window.setInterval(refresh, 60_000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); }; }, []);
  return today;
}
