import { calendarDayDifference, isOutstanding, type Status } from '../../domain';
import { useI18n } from './i18n';
export function DueChip({ status, dueDate, today }: { status: Status; dueDate: string | null; today: string }) {
  const { t } = useI18n();
  if (!dueDate || !isOutstanding(status)) return null;
  const days = calendarDayDifference(today, dueDate);
  if (days > 1) return null;
  const label = days < 0 ? t(`Overdue by ${-days} ${days === -1 ? 'day' : 'days'}`, `Καθυστέρηση ${-days} ${days === -1 ? 'ημέρας' : 'ημερών'}`) : days === 0 ? t('Due today', 'Προθεσμία σήμερα') : t('Due tomorrow', 'Προθεσμία αύριο');
  return <span className={days < 0 ? 'due-chip overdue' : 'due-chip'}>{label}</span>;
}
