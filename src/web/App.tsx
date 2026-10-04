import { useEffect, useState } from 'react';
import type { Project } from '../server/lists/projects';
import { api, ApiError } from './core/api';
import { useI18n } from './core/i18n';
import { BusyButton, ErrorNotice, Field } from './core/forms';
import { RecordList } from './home/RecordList';
import { RecordPage } from './record/RecordPage';
import { ManagedLists } from './lists/ManagedLists';
interface User { displayName: string; isOwner: boolean }
function Login({ onLogin }: { onLogin(): void }) {
  const { t } = useI18n(); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  return <form className="panel login" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(null); try { await api('/api/auth/login', { method: 'POST', body: { username, password } }); setPassword(''); onLogin(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}><h1>{t('Sign in', 'Σύνδεση')}</h1><Field label={t('Username', 'Όνομα χρήστη')}><input autoComplete="username" value={username} required maxLength={100} onChange={event => setUsername(event.target.value)}/></Field><Field label={t('Password', 'Συνθηματικό')}><input autoComplete="current-password" type="password" value={password} required maxLength={200} onChange={event => setPassword(event.target.value)}/></Field><ErrorNotice error={error}/><BusyButton className="primary" busy={busy}>{t('Sign in', 'Σύνδεση')}</BusyButton></form>;
}
function Assigned() {
  const { t } = useI18n(); const [rows, setRows] = useState<{ id: number; humanId: string; title: string | null }[]>([]); const [error, setError] = useState<unknown>(null);
  useEffect(() => { const abort = new AbortController(); api<typeof rows>('/api/assigned-records', { signal: abort.signal }).then(setRows).catch(failure => { if (!abort.signal.aborted) setError(failure); }); return () => abort.abort(); }, []);
  return <><h1>{t('Assigned records', 'Καταγραφές με πρόσβαση')}</h1><ErrorNotice error={error}/><div className="record-list">{rows.map(row => <a className="panel" key={row.id} href={`/assigned/${row.id}`}><strong>{row.humanId}</strong> · {row.title || t('Untitled', 'Χωρίς τίτλο')}</a>)}</div>{!error && !rows.length && <p>{t('No records have been assigned to you.', 'Δεν σας έχει δοθεί πρόσβαση σε καταγραφές.')}</p>}</>;
}
export function App() {
  const { lang, setLang, t } = useI18n(); const shared = location.pathname === '/share'; const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(shared); const [error, setError] = useState<unknown>(null); const [projects, setProjects] = useState<Project[]>([]);
  const [token, setToken] = useState(() => shared ? location.hash.slice(1) : '');
  useEffect(() => { if (!shared) return; const changed = () => setToken(location.hash.slice(1)); addEventListener('hashchange', changed); return () => removeEventListener('hashchange', changed); }, [shared]);
  const load = async () => { setError(null); try { const current = await api<User>('/api/auth/me'); setUser(current); if (current.isOwner) setProjects(await api<Project[]>('/api/projects')); } catch (failure) { setUser(null); if (!(failure instanceof ApiError && failure.status === 401)) setError(failure); } finally { setReady(true); } };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { if (!shared) void load(); }, [shared]);
  const match = /^\/projects\/(\d+)\/(records|lists)(?:\/(\d+))?$/.exec(location.pathname); const projectId = match ? Number(match[1]) : undefined; const recordId = match?.[3] ? Number(match[3]) : undefined;
  const assignedId = /^\/assigned\/(\d+)$/.exec(location.pathname)?.[1];
  const project = projects.find(item => item.id === projectId);
  const from = new URLSearchParams(location.search).get('from') ?? ''; const safeFrom = from.startsWith('?') ? from : '';
  return <><header className="site-header"><a className="brand" href={shared ? undefined : user?.isOwner ? '/projects' : '/assigned'}>BuiltBasis</a>{project && <span>{project.name}</span>}<div className="header-actions"><label>{t('Language', 'Γλώσσα')} <select aria-label={t('Language', 'Γλώσσα')} value={lang} onChange={event => setLang(event.target.value as 'en' | 'el')}><option value="en">English</option><option value="el">Ελληνικά</option></select></label>{user && <><span>{user.displayName}</span><button onClick={async () => { try { await api('/api/auth/logout', { method: 'POST', body: {} }); location.assign('/login'); } catch (failure) { setError(failure); } }}>{t('Sign out', 'Αποσύνδεση')}</button></>}</div></header>
  {user?.isOwner && projectId && <nav className="site-nav"><a href={`/projects/${projectId}/records`}>{t('Records', 'Καταγραφές')}</a><a href={`/projects/${projectId}/lists`}>{t('Managed lists', 'Διαχείριση λιστών')}</a><a href="/projects">{t('Projects', 'Έργα')}</a></nav>}
  <main><ErrorNotice error={error}/>{shared ? (/^[A-Za-z0-9_-]{43}$/.test(token) ? <RecordPage context={{ mode: 'shared', base: '/api/shared', token }} onBack={() => {}}/> : <h1>{t('Record not available', 'Η καταγραφή δεν είναι διαθέσιμη')}</h1>) : !ready ? <p role="status">{t('Loading…', 'Φόρτωση…')}</p> : !user ? <Login onLogin={() => { location.assign(location.pathname === '/login' || location.pathname === '/' ? '/projects' : location.pathname + location.search); }}/> : !user.isOwner ? (assignedId ? <RecordPage context={{ mode: 'contributor', base: `/api/assigned-records/${assignedId}`, recordId: Number(assignedId) }} onBack={() => location.assign('/assigned')}/> : <Assigned/>) : projectId && project ? (match?.[2] === 'lists' ? <ManagedLists projectId={projectId}/> : recordId ? <RecordPage context={{ mode: 'owner', base: `/api/projects/${projectId}/records/${recordId}`, projectId, recordId }} onBack={() => location.assign(`/projects/${projectId}/records${safeFrom}`)}/> : <RecordList projectId={projectId}/>) : <><h1>{t('Projects', 'Έργα')}</h1>{projects.length ? <div className="record-list">{projects.map(item => <a className="panel" key={item.id} href={`/projects/${item.id}/records`}>{item.name}</a>)}</div> : <p>{t('No project has been set up yet. Ask the owner to load the project data.', 'Δεν έχει καταχωριστεί έργο. Ζητήστε από τον ιδιοκτήτη να φορτώσει τα δεδομένα.')}</p>}</>}</main></>;
}
