import { SearchPicker } from '../core/SearchPicker';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../core/api';
import { BusyButton, ErrorNotice, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import type { Named } from './data';

export function TagPicker({ projectId, initial, value, onChange, onDirty }: { projectId: number; initial: Named[]; value: number[]; onChange: (ids: number[]) => void; onDirty: () => void }) {
  const { t, lang } = useI18n(); const [tags, setTags] = useState(initial); const [nameEn, setEn] = useState(''); const [nameEl, setEl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [existing, setExisting] = useState<number | null>(null);
  const lifetime = useRef(new AbortController());
  useEffect(() => { lifetime.current = new AbortController(); return () => lifetime.current.abort(); }, []);
  const name = (tag: Named) => lang === 'el' ? tag.nameEl || tag.nameEn : tag.nameEn || tag.nameEl;
  const select = (id: number) => { onChange([...new Set([...value, id])]); setEn(''); setEl(''); setExisting(null); setError(null); };
  const create = async () => {
    setBusy(true); setError(null); setExisting(null); const signal = lifetime.current.signal;
    try {
      const tag = await api<Named>(`/api/projects/${projectId}/tags`, { method: 'POST', body: { nameEn, nameEl }, signal });
      if (signal.aborted) return;
      setTags(old => [...old.filter(item => item.id !== tag.id), tag]); select(tag.id);
      setTags(await api<Named[]>(`/api/projects/${projectId}/tags`, { signal }));
    } catch (reason) {
      if (signal.aborted) return;
      setError(reason);
      if (reason instanceof ApiError && reason.code === 'tag_name_taken' && reason.details && typeof reason.details === 'object' && 'existingTagId' in reason.details && typeof reason.details.existingTagId === 'number') {
        setExisting(reason.details.existingTagId);
        try { setTags(await api<Named[]>(`/api/projects/${projectId}/tags`, { signal })); } catch { /* Keep the current draft and choices. */ }
      }
    } finally { if (!signal.aborted) setBusy(false); }
  };
  return <><SearchPicker mode="multiple" emptyLabel={t('No tags','Χωρίς ετικέτες')} label={t('Choose tags…', 'Επιλογή ετικετών…')} items={tags.filter(tag => tag.active !== false || value.includes(tag.id)).map(tag => ({ id:tag.id, disabled:tag.active===false, label: name(tag) }))} value={value} onChange={onChange} />
    <details><summary>{t('Add a new tag', 'Προσθήκη νέας ετικέτας')}</summary><p>{t('New tags are added to the project immediately. Save the record to keep its tag selections.', 'Οι νέες ετικέτες προστίθενται αμέσως στο έργο. Αποθηκεύστε την εγγραφή για να διατηρηθούν οι επιλογές της.')}</p><ErrorNotice error={error} />
      <Field label={t('Tag name in English', 'Όνομα ετικέτας στα αγγλικά')}><input list="record-tag-en" maxLength={200} disabled={busy} value={nameEn} onChange={e => { setEn(e.target.value); onDirty(); }} /></Field>
      <Field label={t('Tag name in Greek', 'Όνομα ετικέτας στα ελληνικά')}><input list="record-tag-el" maxLength={200} disabled={busy} value={nameEl} onChange={e => { setEl(e.target.value); onDirty(); }} /></Field>
      <datalist id="record-tag-en">{tags.filter(tag => tag.nameEn).map(tag => <option key={tag.id} value={tag.nameEn} />)}</datalist><datalist id="record-tag-el">{tags.filter(tag => tag.nameEl).map(tag => <option key={tag.id} value={tag.nameEl} />)}</datalist>
      <BusyButton type="button" busy={busy} disabled={!nameEn.trim() && !nameEl.trim()} onClick={() => void create()}>{t('Create and select tag', 'Δημιουργία και επιλογή ετικέτας')}</BusyButton>
      {existing !== null && <button type="button" disabled={busy} onClick={() => select(existing)}>{t('Use existing tag', 'Χρήση υπάρχουσας ετικέτας')}{tags.find(tag => tag.id === existing) ? ` · ${name(tags.find(tag => tag.id === existing)!)}` : ''}</button>}
    </details>
  </>;
}
