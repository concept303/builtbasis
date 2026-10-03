import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './core/i18n';
import './styles.css';
createRoot(document.getElementById('root')!).render(<LanguageProvider shared={location.pathname === '/share'}><App/></LanguageProvider>);
