import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function InfoButton({ label, children }: { label: string; children: ReactNode }) {
  const id = useId(); const button = useRef<HTMLButtonElement>(null); const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [position, setPosition] = useState({ top: 0, left: 0 });
  const show = () => { const r = button.current?.getBoundingClientRect(); if (r) setPosition({ top: Math.min(r.bottom + 6, window.innerHeight - 220), left: Math.max(8, Math.min(r.left, window.innerWidth - 328)) }); setOpen(true); };
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => { if (!button.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', dismiss); document.addEventListener('focusin', dismiss); document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('focusin', dismiss); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  return <><button ref={button} type="button" className="info-button" aria-label={label} aria-expanded={open} aria-describedby={open ? id : undefined} onMouseEnter={show} onFocus={show} onClick={show}><span aria-hidden="true" className="info-symbol">i</span></button>
    {open && createPortal(<div ref={popup} id={id} role="tooltip" className="info-popover" style={position}>{children}</div>, button.current?.closest('dialog') ?? document.body)}</>;
}
