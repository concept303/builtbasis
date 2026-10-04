import { foldText } from '../../domain/text';
import { useEffect, useRef, useState } from 'react';
import type { Person } from '../../server/lists/people';
import type { Trade } from '../../server/lists/trades';
import type { Tag } from '../../server/lists/tags';
import type { ZoneType } from '../../server/lists/zone-types';
import type { LocationNode } from '../../server/lists/locations';
import { api, ApiError } from '../core/api';
import { BusyButton, ErrorNotice, Field, VocabSelect, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';
import { collidingTags, listName, parentChoices } from './rules';

import { LocationsTree } from './LocationsTree';

type Section = 'people' | 'trades' | 'tags' | 'locations' | 'zone-types';
interface Lists { people: Person[]; trades: Trade[]; tags: Tag[]; locations: LocationNode[]; 'zone-types': ZoneType[] }
type Item = Person | Trade | Tag | LocationNode | ZoneType;
interface Draft {
  code: string; name: string; nameEn: string; nameEl: string;
  company: string; email: string; phone: string; role: string | null;
  defEn: string; defEl: string; kind: string | null;
  parentId: number | null; zoneTypeId: number | null; sortOrder: string;
}
const sections: Section[] = ['people', 'trades', 'tags', 'locations', 'zone-types'];
const emptyDraft = (): Draft => ({ code: '', name: '', nameEn: '', nameEl: '', company: '', email: '', phone: '', role: null, defEn: '', defEl: '', kind: null, parentId: null, zoneTypeId: null, sortOrder: '' });
function draftOf(item: Item | null): Draft {
  if (!item) return emptyDraft();
  return { ...emptyDraft(), ...item, company: 'company' in item ? item.company ?? '' : '', email: 'email' in item ? item.email ?? '' : '', phone: 'phone' in item ? item.phone ?? '' : '', sortOrder: 'sortOrder' in item ? String(item.sortOrder) : '' };
}

export function ManagedLists({ projectId }: { projectId: number }): React.JSX.Element {
  return <ListsProject key={projectId} projectId={projectId} />;
}

function ListsProject({ projectId }: { projectId: number }): React.JSX.Element {
  const { t, lang } = useI18n();
  const [section, setSection] = useState<Section>('people');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Lists | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ item: Item | null; copy: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [initial, setInitial] = useState<Draft>(emptyDraft);
  const [collision, setCollision] = useState<Tag | null>(null);
  const [confirmation, setConfirmation] = useState<{ item: Item; records?: number } | null>(null);
  const alive = useRef(true);
  const base = `/api/projects/${projectId}`;
  const dirty = editor !== null && JSON.stringify(initial) !== JSON.stringify(draft);
  useDirtyGuard(dirty);
  const title = (key: Section) => ({ people: t('People', 'Πρόσωπα'), trades: t('Trades', 'Ειδικότητες'), tags: t('Tags', 'Ετικέτες'), locations: t('Locations', 'Τοποθεσίες'), 'zone-types': t('Zone types', 'Τύποι ζώνης') })[key];
  const name = (item: Item) => 'name' in item ? item.name : listName(item, lang);

  async function load(signal?: AbortSignal) {
    const [people, trades, tags, locations, zones] = await Promise.all([
      api<Person[]>(`${base}/people`, { signal }), api<Trade[]>(`${base}/trades`, { signal }),
      api<Tag[]>(`${base}/tags`, { signal }), api<LocationNode[]>(`${base}/locations`, { signal }),
      api<ZoneType[]>(`${base}/zone-types`, { signal }),
    ]);
    if (alive.current && !signal?.aborted) setData({ people, trades, tags, locations, 'zone-types': zones });
  }
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void load(controller.signal).catch(e => {
      if (!controller.signal.aborted) { setData(null); setError(e); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { alive.current = false; controller.abort(); };
  }, [projectId]);

  function discard(): boolean {
    return !dirty || window.confirm(t('Discard unsaved changes?', 'Απόρριψη μη αποθηκευμένων αλλαγών;'));
  }
  function close() { setEditor(null); setCollision(null); setError(null); setValidation(null); }
  function edit(item: Item | null, copy = false, parentId?: number) {
    if (!discard()) return;
    const next = draftOf(item);
    if (copy) { next.nameEn = ''; next.nameEl = ''; }
    if (parentId !== undefined) next.parentId = parentId;
    setDraft(next); setInitial(next); setEditor({ item, copy }); setCollision(null); setConfirmation(null); setError(null); setValidation(null);
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value })); setCollision(null); setError(null); setValidation(null);
  }
  async function act(path: string, method: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setError(null); setValidation(null);
    try {
      await api(path, { method, body });
      if (!alive.current) return;
      setEditor(null); setCollision(null); setConfirmation(null);
      try { await load(); } catch (e) { setData(null); throw e; }
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { setData(null); setEditor(null); setConfirmation(null); }
      setError(e);
      if (e instanceof ApiError && e.code === 'tag_name_taken') {
        const details = e.details as { existingTagId?: number } | undefined;
        try {
          const tags = await api<Tag[]>(`${base}/tags`);
          if (alive.current) {
            setData(current => current ? { ...current, tags } : current);
            setCollision(tags.find(tag => tag.id === details?.existingTagId) ?? null);
          }
        } catch (refreshError) {
          if (alive.current) {
            if (refreshError instanceof ApiError && [401, 403].includes(refreshError.status)) { setData(null); setEditor(null); }
            setError(refreshError);
          }
        }
      }
    } finally { if (alive.current) setBusy(false); }
  }
  async function save() {
    if (!editor || !data) return;
    const names = { nameEn: draft.nameEn.trim(), nameEl: draft.nameEl.trim() };
    if (section !== 'people' && !names.nameEn && !names.nameEl) { setValidation(t('Enter an English or Greek name.', 'Συμπληρώστε ελληνικό ή αγγλικό όνομα.')); return; }
    if (section === 'tags') {
      const matches = collidingTags(data.tags, names, editor.item?.id ?? null);
      if (matches.length > 1) { setCollision(null); setValidation(t('These names belong to two different tags. Change a name before saving.', 'Τα ονόματα ανήκουν σε δύο διαφορετικές ετικέτες. Αλλάξτε ένα όνομα πριν την αποθήκευση.')); return; }
      if (matches[0]) { setCollision(matches[0]); return; }
    }
    let body: unknown = names;
    if (section === 'people') body = { code: draft.code.trim(), name: draft.name.trim(), company: draft.company.trim() || null, email: draft.email.trim() || null, phone: draft.phone.trim() || null, role: draft.role };
    if (section === 'trades') body = { ...names, code: draft.code.trim(), defEn: draft.defEn.trim(), defEl: draft.defEl.trim() };
    if (section === 'locations') body = editor.copy ? { ...names, parentId: draft.parentId } : { ...names, kind: draft.kind, parentId: draft.parentId, zoneTypeId: draft.zoneTypeId, ...(draft.sortOrder === '' ? {} : { sortOrder: Number(draft.sortOrder) }) };
    const suffix = editor.item ? `/${editor.item.id}${editor.copy ? '/copy' : ''}` : '';
    await act(`${base}/${section}${suffix}`, editor.item && !editor.copy ? 'PATCH' : 'POST', body);
  }
  async function askDelete(item: Item) {
    if (!discard() || busy) return;
    setEditor(null); setCollision(null); setError(null); setValidation(null);
    if (section !== 'tags') { setConfirmation({ item }); return; }
    setBusy(true);
    try {
      const usage = await api<{ records: number }>(`${base}/tags/${item.id}/usage`);
      if (alive.current) setConfirmation({ item, records: usage.records });
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setData(null);
        setError(e);
      }
    } finally { if (alive.current) setBusy(false); }
  }
  const textField = (key: 'code' | 'name' | 'nameEn' | 'nameEl' | 'company' | 'email' | 'phone', label: string, required = false) => <Field label={label}><input value={draft[key]} required={required} maxLength={key === 'code' ? 20 : key === 'phone' ? 50 : 200} onChange={e => update(key, e.target.value)} /></Field>;
  const listErrors: Record<string, string> = {
    code_taken: t('This code is already in use. Choose a different code.', 'Αυτός ο κωδικός χρησιμοποιείται ήδη. Επιλέξτε διαφορετικό κωδικό.'),
    name_required: t('Enter an English or Greek name.', 'Συμπληρώστε ελληνικό ή αγγλικό όνομα.'),
    tag_name_taken: t('A tag already has this name. Use the existing tag or merge into it.', 'Υπάρχει ετικέτα με αυτό το όνομα. Χρησιμοποιήστε την υπάρχουσα ή συγχωνεύστε σε αυτή.'),
    tag_names_conflict: t('These names belong to two different tags. Change a name before saving.', 'Τα ονόματα ανήκουν σε δύο διαφορετικές ετικέτες. Αλλάξτε ένα όνομα πριν την αποθήκευση.'),
    location_in_use: t('Records use this branch. Cancel deletion and retire the location instead.', 'Εγγραφές χρησιμοποιούν αυτόν τον κλάδο. Ακυρώστε τη διαγραφή και απενεργοποιήστε την τοποθεσία.'),
    zone_type_in_use: t('Locations use this zone type. Change those locations before deleting it.', 'Τοποθεσίες χρησιμοποιούν αυτόν τον τύπο ζώνης. Αλλάξτε τις πριν τον διαγράψετε.'),
    location_cycle: t('A location cannot be moved inside its own branch.', 'Μια τοποθεσία δεν μπορεί να μετακινηθεί μέσα στον δικό της κλάδο.'),
    copy_into_own_branch: t('Choose a destination outside the copied branch.', 'Επιλέξτε προορισμό εκτός του κλάδου που αντιγράφεται.'),
  };
  const listError = error instanceof ApiError ? listErrors[error.code] : undefined;

  function changeSection(key: Section) {
    if (discard()) { close(); setConfirmation(null); setSection(key); setQuery(''); }
  }
  function locationPath(id: number | null): string {
    const path: string[] = []; const seen = new Set<number>();
    while (id !== null && !seen.has(id)) {
      seen.add(id); const node = data?.locations.find(item => item.id === id);
      if (!node) break;
      path.unshift(name(node)); id = node.parentId;
    }
    return path.join(' / ') || t('Project root', 'Ρίζα έργου');
  }
  function secondaryActions(node: Item) {
    return <details className="row-menu"><summary>{t('Actions', 'Ενέργειες')}</summary><div>
      {'active' in node && <button type="button" disabled={busy} onClick={() => {
        if (discard() && window.confirm(node.active ? t(`Retire “${name(node)}”? Existing records keep this entry.`, `Απενεργοποίηση «${name(node)}»; Οι υπάρχουσες εγγραφές διατηρούν το στοιχείο.`) : t(`Reactivate “${name(node)}”?`, `Επανενεργοποίηση «${name(node)}»;`))) void act(`${base}/${section}/${node.id}`, 'PATCH', { active: !node.active });
      }}>{node.active ? t('Retire', 'Απενεργοποίηση') : t('Reactivate', 'Επανενεργοποίηση')}</button>}
      {(section === 'tags' || section === 'zone-types' || section === 'locations') && <button type="button" disabled={busy} onClick={() => void askDelete(node)}>{t('Delete', 'Διαγραφή')}</button>}
    </div></details>;
  }
  const term = foldText(query);
  const filtered: Item[] = (data?.[section] ?? []).filter(node => {
    const words = ['name' in node ? node.name : node.nameEn + ' ' + node.nameEl, 'code' in node ? node.code : '', 'company' in node ? node.company : '', 'email' in node ? node.email : ''];
    return foldText(words.join(' ')).includes(term);
  });

  const editorPanel = editor && data && <aside role="region" aria-label={t('Entry details', 'Στοιχεία εγγραφής')} className="management-editor panel">
      <button type="button" className="management-back" disabled={busy} onClick={() => { if (discard()) close(); }}>{t('Back to list', 'Επιστροφή στη λίστα')}</button>
      <form onSubmit={e => { e.preventDefault(); void save(); }}>
        <h3>{editor.copy ? t('Copy branch', 'Αντιγραφή κλάδου') : editor.item ? t('Edit entry', 'Επεξεργασία στοιχείου') : t('Add entry', 'Προσθήκη στοιχείου')}</h3>
        {section === 'locations' && <p aria-label={t('Location path', 'Διαδρομή τοποθεσίας')} className="location-breadcrumb">{locationPath(editor.item?.id ?? draft.parentId)}</p>}
        {section === 'locations' && editor.item && !editor.copy && <div className="location-actions">
          <button type="button" disabled={busy} onClick={() => edit(null, false, editor.item!.id)}>{t('Add child', 'Προσθήκη θυγατρικού')}</button>
          <button type="button" disabled={busy} onClick={() => edit(editor.item, true)}>{t('Copy branch', 'Αντιγραφή κλάδου')}</button>
          {secondaryActions(editor.item)}
        </div>}
        <fieldset disabled={busy}>
          {(section === 'people' || section === 'trades') && textField('code', t('Code', 'Κωδικός'), true)}
          {section === 'people' ? <>
            {textField('name', t('Name', 'Όνομα'), true)}
            <VocabSelect list="personRole" label={t('Role', 'Ρόλος')} value={draft.role} onChange={value => update('role', value)} required />
            {textField('company', t('Company', 'Εταιρεία'))}{textField('email', t('Email', 'Email'))}{textField('phone', t('Phone', 'Τηλέφωνο'))}
          </> : <>
            <p>{t('Provide at least one name. The other language is optional.', 'Συμπληρώστε τουλάχιστον ένα όνομα. Η άλλη γλώσσα είναι προαιρετική.')}</p>
            {textField('nameEn', t('English name', 'Αγγλικό όνομα'))}{textField('nameEl', t('Greek name', 'Ελληνικό όνομα'))}
          </>}
          {section === 'trades' && <>
            <Field label={t('English definition', 'Αγγλικός ορισμός')}><textarea value={draft.defEn} maxLength={2000} onChange={e => update('defEn', e.target.value)} /></Field>
            <Field label={t('Greek definition', 'Ελληνικός ορισμός')}><textarea value={draft.defEl} maxLength={2000} onChange={e => update('defEl', e.target.value)} /></Field>
          </>}
          {section === 'locations' && <>
            <Field label={t('Parent location', 'Γονική τοποθεσία')}><select value={draft.parentId ?? ''} onChange={e => update('parentId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">{t('Project root', 'Ρίζα έργου')}</option>
              {parentChoices(data.locations, editor.item?.id ?? null).map(({ node, depth }) => <option key={node.id} value={node.id}>{'— '.repeat(depth)}{name(node)}{!node.active ? t(' (retired)', ' (ανενεργό)') : ''}</option>)}
            </select></Field>
            {!editor.copy && <>
              <VocabSelect list="locationNodeKind" label={t('Location kind', 'Είδος τοποθεσίας')} value={draft.kind} onChange={value => update('kind', value)} required />
              <Field label={t('Zone type', 'Τύπος ζώνης')}><select value={draft.zoneTypeId ?? ''} onChange={e => update('zoneTypeId', e.target.value ? Number(e.target.value) : null)}><option value="">{t('None', 'Κανένας')}</option>{data['zone-types'].map(zone => <option key={zone.id} value={zone.id}>{name(zone)}</option>)}</select></Field>
              <Field label={t('Sort order', 'Σειρά ταξινόμησης')} hint={t('Lower numbers appear first among siblings. Leave blank to keep the current order or append a new entry.', 'Οι μικρότεροι αριθμοί εμφανίζονται πρώτοι στο ίδιο επίπεδο. Κενό διατηρεί τη σειρά ή προσθέτει νέο στοιχείο στο τέλος.')}><input type="number" step="1" value={draft.sortOrder} onChange={e => update('sortOrder', e.target.value)} /></Field>
            </>}
          </>}
          {collision && <div role="alert">
            <p>{t('This name already belongs to', 'Αυτό το όνομα ανήκει ήδη σε')}: <strong>{name(collision)}</strong> ({collision.nameEn} / {collision.nameEl}).</p>
            {editor.item ? <><p>{t('Merging replaces this tag on every record with the existing tag. The existing tag keeps its names.', 'Η συγχώνευση αντικαθιστά αυτή την ετικέτα σε όλες τις εγγραφές με την υπάρχουσα. Η υπάρχουσα ετικέτα διατηρεί τα ονόματά της.')}</p>
              <button type="button" onClick={() => { if (window.confirm(t(`Merge “${name(editor.item!)}” into “${name(collision)}”?`, `Συγχώνευση «${name(editor.item!)}» στην «${name(collision)}»;`))) void act(`${base}/tags/${editor.item!.id}/merge`, 'POST', { intoId: collision.id }); }}>{t('Merge into existing tag', 'Συγχώνευση στην υπάρχουσα ετικέτα')}</button></>
              : <button type="button" onClick={close}>{t('Keep existing tag', 'Διατήρηση υπάρχουσας ετικέτας')}</button>}
          </div>}
          <BusyButton busy={busy} type="submit">{t('Save', 'Αποθήκευση')}</BusyButton>
          <button type="button" onClick={() => { if (discard()) close(); }}>{t('Cancel', 'Ακύρωση')}</button>
        </fieldset>
      </form>
    </aside>;

  return <section aria-label={t('Managed lists', 'Διαχείριση λιστών')} className="management-page">
    <h1>{t('Managed lists', 'Διαχείριση λιστών')}</h1>
    <nav aria-label={t('List selection', 'Επιλογή λίστας')} className="tabs managed-nav">
      {sections.map(key => <button key={key} type="button" aria-pressed={key === section} disabled={busy} onClick={() => changeSection(key)}>{title(key)}</button>)}
    </nav>
    <div className="managed-phone-select"><Field label={t('List', 'Λίστα')}><select value={section} disabled={busy} onChange={e => changeSection(e.target.value as Section)}>{sections.map(key => <option key={key} value={key}>{title(key)}</option>)}</select></Field></div>
    {validation && <p role="alert" className="error">{validation}</p>}
    {listError ? <p role="alert" className="error">{listError}</p> : <ErrorNotice error={error} />}
    {loading && <p role="status">{t('Loading lists…', 'Φόρτωση λιστών…')}</p>}
    {!loading && !data && <button type="button" disabled={busy} onClick={() => { setBusy(true); setError(null); void load().catch(setError).finally(() => setBusy(false)); }}>{t('Retry', 'Επανάληψη')}</button>}
    {data && <>

      {confirmation && <div role="alertdialog" aria-modal="false" aria-label={t('Confirm deletion', 'Επιβεβαίωση διαγραφής')} className="panel">
        <p>{t('Delete', 'Διαγραφή')} “{name(confirmation.item)}”?</p>
        {section === 'tags' && <p>{t(`This tag is used by ${confirmation.records} records. Deleting removes it from all of them.`, `Αυτή η ετικέτα χρησιμοποιείται σε ${confirmation.records} εγγραφές. Η διαγραφή την αφαιρεί από όλες.`)}</p>}
        {section === 'locations' && <p>{t('This deletes the entire branch. A branch used by records cannot be deleted; retire it instead.', 'Διαγράφεται ολόκληρος ο κλάδος. Κλάδος που χρησιμοποιείται σε εγγραφές δεν διαγράφεται· απενεργοποιήστε τον.')}</p>}
        {section === 'zone-types' && <p>{t('A zone type used by a location cannot be deleted.', 'Τύπος ζώνης που χρησιμοποιείται σε τοποθεσία δεν μπορεί να διαγραφεί.')}</p>}
        <BusyButton busy={busy} type="button" onClick={() => void act(`${base}/${section}/${confirmation.item.id}`, 'DELETE')}>{t('Delete permanently', 'Οριστική διαγραφή')}</BusyButton>
        <button type="button" disabled={busy} onClick={() => { setConfirmation(null); setError(null); }}>{t('Cancel', 'Ακύρωση')}</button>
      </div>}
      <div className={`management-layout${editor ? ' has-editor' : ''}`}>
        <div className="management-collection panel">
          <div className="title-row"><h2>{title(section)}</h2><button type="button" disabled={busy} onClick={() => edit(null)}>{t('Add', 'Προσθήκη')}</button></div>
          <Field label={t('Search entries', 'Αναζήτηση στοιχείων')}><input type="search" value={query} onChange={e => setQuery(e.target.value)} /></Field>
          {section === 'locations' ? <LocationsTree nodes={data.locations} query={query} selectedId={editor?.item?.id ?? null} busy={busy} onSelect={node => edit(node)} /> : <>
            <table className="management-table managed-table" aria-label={title(section)}>
              <thead><tr><th>{t('Name', 'Όνομα')}</th>{(section === 'people' || section === 'trades') && <th className="management-secondary">{t('Code', 'Κωδικός')}</th>}<th><span className="sr-only">{t('Actions', 'Ενέργειες')}</span></th></tr></thead>
              <tbody>{filtered.map(node => <tr key={node.id} data-selected={editor?.item?.id === node.id}>
                <td><button type="button" className="entry-name" disabled={busy} onClick={() => edit(node)}><strong>{name(node)}</strong></button>
                  {'active' in node && !node.active && <span className="retired-label">{t('Retired', 'Ανενεργό')}</span>}
                  {'company' in node && node.company && <small className="entry-secondary">{node.company}</small>}
                  {'code' in node && <small className="management-phone-code">{node.code}</small>}
                  {'defEn' in node && (node.defEn || node.defEl) && <details className="entry-definition"><summary>{t('Definition', 'Ορισμός')}</summary><p>{lang === 'en' ? node.defEn || node.defEl : node.defEl || node.defEn}</p></details>}
                </td>
                {(section === 'people' || section === 'trades') && <td className="management-secondary">{'code' in node ? node.code : ''}</td>}
                <td className="row-controls"><button type="button" disabled={busy} onClick={() => edit(node)}>{t('Edit', 'Επεξεργασία')}</button>{secondaryActions(node)}</td>
              </tr>)}</tbody>
            </table>
            {filtered.length === 0 && <p>{term ? t('No matching entries.', 'Δεν βρέθηκαν στοιχεία.') : t('No entries yet.', 'Δεν υπάρχουν ακόμη στοιχεία.')}</p>}
          </>}
        </div>
        {editorPanel}
      </div>
    </>}
  </section>;
}
