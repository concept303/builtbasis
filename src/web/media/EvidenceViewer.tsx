import { useEffect, useRef, useState } from 'react';
import type { PhotoOut } from '../../domain/files';
import type { EvidenceAttachment as AttachmentOut } from './types';
import type { ViewContext } from '../core/types';
import { api } from '../core/api';
import { useI18n } from '../core/i18n';
import { downloadBlob, downloadOriginal, fetchBytes, isAccessLost } from './transport';
import { rasterImage, workerJob } from './photos';
import type { EmailPreview } from './email';
import { PdfViewer } from './PdfViewer';

export type EvidenceSelection = { kind: 'photos'; item: PhotoOut } | { kind: 'attachments'; item: AttachmentOut };
export function EvidenceViewer({ context, selection, onClose, onAccessLost }: { context: ViewContext; selection: EvidenceSelection; onClose(): void; onAccessLost(): void }) {
  const { t } = useI18n();
  const [source, setSource] = useState('');
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [email, setEmail] = useState<EmailPreview | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const scope = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const suffix = `/${selection.kind}/${selection.item.id}`;
  const original = suffix + (selection.kind === 'photos' ? '/original' : '/file');
  const kind = selection.kind === 'photos' ? 'image' : selection.item.capabilities.kind;
  const checkError = (error: unknown) => { if (isAccessLost(error)) onAccessLost(); };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const control = new AbortController(); scope.current = control;
    let url = '';
    setSource(''); setPdf(null); setEmail(null); setFailed(false); setLoading(true);
    const run = async () => {
      const capabilities = selection.kind === 'attachments' ? (await api<{ capabilities: AttachmentOut['capabilities'] }>(context.base + suffix + '/preview', { token: context.token, signal: control.signal })).capabilities : null;
      if (capabilities?.view === 'download') { setFailed(true); return; }
      if (capabilities?.kind === 'email') {
        if (!capabilities.reader) throw new Error('preview_unavailable');
        const bytes = await (await fetchBytes(context, original, control.signal)).arrayBuffer();
        control.signal.throwIfAborted();
        const result = await workerJob<EmailPreview>(new Worker(new URL('./email.worker.ts', import.meta.url), { type: 'module' }), { bytes, reader: capabilities.reader }, [bytes], control.signal);
        if (!control.signal.aborted) setEmail(result);
        return;
      }
      const path = suffix + (selection.kind === 'photos' ? '/display' : '/view');
      if (kind !== 'pdf' && context.mode !== 'shared') { setSource(context.base + path); return; }
      let blob = await fetchBytes(context, path, control.signal);
      if (kind === 'pdf') { setPdf(blob); return; }
      if (capabilities?.mediaType === 'image/svg+xml' || blob.type === 'image/svg+xml') blob = await rasterImage(blob, 'image/png', 2400, 5_000_000, control.signal);
      control.signal.throwIfAborted();
      url = URL.createObjectURL(blob); setSource(url);
    };
    void run().catch(error => { if (!control.signal.aborted) { checkError(error); setFailed(true); } }).finally(() => { if (!control.signal.aborted) setLoading(false); });
    return () => { control.abort(); if (url) URL.revokeObjectURL(url); setSource(''); setPdf(null); setEmail(null); };
  }, [context.base, context.token, selection.kind, selection.item.id]);
  const download = async () => {
    setDownloading(true); setDownloadFailed(false);
    try { await downloadOriginal(context, original, selection.item.originalFilename, scope.current?.signal); }
    catch (error) { if (!scope.current?.signal.aborted) { checkError(error); setDownloadFailed(true); } }
    finally { setDownloading(false); }
  };
  const mediaFailure = () => {
    setFailed(true);
    // A native cookie player cannot report HTTP status. Recheck occurrence access.
    if (context.mode !== 'shared') void api(context.base + suffix + (selection.kind === 'photos' ? '/display' : '/preview'), { method: selection.kind === 'photos' ? 'HEAD' : 'GET', signal: scope.current?.signal }).catch(checkError);
  };
  return <dialog ref={dialog} className="evidence-viewer" aria-label={t('Evidence viewer', 'Προβολή τεκμηρίου')} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h3>{selection.item.originalFilename}</h3><button autoFocus onClick={onClose}>{t('Close', 'Κλείσιμο')}</button></header>
    <div className="evidence-viewer-actions"><button disabled={downloading} onClick={() => void download()}>{downloading ? t('Downloading…', 'Λήψη…') : t('Download original', 'Λήψη πρωτοτύπου')}</button></div>
    <div className="evidence-viewer-body">
    {downloadFailed && <p role="alert">{t('Download failed. Try again.', 'Η λήψη απέτυχε. Δοκιμάστε ξανά.')}</p>}
    {loading && <p role="status">{t('Opening preview…', 'Άνοιγμα προεπισκόπησης…')}</p>}
    {failed && <p role="status">{t('Preview unavailable. Download the original to open it with a compatible application.', 'Η προεπισκόπηση δεν είναι διαθέσιμη. Κατεβάστε το πρωτότυπο και ανοίξτε το με συμβατή εφαρμογή.')}</p>}
    {!failed && source && kind === 'image' && <img className="evidence-image" src={source} alt={selection.kind === 'photos' ? selection.item.caption ?? selection.item.originalFilename : selection.item.title ?? selection.item.originalFilename} onError={mediaFailure} />}
    {!failed && source && kind === 'video' && <video controls playsInline preload="metadata" src={source} onError={mediaFailure} />}
    {!failed && source && kind === 'audio' && <audio controls preload="metadata" src={source} onError={mediaFailure} />}
    {!failed && pdf && <PdfViewer bytes={pdf} onFailure={() => setFailed(true)} />}
    {!failed && email && <article className="email-preview"><dl><dt>{t('Subject', 'Θέμα')}</dt><dd>{email.subject}</dd><dt>{t('From', 'Από')}</dt><dd>{email.from}</dd><dt>{t('To', 'Προς')}</dt><dd>{email.to}</dd><dt>{t('Date', 'Ημερομηνία')}</dt><dd>{email.date}</dd></dl><pre>{email.body}</pre>{email.attachments.length > 0 && <h4>{t('Embedded attachments', 'Ενσωματωμένα συνημμένα')}</h4>}{email.attachments.map((item, index) => <button key={index} onClick={() => downloadBlob(new Blob([item.bytes]), item.name, scope.current?.signal)}>{t('Download', 'Λήψη')} {item.name}</button>)}</article>}
    </div>
  </dialog>;
}

export function PhotoThumbnail({ context, photo, onOpen, onAccessLost }: { context: ViewContext; photo: PhotoOut; onOpen(): void; onAccessLost(): void }) {
  const [source, setSource] = useState('');
  const { t } = useI18n();
  useEffect(() => {
    const controller = new AbortController(); let url = '';
    void fetchBytes(context, `/photos/${photo.id}/thumbnail`, controller.signal).then(blob => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setSource(url); }
    }).catch(error => { if (!controller.signal.aborted && isAccessLost(error)) onAccessLost(); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); setSource(''); };
  }, [context.base, context.token, photo.id]);
  return <button className="photo-thumbnail" onClick={onOpen} aria-label={`${t('Open photo', 'Άνοιγμα φωτογραφίας')} ${photo.originalFilename}`}>{source ? <img src={source} loading="lazy" alt={photo.caption ?? photo.originalFilename} /> : photo.originalFilename}</button>;
}
