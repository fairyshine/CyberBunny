import { useTranslation } from 'react-i18next';
import { useAgentConfig } from '../../../hooks/useAgentConfig';
import { Badge } from '../../ui/badge';

export default function LLMConfigCard() {
  const { t } = useTranslation();
  const { llmConfig } = useAgentConfig();

  return (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('settings.provider')}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {llmConfig.provider || '-'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('settings.model')}</span>
          <Badge variant="outline" className="text-xs font-mono max-w-[140px] truncate">
            {llmConfig.model || '-'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">API Key</span>
          <Badge variant={llmConfig.apiKey ? 'default' : 'destructive'} className="text-xs">
            {llmConfig.apiKey ? '✓' : '✗'}
          </Badge>
        </div>
    </div>
  );
}
