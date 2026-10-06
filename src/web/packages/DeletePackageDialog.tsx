import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PackageDetail } from '../../domain';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { BusyButton, ErrorNotice, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import { loadPackages, packageBase } from './data';
export function DeletePackageDialog({ projectId, packageId, onClose }: { projectId:number; packageId:number; onClose:()=>void }) {
  const { t } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  const [data,setData] = useState<PackageDetail | null>(null); const [confirmation,setConfirmation] = useState('');
  const [busy,setBusy] = useState(false); const [uncertain,setUncertain] = useState(false); const [error,setError] = useState<unknown>(null);
  const endpoint = `${packageBase(projectId)}/${packageId}`;
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; const controller = new AbortController(); dialog.current?.showModal(); api<PackageDetail>(endpoint,{signal:controller.signal}).then(setData).catch(e => { if(!controller.signal.aborted)setError(e); }); return () => { controller.abort();dialog.current?.close();opener?.focus(); }; },[endpoint]);
  const done = () => location.assign(`/projects/${projectId}/work-packages?deleted=1`);
  async function refresh() {
    setBusy(true);setError(null);
    try { const list = await loadPackages(projectId); if(!list.packages.some(p => p.id === packageId)) {done();return;} setData(await api<PackageDetail>(endpoint));setUncertain(false); }
    catch(e) {setError(e);} finally {setBusy(false);}
  }
  async function remove() {
    if(busy || uncertain || !data || confirmation !== data.name || data.counts.total) return;
    setBusy(true);setError(null);
    try {await api(endpoint,{method:'DELETE',body:{confirmName:confirmation}});done();}
    catch(e) {
      setError(e);
      if(e instanceof ApiError && e.code === 'work_package_not_empty') { const count=(e.details as {recordCount:number}).recordCount;setData({...data,counts:{...data.counts,total:count}}); }
      else if(e instanceof ApiError && e.code === 'work_package_confirmation_mismatch') { try{setData(await api<PackageDetail>(endpoint));}catch(failure){setError(failure);} }
      else if(isUnknownOutcome(e))setUncertain(true);
    }finally{setBusy(false);}
  }
  return createPortal(<dialog ref={dialog} className="management-dialog" aria-label={t('Delete work package?','Διαγραφή πακέτου εργασιών;')} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><h2>{t('Delete work package?','Διαγραφή πακέτου εργασιών;')}</h2><ErrorNotice error={error}/>{!data&&!error&&<p role="status">{t('Loading…','Φόρτωση…')}</p>}
    {data&&<><strong>{data.name}</strong>{data.counts.total>0 ? <><p>{t(`This package contains ${data.counts.total} records. Move them to another package or set them to No work package first. Deleting a package never deletes records.`,`Το πακέτο περιέχει ${data.counts.total} καταγραφές. Μεταφέρετέ τις πρώτα σε άλλο πακέτο ή επιλέξτε «Χωρίς πακέτο εργασιών». Η διαγραφή πακέτου δεν διαγράφει καταγραφές.`)}</p><a href={`/projects/${projectId}/records?workPackageId=${packageId}`}>{t('Show its records','Εμφάνιση καταγραφών')}</a></> : <><p>{t('The package is empty, so no record is affected. Its name stays in the history of records that used it.','Το πακέτο είναι κενό, οπότε δεν επηρεάζεται καμία καταγραφή. Το όνομά του παραμένει στο ιστορικό των καταγραφών που ανήκαν σε αυτό.')}</p><form onSubmit={e=>{e.preventDefault();void remove();}}><Field label={t('Type the package name to confirm','Πληκτρολογήστε το όνομα του πακέτου για επιβεβαίωση')}><input autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy||uncertain}/></Field><BusyButton type="submit" className="destructive" busy={busy} disabled={uncertain||confirmation!==data.name}>{t('Delete package','Διαγραφή πακέτου')}</BusyButton></form></>}</>}
    {uncertain&&<p role="alert">{t('Refresh the list to check the deletion result.','Ανανεώστε τη λίστα για να ελέγξετε το αποτέλεσμα της διαγραφής.')} <BusyButton busy={busy} onClick={()=>void refresh()}>{t('Refresh list','Ανανέωση λίστας')}</BusyButton></p>}
    <button disabled={busy} onClick={onClose}>{t('Keep package','Διατήρηση πακέτου')}</button>
  </dialog>,document.body);
}
