import {
  SquareFunction,
  Search,
  FolderOpen,
  Plug,
  Wrench,
  Brain,
  Terminal,
  Clock,
  Heart,
  MessagesSquare,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  python: SquareFunction,
  search: Search,
  folder: FolderOpen,
  plug: Plug,
  brain: Brain,
  terminal: Terminal,
  clock: Clock,
  heart: Heart,
  mind: MessagesSquare,
};

// Centralized tool display metadata — single source of truth
export const toolDisplayInfo: Record<string, { name: string; description: string; icon: string }> = {
  python: { name: 'Python', description: 'Execute Python code', icon: 'python' },
  web_search: { name: 'Web Search', description: 'Search the web', icon: 'search' },
  file_manager: { name: 'File Manager', description: 'Manage files', icon: 'folder' },
  memory: { name: 'Memory', description: 'Persistent memory', icon: 'brain' },
  exec: { name: 'Shell Exec', description: 'Execute shell commands (Desktop only)', icon: 'terminal' },
  cron: { name: 'Cron', description: 'Schedule periodic tasks', icon: 'clock' },
  heartbeat: { name: 'Heartbeat', description: 'Periodic watchlist', icon: 'heart' },
  mind: { name: 'Mind', description: 'Internal self-dialogue', icon: 'mind' },
};

export function getToolIcon(toolId: string): React.ComponentType<LucideProps> {
  const info = toolDisplayInfo[toolId];
  if (info) return iconMap[info.icon] || Wrench;
  return Wrench;
}

interface ToolIconProps {
  icon?: string;
  className?: string;
}

export function ToolIcon({ icon, className = 'w-5 h-5' }: ToolIconProps) {
  if (!icon) return <Wrench className={className} />;
  const Icon = iconMap[icon] || Wrench;
  return <Icon className={className} />;
}
