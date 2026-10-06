import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useI18n } from './i18n';
export function Panel({ title, children, onClose, returnFocusRef }: { title: string; children: ReactNode; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null); const { t } = useI18n();
  useEffect(() => { const element = ref.current!; element.showModal(); return () => { element.close(); returnFocusRef.current?.focus(); }; }, [returnFocusRef]);
  return <dialog ref={ref} className="side-panel" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label={t('Close', 'Κλείσιμο')}>×</button></header>{children}</dialog>;
}
