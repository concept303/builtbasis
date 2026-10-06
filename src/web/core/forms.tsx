import { InfoButton } from './InfoButton';
import { cloneElement, isValidElement, useEffect, useId, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { definitionOf, entriesOf, labelOf, type ListKey } from '../../domain';
import { errorText } from './api';
import { useI18n } from './i18n';
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const generatedId = useId();
  if (isValidElement<{ id?: string }>(children) && typeof children.type === 'string' && ['input', 'select', 'textarea'].includes(children.type)) {
    const id = children.props.id ?? generatedId;
    return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}{hint && <small>{hint}</small>}</div>;
  }
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function VocabSelect({ list, value, onChange, label, required = false }: { list: ListKey; value: string | null; onChange(value: string | null): void; label?: string; required?: boolean }) {
  const { lang, t } = useI18n(); const id = useId();
  return <div className="field"><div className="label-actions"><label htmlFor={id}>{label ?? list}</label><InfoButton label={t('Definitions', 'Ορισμοί') + ' — ' + (label ?? list)}><dl>{entriesOf(list).map(entry => <div key={entry.code}><dt>{labelOf(list, entry.code, lang)}</dt><dd>{definitionOf(list, entry.code, lang)}</dd></div>)}</dl></InfoButton></div><select id={id} value={value ?? ''} required={required} onChange={event => onChange(event.target.value || null)}><option value="">{t('Not specified', 'Δεν έχει οριστεί')}</option>{entriesOf(list).map(entry => <option key={entry.code} value={entry.code}>{labelOf(list, entry.code, lang)}</option>)}</select></div>;
}
export function MultiPick({ label, items, value, onChange }: { label: string; items: { id: number; label: string; active?: boolean }[]; value: number[]; onChange(ids: number[]): void }) {
  const { t } = useI18n();
  return <fieldset className="multi"><legend>{label}</legend>{items.filter(item => item.active !== false || value.includes(item.id)).map(item => <label className="check" key={item.id}><input type="checkbox" checked={value.includes(item.id)} disabled={item.active === false && !value.includes(item.id)} onChange={event => onChange(event.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))}/>{item.label}{item.active === false ? ` (${t('inactive', 'ανενεργό')})` : ''}</label>)}{items.length === 0 && <small>{t('No entries', 'Δεν υπάρχουν καταχωρίσεις')}</small>}</fieldset>;
}
export function PersonSelect({ label, people, value, onChange }: { label: string; people: { id: number; name: string; active?: boolean }[]; value: number | null; onChange(value: number | null): void }) {
  const { t } = useI18n();
  return <Field label={label}><select value={value ?? ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}><option value="">{t('Not specified', 'Δεν έχει οριστεί')}</option>{people.filter(person => person.active !== false || person.id === value).map(person => <option key={person.id} value={person.id} disabled={person.active === false}>{person.name}{person.active === false ? ` (${t('inactive', 'ανενεργό')})` : ''}</option>)}</select></Field>;
}
export function BusyButton({ busy, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy: boolean }) { return <button {...props} disabled={busy || props.disabled} aria-busy={busy}>{children}</button>; }
export function ErrorNotice({ error }: { error: unknown }) { const { lang } = useI18n(); return error ? <div role="alert" className="error">{errorText(error, lang)}</div> : null; }
export function useDirtyGuard(dirty: boolean): void {
  useEffect(() => { if (!dirty) return; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
}
