import '../../../src/web/styles.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../../src/web/core/i18n';
import { InfoButton } from '../../../src/web/core/InfoButton';
import { SearchPicker } from '../../../src/web/core/SearchPicker';
import { useToday } from '../../../src/web/core/useToday';
import { PackageStatusBar } from '../../../src/web/packages/PackageStatusBar';
import { codesOf, type Status } from '../../../src/domain';
function Harness() {
  const [single, setSingle] = useState<number | null>(null); const [multi, setMulti] = useState<number[]>([]);
  const today = useToday();
  const items = [{ id: 1, label: 'ΤΟΊΧΟΣ' }, { id: 2, label: 'Frames' }, { id: 3, label: 'Old', disabled: true }];
  const byStatus = Object.fromEntries(codesOf('status').map(s => [s, s === 'closed' ? 8 : s === 'on_hold' ? 2 : 0])) as Record<Status, number>;
  return <main><p>Priority <InfoButton label="Priority definition">Επεξήγηση της προτεραιότητας με αρκετές λέξεις για μικρή οθόνη.</InfoButton></p><form onSubmit={e => { e.preventDefault(); document.body.dataset.submitted = 'yes'; }}>
    <SearchPicker mode="single" label="Choose package" emptyLabel="No package" items={items} value={single} onChange={setSingle}/>
    <SearchPicker mode="multiple" label="Choose trades" emptyLabel="No trades" items={items} value={multi} onChange={setMulti}/>
    <button type="submit">Save</button></form><button>Outside</button><output aria-label="Today">{today}</output>
    <PackageStatusBar variant="detail" counts={{ total: 10, outstanding: 2, overdue: 0, byStatus }}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Harness/></LanguageProvider>);
