import { useState } from 'react';
import { entriesOf, definitionOf, labelOf, type ListKey, type RecordPatchInput } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { Field, MultiPick, PersonSelect, VocabSelect, BusyButton } from '../core/forms';
import { LocationPicker } from '../core/LocationPicker';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { changedPatch } from './helpers';
import { TagPicker } from './TagPicker';

export function RecordEditor({ data, busy, onSave, onCancel, onDirty }: { data: RecordData; busy: boolean; onSave: (patch: RecordPatchInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t, lang } = useI18n(); const record = data.record as RecordDetail;
  const [draft, setDraft] = useState<RecordPatchInput>(() => ({ title: record.title, description: record.description, reference: record.reference, publicNotes: record.publicNotes, notes: record.notes, ballInCourtId: record.ballInCourtId, responsibleId: record.responsibleId, tradeIds: record.tradeIds, severity: record.severity, priority: record.priority, dueDate: record.dueDate, completion: record.completion, safety: record.safety, tagIds: record.tagIds, locationIds: record.locationIds, mustBeDoneBeforeIds: record.mustBeDoneBefore.map(item => item.id), outsideScope: record.outsideScope, estimatedCost: record.estimatedCost, ...(record.subtype === 'quality_issue' ? { problemTypes: record.problemTypes, stage: record.stage, disposition: record.disposition, correction: record.correction } : {}), ...(record.subtype === 'detail_clarification' ? { question: record.question, route: record.route, issuedById: record.issuedById } : {}), ...(record.subtype !== 'task' ? { chosenOptionId: record.chosenOptionId, decidedById: record.decidedById, decidedOn: record.decidedOn, instructionText: record.instructionText } : {}) }));
  const [initial] = useState(draft);
  const set = <K extends keyof RecordPatchInput,>(field: K, value: RecordPatchInput[K]) => { setDraft(old => ({ ...old, [field]: value })); onDirty(); };
  const text = (field: keyof RecordPatchInput, en: string, el: string, multiline = false, maxLength = 20_000) => <Field label={t(en, el)} key={field}>{multiline ? <textarea maxLength={maxLength} value={String(draft[field] ?? '')} onChange={e => set(field, e.target.value)} /> : <input maxLength={maxLength} value={String(draft[field] ?? '')} onChange={e => set(field, e.target.value)} />}</Field>;
  const vocab = (field: keyof RecordPatchInput, list: ListKey, en: string, el: string) => <VocabSelect key={field} list={list} label={t(en, el)} value={draft[field] as string | null} onChange={value => set(field, value as never)} />;
  const person = (field: 'ballInCourtId' | 'responsibleId' | 'decidedById' | 'issuedById', en: string, el: string) => <PersonSelect key={field} label={t(en, el)} people={data.owner!.people} value={draft[field] ?? null} onChange={value => set(field, value)} />;
  const date = (field: 'dueDate' | 'decidedOn', en: string, el: string) => <Field label={t(en, el)}><input type="date" value={draft[field] ?? ''} onChange={e => set(field, e.target.value || null)} /></Field>;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  return <form onSubmit={e => { e.preventDefault(); void onSave(changedPatch(initial, draft)); }}>
    <fieldset disabled={busy}><legend>{t('Edit record', 'Επεξεργασία εγγραφής')}</legend>
      {text('title', 'Title', 'Τίτλος', false, 200)}{text('description', 'Description', 'Περιγραφή', true)}{text('reference', 'Reference', 'Αναφορά', false, 2000)}
      <div className="form-grid">{person('ballInCourtId', 'Ball in court', 'Επόμενη ενέργεια από')}{person('responsibleId', 'Responsible', 'Υπεύθυνος')}{vocab('severity', 'severity', 'Severity', 'Σοβαρότητα')}{vocab('priority', 'priority', 'Priority', 'Προτεραιότητα')}{date('dueDate', 'Due date', 'Προθεσμία')}
      <Field label={t('Completion (%)', 'Ολοκλήρωση (%)')}><input type="number" min="0" max="100" step="10" value={draft.completion ?? ''} onChange={e => set('completion', e.target.value === '' ? null : Number(e.target.value))} /></Field></div>
      <label><input type="checkbox" checked={draft.safety} onChange={e => set('safety', e.target.checked)} />{t('Safety implications', 'Θέμα ασφαλείας')}</label>
      <MultiPick label={t('Trades', 'Ειδικότητες')} items={data.owner!.trades.map(item => ({ ...item, label: name(item) }))} value={draft.tradeIds ?? []} onChange={ids => set('tradeIds', ids)} />
      <TagPicker projectId={record.projectId} initial={data.owner!.tags} value={draft.tagIds ?? []} onChange={ids => set('tagIds', ids)} onDirty={onDirty} />
      <LocationPicker label={t('Locations', 'Θέσεις')} nodes={data.owner!.locations} value={draft.locationIds ?? []} onChange={ids => set('locationIds', ids)} />
      <MultiPick label={t('Must be done before', 'Να γίνει πριν')} items={data.owner!.records.filter(item => item.id !== record.id).map(item => ({ id: item.id, label: `${item.humanId} ${item.title ?? ''}` }))} value={draft.mustBeDoneBeforeIds ?? []} onChange={ids => set('mustBeDoneBeforeIds', ids)} />
      {record.subtype === 'quality_issue' && <><fieldset><legend>{t('Problem types', 'Τύποι προβλήματος')}</legend>{entriesOf('problemType').map(item => <div key={item.code}><label><input type="checkbox" checked={draft.problemTypes?.includes(item.code as never)} onChange={e => set('problemTypes', (e.target.checked ? [...draft.problemTypes ?? [], item.code] : draft.problemTypes?.filter(code => code !== item.code)) as RecordDetail['problemTypes'])} />{labelOf('problemType', item.code, lang)}</label><details><summary>{t('Definition', 'Ορισμός')}</summary>{definitionOf('problemType', item.code, lang)}</details></div>)}</fieldset>{vocab('stage', 'stage', 'Stage', 'Στάδιο')}{vocab('disposition', 'disposition', 'Disposition', 'Τρόπος αντιμετώπισης')}{text('correction', 'Correction', 'Διόρθωση', true)}</>}
      {record.subtype === 'detail_clarification' && <>{text('question', 'Question', 'Ερώτημα', true)}{vocab('route', 'route', 'Route', 'Διαδρομή')}{person('issuedById', 'Issued by', 'Εκδόθηκε από')}</>}
      {record.subtype !== 'task' && <><Field label={t('Chosen option', 'Επιλεγμένη λύση')}><select value={draft.chosenOptionId ?? ''} onChange={e => set('chosenOptionId', e.target.value ? Number(e.target.value) : null)}><option value="">{t('None', 'Καμία')}</option>{data.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>{person('decidedById', 'Decided by', 'Αποφάσισε')}{date('decidedOn', 'Decided on', 'Ημερομηνία απόφασης')}{text('instructionText', 'Instruction text', 'Κείμενο εντολής', true)}</>}
      {text('publicNotes', 'Public Notes', 'Δημόσιες σημειώσεις', true)}
      <fieldset><legend>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</legend>{text('notes', 'Private Notes', 'Ιδιωτικές σημειώσεις', true)}<label><input type="checkbox" checked={draft.outsideScope} onChange={e => set('outsideScope', e.target.checked)} />{t('Outside contract scope', 'Εκτός σύμβασης')}</label>{draft.outsideScope && <Field label={t('Estimated cost (€)', 'Εκτιμώμενο κόστος (€)')}><input type="number" min="0" step="0.01" value={draft.estimatedCost ?? ''} onChange={e => set('estimatedCost', e.target.value === '' ? null : Number(e.target.value))} /></Field>}</fieldset>
      <BusyButton busy={busy} type="submit">{t('Save record', 'Αποθήκευση εγγραφής')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
    </fieldset>
  </form>;
}
