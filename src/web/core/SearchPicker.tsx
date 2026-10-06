import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { foldText } from '../../domain';
import { useI18n } from './i18n';
export type Choice = { id: number; label: string; group?: string; disabled?: boolean; suffix?: ReactNode };
type Common = { label: string; items: Choice[]; emptyLabel: string; noMatches?: string; triggerRef?: Ref<HTMLButtonElement> };
type Props = Common & ({ mode: 'single'; value: number | null; onChange: (v: number | null) => void } | { mode: 'multiple'; value: number[]; onChange: (v: number[]) => void });
export function SearchPicker(props: Props) {
  const { t } = useI18n(); const id = useId(); const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  const selected = (value: number) => props.mode === 'single' ? props.value === value : props.value.includes(value);
  const items = props.items.filter(item => foldText(item.label).includes(foldText(query)));
  const close = (focus = false) => { setOpen(false); if (focus) trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); };
  }, [open]);
  return <div className="search-picker" ref={root} onKeyDown={event => {
    if (open && event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); close(true); }
    if (open && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (event.target !== search.current) close(true); }
  }}>
    <button type="button" ref={node => { trigger.current = node; if (typeof props.triggerRef === 'function') props.triggerRef(node); else if (props.triggerRef) props.triggerRef.current = node; }} aria-label={props.label} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { setQuery(''); setOpen(!open); }}>{props.mode === 'single' ? props.items.find(item => item.id === props.value)?.label ?? props.emptyLabel : props.label} {props.mode === 'single' && props.items.find(item => item.id === props.value)?.suffix} <span aria-hidden="true">⌄</span></button>
    {props.mode === 'multiple' && <div className="picker-chips">{props.items.filter(item => selected(item.id)).map(item => <span className="picker-chip" key={item.id}>{item.label}<button type="button" aria-label={t(`Remove ${item.label}`, `Αφαίρεση ${item.label}`)} onClick={() => props.onChange(props.value.filter(id => id !== item.id))}>×</button></span>)}</div>}
    {open && <div id={id} className="picker-popover"><input type="search" ref={search} aria-label={t('Search', 'Αναζήτηση')} value={query} onChange={event => setQuery(event.target.value)}/>
      <div className="picker-options" role={props.mode === 'single' ? 'radiogroup' : 'group'} aria-label={props.label}>
        {props.mode === 'single' && <label className="picker-option"><input type="radio" name={id} checked={props.value === null} onChange={() => props.onChange(null)} onClick={event => { if (event.detail > 0) close(true); }}/>{props.emptyLabel}</label>}
        {items.map((item, index) => <div key={item.id}>{item.group && item.group !== items[index - 1]?.group && <p className="picker-group">{item.group}</p>}<label className="picker-option"><input type={props.mode === 'single' ? 'radio' : 'checkbox'} name={props.mode === 'single' ? id : undefined} checked={selected(item.id)} disabled={item.disabled && !selected(item.id)} onChange={event => { if (props.mode === 'single') props.onChange(item.id); else props.onChange(event.target.checked ? [...props.value, item.id] : props.value.filter(id => id !== item.id)); }} onClick={event => { if (props.mode === 'single' && event.detail > 0) close(true); }}/><span>{item.label}</span>{item.suffix}</label></div>)}
        {!items.length && <p>{props.noMatches ?? t('No matches', 'Δεν βρέθηκαν αποτελέσματα')}</p>}
      </div><button type="button" onClick={() => close(true)}>{t('Done', 'Τέλος')}</button>
    </div>}
  </div>;
}
