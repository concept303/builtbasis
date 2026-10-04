import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { compareItems, isCode, labelOf, normalizeLabel, type ListKey, type ShareLinkOut } from '../../domain';
import type { PrintRecord } from '../../server/printing/routes';
import { api } from '../core/api';
import { ErrorNotice, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import { dateText } from '../record/helpers';
import { measurementNumber } from '../record/number-format';
import './print.css';

export function activePrintLinks(links: ShareLinkOut[], draft: boolean, now = Date.now()): ShareLinkOut[] {
  return draft ? [] : links.filter(link => link.url && !link.revokedAt && (!link.expiresAt || Date.parse(link.expiresAt) > now));
}

export function PrintPage({ projectId, recordId }: { projectId: number; recordId: number }) {
  const printPage = useRef<HTMLDivElement>(null); const printAuthorized = useRef(false);
  useEffect(() => {
    const beforePrint = () => {
      printPage.current?.classList.toggle('print-approved', printAuthorized.current);
      printAuthorized.current = false;
    };
    const afterPrint = () => { printAuthorized.current = false; printPage.current?.classList.remove('print-approved'); };
    window.addEventListener('beforeprint', beforePrint); window.addEventListener('afterprint', afterPrint);
    return () => { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint); };
  }, []);
  const { t } = useI18n(); const base = `/api/projects/${projectId}/records/${recordId}`;
  const [data, setData] = useState<PrintRecord | null>(null); const [links, setLinks] = useState<ShareLinkOut[]>([]);
  const [includeQr, setIncludeQr] = useState(false); const [shareError, setShareError] = useState<unknown>(null); const [linksLoaded, setLinksLoaded] = useState(false);
  const [selected, setSelected] = useState(''); const [qr, setQr] = useState(''); const [label, setLabel] = useState('');
  const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState<string[]>([]);
  const [snapshotVersion, setSnapshotVersion] = useState(0); const [printPending, setPrintPending] = useState(false);
  const [now, setNow] = useState(Date.now()); const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); void document.fonts.ready.then(() => setFontsReady(true)); return () => clearInterval(timer); }, []);
  useEffect(() => { const abort = new AbortController(); void api<PrintRecord>(base + '/print', { signal: abort.signal }).then(setData).catch(reason => { if (!abort.signal.aborted) setError(reason); }); return () => abort.abort(); }, [base]);
  useEffect(() => {
    if (!includeQr || !data || data.record.status === 'draft') return;
    const abort = new AbortController(); setLinksLoaded(false); setShareError(null);
    void api<ShareLinkOut[]>(base + '/share-links', { signal: abort.signal }).then(shares => { setLinks(shares); setLinksLoaded(true); }).catch(reason => { if (!abort.signal.aborted) setShareError(reason); });
    return () => abort.abort();
  }, [base, includeQr, data?.record.status]);
  const active = activePrintLinks(links, data?.record.status === 'draft', now);
  const link = includeQr ? active.find(item => String(item.id) === selected) : undefined;
  useEffect(() => { let cancelled = false; setQr(''); setLoaded(old => old.filter(key => key !== 'qr')); if (link?.url) void QRCode.toDataURL(link.url, { errorCorrectionLevel: 'M', margin: 4, width: 256 }).then(url => { if (!cancelled) setQr(url); }).catch(reason => { if (!cancelled) setShareError(reason); }); return () => { cancelled = true; }; }, [link?.url]);
  const markLoaded = (key: string) => setLoaded(old => old.includes(key) ? old : [...old, key]);
  const ready = !!data && (!includeQr || (!!link && !!qr && linksLoaded && loaded.includes('qr') && !shareError)) && data.photos.every(photo => loaded.includes(String(photo.id))) && fontsReady && !busy && !error;
  useEffect(() => {
    if (!printPending) return;
    if (error || (includeQr && (shareError || !link))) { setPrintPending(false); return; }
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) { setPrintPending(false); printAuthorized.current = true; window.print(); }
    })();
    return () => { cancelled = true; };
  }, [printPending, ready, error, includeQr, shareError, link]);
  const print = async () => {
    printAuthorized.current = false;
    setBusy(true); setError(null);
    try {
      const freshData = await api<PrintRecord>(base + '/print');
      setData(freshData); setLoaded([]); setSnapshotVersion(version => version + 1);
      if (includeQr) {
        if (freshData.record.status === 'draft') { setIncludeQr(false); setSelected(''); return; }
        let freshLinks: ShareLinkOut[];
        try { freshLinks = await api<ShareLinkOut[]>(base + '/share-links'); }
        catch (reason) { setShareError(reason); return; }
        setLinks(freshLinks);
        if (!activePrintLinks(freshLinks, false).some(item => String(item.id) === selected)) { setSelected(''); return; }
      }
      setPrintPending(true);
    } catch (reason) { setError(reason); } finally { setBusy(false); }
  };
  return <div ref={printPage} className={`print-page${ready ? ' print-ready' : ''}`}>
    <div className="print-controls"><h1>{t('Print / Save PDF', 'Εκτύπωση / Αποθήκευση PDF')}</h1><p>{t('Print in A3 landscape. Select Save as PDF and turn off browser headers and footers. A QR link is optional.', 'Εκτυπώστε σε A3 οριζόντια. Επιλέξτε αποθήκευση ως PDF και απενεργοποιήστε κεφαλίδες και υποσέλιδα του προγράμματος περιήγησης. Ο σύνδεσμος QR είναι προαιρετικός.')}</p><ErrorNotice error={error} />
      <a href={`/projects/${projectId}/records/${recordId}`}>{t('Back to record', 'Επιστροφή στην καταγραφή')}</a>
      <label><input type="checkbox" checked={includeQr} disabled={!data || data.record.status === 'draft' || busy || printPending} onChange={event => { setIncludeQr(event.target.checked); setSelected(''); setShareError(null); }} />{t('Include QR link', 'Συμπερίληψη συνδέσμου QR')}</label>
      {data?.record.status === 'draft' && <p>{t('Drafts print without a QR link. Open the record before sharing it.', 'Οι πρόχειρες καταγραφές εκτυπώνονται χωρίς σύνδεσμο QR. Ανοίξτε την καταγραφή πριν την κοινοποίησή της.')}</p>}
      {includeQr && data?.record.status !== 'draft' && <><ErrorNotice error={shareError} />
        <Field label={t('QR share link', 'Σύνδεσμος κοινοποίησης QR')}><select aria-label={t('QR share link', 'Σύνδεσμος κοινοποίησης QR')} value={selected} disabled={busy || printPending || !linksLoaded} onChange={event => { setSelected(event.target.value); setError(null); }}><option value="">{t('Choose a link', 'Επιλέξτε σύνδεσμο')}</option>{active.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
        {data && linksLoaded && !shareError && !active.length && <form onSubmit={async event => { event.preventDefault(); setBusy(true); setShareError(null); try { await api(base + '/share-links', { method: 'POST', body: { label } }); setLinks(await api(base + '/share-links')); setLabel(''); } catch (reason) { setShareError(reason); } finally { setBusy(false); } }}><Field label={t('Link label', 'Τίτλος συνδέσμου')}><input required maxLength={200} value={label} onChange={event => setLabel(event.target.value)} /></Field><button disabled={busy} type="submit">{t('Create share link', 'Δημιουργία συνδέσμου κοινοποίησης')}</button></form>}
      </>}
      <button disabled={!ready || printPending} onClick={() => void print()}>{t('Print / Save PDF', 'Εκτύπωση / Αποθήκευση PDF')}</button>
      {data && !ready && <p role="status">{includeQr ? t('Select a valid QR link and wait for all images to load.', 'Επιλέξτε έγκυρο σύνδεσμο QR και περιμένετε τη φόρτωση όλων των εικόνων.') : t('Wait for the print view and all images to load.', 'Περιμένετε τη φόρτωση της προβολής εκτύπωσης και όλων των εικόνων.')}</p>}
    </div>
    <p className="print-blocker">{t('Use Print / Save PDF on this page to refresh the record before printing.', 'Χρησιμοποιήστε το κουμπί Εκτύπωση / Αποθήκευση PDF σε αυτή τη σελίδα για να ανανεώσετε την καταγραφή πριν την εκτύπωση.')}</p>
    {data && <PrintSheet key={snapshotVersion} data={data} base={base} qr={includeQr ? qr : ''} shareUrl={link?.url ?? ''} onLoaded={markLoaded} onError={() => setError(new Error(t('An image could not load. Reload this page before printing.', 'Μια εικόνα δεν φορτώθηκε. Ανανεώστε τη σελίδα πριν εκτυπώσετε.')))} />}
  </div>;
}

