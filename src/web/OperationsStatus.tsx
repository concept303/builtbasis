import { useEffect, useState } from 'react';
import type { OperationsStatus as Status } from '../server/monitoring/status';
import { api } from './core/api';
import { useI18n } from './core/i18n';

export function OperationsStatus({ detailed = false }: { detailed?: boolean }) {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current: AbortController | undefined;
    const refresh = () => {
      current?.abort();
      const abort = new AbortController(); current = abort;
      const timeout = setTimeout(() => { abort.abort(); setFailed(true); setStatus(null); }, 15000);
      api<Status>('/api/operations/status', { signal: abort.signal }).then(value => {
        if (!abort.signal.aborted) { setStatus(value); setFailed(false); }
      }).catch(() => { if (!abort.signal.aborted) { setFailed(true); setStatus(null); } }).finally(() => clearTimeout(timeout));
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    addEventListener('focus', refresh);
    return () => { current?.abort(); clearInterval(timer); removeEventListener('focus', refresh); };
  }, []);
  const bytes = (value: string | null) => {
    if (value === null) return t('unavailable', 'μη διαθέσιμο');
    const gb = Math.abs(Number(value)) >= 1000000000;
    return `${(Number(value) / (gb ? 1000000000 : 1000000)).toLocaleString(lang, { maximumFractionDigits: 1 })} ${gb ? 'GB' : 'MB'}`;
  };
  const backupText = !status ? '' : status.backup.state === 'missing' ? t('No completed server backup.', 'Δεν υπάρχει ολοκληρωμένο αντίγραφο στον διακομιστή.')
    : status.backup.state === 'unavailable' ? t('Backup status unavailable.', 'Η κατάσταση αντιγράφων δεν είναι διαθέσιμη.')
    : status.backup.state === 'overdue' ? t('Server backup overdue.', 'Το αντίγραφο στον διακομιστή έχει καθυστερήσει.') : t('Server backup is recent.', 'Το αντίγραφο στον διακομιστή είναι πρόσφατο.');
  const warning = failed || (status && (status.backup.state !== 'ok' || status.storage.state !== 'ok'));
  if (!detailed && !warning) return null;
  const storageText = !status ? '' : status.storage.state === 'unavailable' ? t('Storage status unavailable.', 'Η κατάσταση αποθήκευσης δεν είναι διαθέσιμη.')
    : !status.storage.healthy ? t('Storage needs checking; uploads are blocked.', 'Απαιτείται έλεγχος χώρου· οι μεταφορτώσεις έχουν αποκλειστεί.')
    : BigInt(status.storage.managedHeadroomBytes) < BigInt(status.storage.warningBelowBytes) ? t('File allowance is below the warning threshold.', 'Ο διαθέσιμος χώρος για αρχεία είναι κάτω από το όριο προειδοποίησης.')
    : status.storage.state === 'warning' ? t('Storage is running low; large uploads may fail.', 'Ο χώρος εξαντλείται· μεγάλες μεταφορτώσεις μπορεί να αποτύχουν.') : '';
  return <section className={`operations-status panel${warning ? ' operations-warning' : ''}`} data-testid="operations-status" aria-label={t('Server backup and storage', 'Αντίγραφα ασφαλείας και χώρος')} aria-live="polite">
    <strong>{t('Server backup and storage', 'Αντίγραφα ασφαλείας και χώρος')}</strong>
    {failed ? <p>{t('Status unavailable. Check backups and storage before relying on them.', 'Η κατάσταση δεν είναι διαθέσιμη. Ελέγξτε τα αντίγραφα και την αποθήκευση.')}</p>
      : !status ? <p>{t('Checking status…', 'Έλεγχος κατάστασης…')}</p> : <>
        {(detailed || status.backup.state !== 'ok') && <p>{backupText} {detailed && status.backup.sourceCreatedAt && <>{new Date(status.backup.sourceCreatedAt).toLocaleString(lang)} ({status.backup.ageHours?.toFixed(1)} {t('hours old', 'ώρες πριν')}; {t('limit', 'όριο')} {status.backup.maxAgeHours} h).</>}</p>}
        {(detailed || status.storage.state !== 'ok') && <p>{storageText} {t('File allowance remaining', 'Χώρος που απομένει για αρχεία')}: {bytes(status.storage.managedHeadroomBytes)}.</p>}
        {detailed && <><p>{t('Warning below', 'Προειδοποίηση κάτω από')}: {bytes(status.storage.warningBelowBytes)}.</p>
        <details><summary>{t('Storage details', 'Λεπτομέρειες χώρου')}</summary>
          <p>{t('Managed-file budget', 'Όριο διαχειριζόμενων αρχείων')}: {bytes(status.storage.budgetBytes)}. {t('Retained, including orphan files', 'Διατηρούμενα, μαζί με μη συσχετισμένα αρχεία')}: {bytes(status.storage.retainedBytes)}; {t('reserved for uploads', 'δεσμευμένα για μεταφορτώσεις')}: {bytes(status.storage.reservedBytes)}.</p>
          <p>{t('Filesystem available', 'Διαθέσιμος χώρος συστήματος αρχείων')}: {bytes(status.storage.filesystemAvailableBytes)}; {t('free-space reserve', 'απόθεμα ελεύθερου χώρου')}: {bytes(status.storage.freeReserveBytes)}; {t('headroom after reserve and pending uploads', 'περιθώριο μετά το απόθεμα και τις εκκρεμείς μεταφορτώσεις')}: {bytes(status.storage.filesystemHeadroomBytes)}. {t('This does not establish hosting account quota.', 'Αυτό δεν επιβεβαιώνει το όριο του λογαριασμού φιλοξενίας.')}</p>
          <p>{t('The PC off-site copy is separate and is not checked here.', 'Το αντίγραφο εκτός διακομιστή στον υπολογιστή είναι ξεχωριστό και δεν ελέγχεται εδώ.')}</p>
        </details></>}
      </>}
    {!detailed && <a href="/administration">{t('Open Administration', 'Άνοιγμα διαχείρισης')}</a>}
  </section>;
}
