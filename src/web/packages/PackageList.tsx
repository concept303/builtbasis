import { PackageForm } from './PackageForm';
import { useEffect, useState } from 'react';
import { foldText, isPastTarget, PACKAGE_SORT_ORDER } from '../../domain';
import type { Person } from '../../server/lists/people';
import { api } from '../core/api';
import { ErrorNotice, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import { StatusBadge } from '../core/StatusBadge';
import { dateText } from '../record/helpers';
import { loadPackages, usePackageRefresh } from './data';
import { PackageStatusBar } from './PackageStatusBar';
export function PackageList({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { lang, t } = useI18n(); const { today, revision } = usePackageRefresh();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPackages>> | null>(null); const [people, setPeople] = useState<Person[]>([]);
  const [creating,setCreating] = useState(false);
  const [error, setError] = useState<unknown>(null); const [query, setQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setError(null);
    Promise.all([loadPackages(projectId, controller.signal), api<Person[]>(`/api/projects/${projectId}/people`, { signal: controller.signal })]).then(([result, persons]) => { if (!controller.signal.aborted) { setData(result); setPeople(persons); } }).catch(failure => { if (!controller.signal.aborted) { setData(null); setError(failure); } });
    return () => controller.abort();
  }, [projectId, revision, today]);
  const collator = new Intl.Collator(lang);
  const rows = data?.packages.filter(p => foldText(p.name).includes(foldText(query))).sort((a, b) => PACKAGE_SORT_ORDER.indexOf(a.status) - PACKAGE_SORT_ORDER.indexOf(b.status) || collator.compare(a.name, b.name) || a.id - b.id) ?? [];
  return <section className="package-list"><div className="title-row"><div><h1>{t('Work packages', 'Πακέτα εργασιών')}</h1><p className="muted">{projectName}</p></div>{data && data.packages.length > 0 && <button className="primary" onClick={()=>setCreating(true)}>{t('New work package','Νέο πακέτο εργασιών')}</button>}</div>{new URLSearchParams(location.search).has('deleted') && <p role="status">{t('Work package deleted.','Το πακέτο εργασιών διαγράφηκε.')}</p>}{creating && <PackageForm projectId={projectId} people={people} inline={false} onSaved={p=>location.assign(`/projects/${projectId}/work-packages/${p.id}`)} onCancel={()=>setCreating(false)}/>}<ErrorNotice error={error}/>
    {!data && !error && <p role="status">{t('Loading…', 'Φόρτωση…')}</p>}
    {data && !data.packages.length && <div className="panel"><h2>{t('No work packages yet', 'Δεν υπάρχουν ακόμη πακέτα εργασιών')}</h2><p>{t('A work package groups related Tasks, Quality Issues and Detail Clarifications under one name, such as Tiling works.', 'Ένα πακέτο εργασιών συγκεντρώνει σχετικές εργασίες, ζητήματα ποιότητας και τεχνικές διευκρινίσεις κάτω από ένα όνομα, π.χ. «Εργασίες πλακιδίων».')}</p><button className="primary" onClick={()=>setCreating(true)}>{t('New work package','Νέο πακέτο εργασιών')}</button></div>}
    {data && data.packages.length > 0 && <><Field label={t('Find a work package', 'Αναζήτηση πακέτων εργασιών')}><input type="search" value={query} onChange={event => setQuery(event.target.value)}/></Field>
      <p role="status">{query ? t(`${rows.length} of ${data.packages.length} work packages`, `${rows.length} από ${data.packages.length} πακέτα εργασιών`) : t(`${rows.length} ${rows.length === 1 ? 'work package' : 'work packages'}`, `${rows.length} ${rows.length === 1 ? 'πακέτο εργασιών' : 'πακέτα εργασιών'}`)}</p>
      {!rows.length ? <p>{t(`No work package matches “${query}”.`, `Δεν βρέθηκε πακέτο εργασιών για την αναζήτηση «${query}».`)}</p> : <table className="package-table"><thead><tr>{[t('Work package','Πακέτο εργασιών'),t('Status','Κατάσταση'),t('Responsible','Υπεύθυνος'),t('Target date','Ημερομηνία στόχου'),t('Records','Καταγραφές')].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(p => <tr key={p.id} onClick={event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.getSelection()?.toString() || (event.target as Element).closest('a,button,input')) return;
        location.assign(`/projects/${projectId}/work-packages/${p.id}`);
      }}><td><a href={`/projects/${projectId}/work-packages/${p.id}`}>{p.name}</a>{p.description && <small className="clamped-description">{p.description}</small>}</td>
        <td data-label={t('Status','Κατάσταση')}><StatusBadge kind="package" status={p.status}/></td><td data-label={t('Responsible','Υπεύθυνος')}>{people.find(person => person.id === p.responsibleId)?.name ?? '—'}</td>
        <td data-label={t('Target date','Ημερομηνία στόχου')}>{dateText(p.targetDate, lang)}{isPastTarget(p.status,p.targetDate,data.today) && <small className="past-target">{t('Past target','Υπέρβαση ημερομηνίας στόχου')}</small>}</td>
        <td data-label={t('Records','Καταγραφές')}>{p.counts.total ? <><PackageStatusBar counts={p.counts} variant="list"/>{p.counts.overdue > 0 && <small className="overdue-text">{t(`${p.counts.overdue} overdue`,`${p.counts.overdue} ${p.counts.overdue === 1 ? 'εκπρόθεσμη' : 'εκπρόθεσμες'}`)}</small>}</> : t('No records','Χωρίς καταγραφές')}</td>
      </tr>)}</tbody></table>}</>}
  </section>;
}
