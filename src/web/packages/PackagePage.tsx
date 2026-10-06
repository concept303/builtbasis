import { useI18n } from '../core/i18n';
export function PackagePage({ projectId, packageId }: { projectId: number; packageId: number }) {
  const { t } = useI18n();
  return <section data-package={packageId}><a href={`/projects/${projectId}/work-packages`}>{t('Work packages', 'Πακέτα εργασιών')}</a></section>;
}
