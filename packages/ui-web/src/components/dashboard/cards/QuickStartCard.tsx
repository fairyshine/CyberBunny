import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/badge';

export default function QuickStartCard() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-mono text-xs border-elegant">
          {t('status.badge.python')}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs border-elegant">
          {t('status.badge.search')}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs border-elegant">
          {t('status.badge.file')}
        </Badge>
    </div>
  );
}
