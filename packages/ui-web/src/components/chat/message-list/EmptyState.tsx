import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/badge';

const EmptyState = memo(function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="text-center py-20 text-muted-foreground animate-fade-in">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
        <span className="text-3xl">🐰</span>
      </div>
      <h2 className="text-xl font-semibold mb-3 text-foreground tracking-tight">OpenBunny</h2>
      <p className="text-sm mb-8 max-w-md mx-auto leading-relaxed">
        {t('chat.emptyState.desc')}
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
        <Badge variant="outline" className="text-xs font-normal border-elegant">{t('status.badge.python')}</Badge>
        <Badge variant="outline" className="text-xs font-normal border-elegant">{t('status.badge.search')}</Badge>
        <Badge variant="outline" className="text-xs font-normal border-elegant">{t('status.badge.calc')}</Badge>
        <Badge variant="outline" className="text-xs font-normal border-elegant">{t('status.badge.file')}</Badge>
      </div>
    </div>
  );
});

export default EmptyState;
