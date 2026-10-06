import type { Ref } from 'react';
import type { WorkPackage } from '../../domain';
import { useI18n } from '../core/i18n';
import { SearchPicker } from '../core/SearchPicker';
import { StatusBadge } from '../core/StatusBadge';
export function PackagePicker({ packages, value, savedValue, onChange, onCreate, triggerRef }: { packages: WorkPackage[]; value: number | null; savedValue: number | null; onChange: (value: number | null) => void; onCreate: () => void; triggerRef?: Ref<HTMLButtonElement> }) {
  const { t } = useI18n(); const finished = (p: WorkPackage) => ['completed','cancelled'].includes(p.status);
  const current = packages.find(p => p.id === value); const saved = packages.find(p => p.id === savedValue);
  const items = [...packages].sort((a,b) => Number(finished(a))-Number(finished(b))).map(p => ({ id:p.id,label:p.name,group:finished(p)?t('Completed or cancelled','Ολοκληρωμένα ή ακυρωμένα'):t('Active packages','Ενεργά πακέτα'),suffix:<StatusBadge kind="package" status={p.status}/> }));
  if (value !== null && !current) items.push({ id:value,label:t('Unavailable package — choose another','Μη διαθέσιμο πακέτο — επιλέξτε άλλο'),group:'',suffix:<></> });
  return <div className="package-picker"><div className="label-actions"><span>{t('Work package','Πακέτο εργασιών')}</span><button type="button" className="text-action" onClick={onCreate}>{t('+ New package','+ Νέο πακέτο')}</button></div>
    <SearchPicker noMatches={t('No work package matches. Use + New package to create one.','Δεν βρέθηκε πακέτο εργασιών. Επιλέξτε «+ Νέο πακέτο» για να δημιουργήσετε ένα.')} mode="single" label={t('Choose work package','Επιλογή πακέτου εργασιών')} emptyLabel={t('No work package','Χωρίς πακέτο εργασιών')} items={items} value={value} onChange={onChange} triggerRef={triggerRef}/>
    {value !== savedValue && <small className="package-change">{saved && current ? t(`Moves from “${saved.name}” to “${current.name}” when you save the record.`,`Η καταγραφή θα μεταφερθεί από το πακέτο «${saved.name}» στο «${current.name}» όταν την αποθηκεύσετε.`) : current ? t(`Joins “${current.name}” when you save the record.`,`Η καταγραφή θα προστεθεί στο πακέτο «${current.name}» όταν την αποθηκεύσετε.`) : saved && value === null ? t(`Leaves “${saved.name}” when you save the record.`,`Η καταγραφή θα αφαιρεθεί από το πακέτο «${saved.name}» όταν την αποθηκεύσετε.`) : t('Refresh package choices before saving.','Ανανεώστε τις επιλογές πακέτων πριν αποθηκεύσετε.')}</small>}
  </div>;
}
