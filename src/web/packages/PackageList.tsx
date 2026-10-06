import { useI18n } from '../core/i18n';
export function PackageList({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { t } = useI18n();
  return <section data-project={projectId}><h1>{t('Work packages', 'Πακέτα εργασιών')}</h1><p>{projectName}</p></section>;
}
