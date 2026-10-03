import { useState } from 'react';
import type { OptionInput, SharedRecord } from '../../domain';
import { BusyButton, Field } from '../core/forms';
import { useI18n } from '../core/i18n';

export function OptionEditor({ initial, busy, onSave, onCancel, onDirty }: { initial?: SharedRecord['options'][number]; busy: boolean; onSave: (body: OptionInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t } = useI18n(); const [label, setLabel] = useState(initial?.label ?? ''); const [description, setDescription] = useState(initial?.description ?? '');
  return <form onChange={onDirty} onSubmit={e => { e.preventDefault(); void onSave({ label, description }); }}><fieldset disabled={busy}><legend>{t('Option considered', 'Εξεταζόμενη λύση')}</legend><Field label={t('Option label', 'Τίτλος λύσης')}><input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} /></Field><Field label={t('Description', 'Περιγραφή')}><textarea maxLength={20000} value={description} onChange={e => setDescription(e.target.value)} /></Field><BusyButton busy={busy} type="submit">{t('Save option', 'Αποθήκευση λύσης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button></fieldset></form>;
}