function PrintSheet({ data, base, qr, shareUrl, onLoaded, onError }: { data: PrintRecord; base: string; qr: string; shareUrl: string; onLoaded(key: string): void; onError(): void }) {
  const { t, lang } = useI18n(); const r = data.record;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  const person = (id: number | null) => data.people.find(item => item.id === id)?.name ?? '—';
  const fixed = (list: ListKey, code: string | null) => code && isCode(list, code) ? labelOf(list, code, lang) : '—';
  const number = (value: number) => measurementNumber(value, lang);
  const field = (en: string, el: string, value: ReactNode) => <div><dt>{t(en, el)}</dt><dd>{value || '—'}</dd></div>;
  return <article className="print-sheet" lang={lang}>
    <h1>{r.humanId} · {r.title}</h1>
    <dl className="print-header">{field('Subtype', 'Υποκατηγορία', fixed('subtype', r.subtype))}{field('Status', 'Κατάσταση', fixed('status', r.status))}{field('Severity', 'Σοβαρότητα', fixed('severity', r.severity))}{field('Priority', 'Προτεραιότητα', fixed('priority', r.priority))}{field('Due date', 'Προθεσμία', dateText(r.dueDate, lang))}{field('Ball in court', 'Επόμενη ενέργεια από', person(r.ballInCourtId))}{field('Responsible', 'Υπεύθυνος', person(r.responsibleId))}</dl>
    <dl className="print-header">{field('Location', 'Θέση', data.locations.map(path => path.map(name).join(' / ')).join('\n'))}{field('Trades', 'Ειδικότητες', data.trades.map(name).join(', '))}{field('Tags', 'Ετικέτες', data.tags.map(name).join(', '))}{field('Reference', 'Αναφορά', r.reference)}</dl>
    <section><h2>{r.subtype === 'detail_clarification' ? t('Question', 'Ερώτημα') : t('Description', 'Περιγραφή')}</h2><p className="print-text">{r.subtype === 'detail_clarification' ? r.question : r.description}</p></section>
    {r.subtype !== 'task' && <><section><h2>{t('Classification', 'Ταξινόμηση')}</h2><dl>{r.subtype === 'quality_issue' ? <>{field('Type of problem', 'Είδος προβλήματος', r.problemTypes.map(code => fixed('problemType', code)).join(', '))}{field('Stage', 'Στάδιο', fixed('stage', r.stage))}{field('Disposition', 'Τρόπος αντιμετώπισης', fixed('disposition', r.disposition))}{field('Correction', 'Διόρθωση', r.correction)}</> : <>{field('Route', 'Διαδικασία', fixed('route', r.route))}{field('Issued by', 'Εκδόθηκε από', person(r.issuedById))}</>}</dl></section>
    <section><h2>{t('Decision and instruction', 'Απόφαση και εντολή')}</h2><dl>{field('Chosen option', 'Επιλεγμένη λύση', r.chosenOption && <>{r.chosenOption.label}{'\n'}{r.chosenOption.description}</>)}{field('Decided by', 'Αποφάσισε', person(r.decidedById))}{field('Decided on', 'Ημερομηνία απόφασης', dateText(r.decidedOn, lang))}{field('Instruction text', 'Κείμενο εντολής', r.instructionText)}</dl></section></>}
    {data.measurements.length > 0 && <section><h2>{t('Measurements', 'Μετρήσεις')}</h2>{data.measurements.map(set => <div key={set.id}><h3>{fixed('measurementPhase', set.phase)} · {dateText(set.date, lang)} · {person(set.measuredById)}</h3><p className="print-text">{set.note}</p><table><thead><tr>{[t('Item', 'Αντικείμενο'), t('Quantity', 'Μέγεθος'), t('Value', 'Τιμή'), t('Unit', 'Μονάδα'), t('Note', 'Σημείωση')].map(text => <th key={text}>{text}</th>)}</tr></thead><tbody>{set.rows.map((row, i) => <tr key={i}><td>{row.item}</td><td>{row.quantity}</td><td>{number(row.value)}</td><td>{fixed('unit', row.unit)}</td><td>{row.note}</td></tr>)}</tbody></table>
      {[...new Map(set.rows.map(row => [JSON.stringify([normalizeLabel(row.quantity), row.unit]), row])).values()].map(row => <div key={JSON.stringify([row.quantity, row.unit])}><h4>{t('Between items', 'Μεταξύ αντικειμένων')} · {row.quantity} ({fixed('unit', row.unit)})</h4><table><thead><tr><th>{t('Item', 'Αντικείμενο')}</th><th>{t('Value', 'Τιμή')}</th><th>{t('Difference from first item', 'Διαφορά από το πρώτο αντικείμενο')}</th></tr></thead><tbody>{compareItems(set, row.quantity, row.unit).map((item, i) => <tr key={i}><td>{item.item}</td><td>{number(item.value)}</td><td>{number(item.diffFromFirst)}</td></tr>)}</tbody></table></div>)}
    </div>)}{data.comparisons.map((comparison, i) => <div key={i}><h3>{t('Before vs after', 'Πριν και μετά')} · {comparison.item} · {comparison.quantity} ({fixed('unit', comparison.unit)})</h3><table><thead><tr><th>{t('Date', 'Ημερομηνία')}</th><th>{t('Phase', 'Φάση')}</th><th>{t('Value', 'Τιμή')}</th><th>{t('Change', 'Μεταβολή')}</th></tr></thead><tbody>{comparison.points.map(point => <tr key={point.setId}><td>{dateText(point.date, lang)}</td><td>{fixed('measurementPhase', point.phase)}</td><td>{number(point.value)}</td><td>{point.changeFromPrevious === null ? '—' : number(point.changeFromPrevious)}</td></tr>)}</tbody></table></div>)}</section>}
    {(['before', 'after'] as const).map(phase => data.photos.some(photo => photo.phase === phase) && <section key={phase}><h2>{fixed('photoPhase', phase)}</h2><div className="print-photos">{data.photos.filter(photo => photo.phase === phase).map(photo => <figure key={photo.id}><img src={`${base}/photos/${photo.id}/display`} alt={photo.caption ?? fixed('photoPhase', phase)} onLoad={() => onLoaded(String(photo.id))} onError={onError} /><figcaption>{photo.caption}</figcaption></figure>)}</div></section>)}
    {data.verifications.length > 0 && <section><h2>{t('Verification entries', 'Καταχωρίσεις επαλήθευσης')}</h2>{data.verifications.map(entry => <div key={entry.id}><h3>{dateText(entry.date, lang)} · {person(entry.checkedById)} · {fixed('verificationMethod', entry.method)} · {fixed('verificationOutcome', entry.outcome)}</h3><p className="print-text">{entry.note}</p></div>)}</section>}
    {qr && shareUrl && <div className="print-qr"><a href={shareUrl}><img src={qr} alt={t('Share QR code', 'Κωδικός QR κοινοποίησης')} onLoad={() => onLoaded('qr')} onError={onError} /></a></div>}
    <footer>{t('Generated', 'Δημιουργία')} <time dateTime={data.generatedAt}>{dateText(data.generatedAt, lang)}</time> · {t('Record updated', 'Ενημέρωση καταγραφής')} <time dateTime={r.updatedAt}>{dateText(r.updatedAt, lang)}</time></footer>
  </article>;
}
