import { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useI18n } from '../core/i18n';
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PdfViewer({ bytes, onFailure }: { bytes: Blob; onFailure(): void }) {
  const { t } = useI18n();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof getDocument> | undefined;
    setDoc(null); setPage(1);
    void bytes.arrayBuffer().then(data => {
      if (!active) return;
      // Data-fed only. Canvas pages omit actions, scripting, forms, attachments,
      // annotation links, and any automatic document navigation.
      task = getDocument({ data, useWorkerFetch: false, useWasm: false, disableAutoFetch: true,
        disableStream: true, disableFontFace: true, useSystemFonts: true, stopAtErrors: true });
      return task.promise.then(value => { if (active) setDoc(value); });
    }).catch(() => { if (active) onFailure(); });
    return () => { active = false; setDoc(null); if (task) void task.destroy(); };
  }, [bytes]);
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let active = true;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    const target = canvas.current;
    void doc.getPage(page).then(pdfPage => {
      if (!active) return;
      const original = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: Math.min(1.5, 1200 / original.width, 1800 / original.height) });
      target.width = viewport.width; target.height = viewport.height;
      const context = target.getContext('2d');
      if (!context) throw new Error('preview_unavailable');
      task = pdfPage.render({ canvas: target, canvasContext: context, viewport });
      return task.promise;
    }).catch(() => { if (active) onFailure(); });
    return () => { active = false; task?.cancel(); target.width = target.height = 0; };
  }, [doc, page]);
  return <div className="pdf-viewer">{doc && <div className="actions"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{t('Previous page', 'Προηγούμενη σελίδα')}</button><span>{t('Page', 'Σελίδα')} {page} / {doc.numPages}</span><button disabled={page >= doc.numPages} onClick={() => setPage(value => value + 1)}>{t('Next page', 'Επόμενη σελίδα')}</button></div>}<canvas ref={canvas} aria-label={t('PDF page', 'Σελίδα PDF')} /></div>;
}
