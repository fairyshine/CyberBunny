import { useTranslation } from 'react-i18next';
import { useAgentConfig } from '../../../hooks/useAgentConfig';
import { Badge } from '../../ui/badge';

export default function ToolStatusCard() {
  const { t } = useTranslation();
  const { enabledTools } = useAgentConfig();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {enabledTools.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t('dashboard.noTools')}</span>
        ) : (
          enabledTools.map((tool) => (
            <Badge key={tool} variant="secondary" className="text-xs font-mono">
              {tool}
            </Badge>
          ))
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {t('dashboard.enabledCount', { count: enabledTools.length })}
      </div>
    </div>
  );
}
