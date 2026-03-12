import { memo } from 'react';
import ReactMarkdown from '../../ReactMarkdown';

const SessionSummaryCard = memo(function SessionSummaryCard({ summary }: { summary: string }) {
  if (!summary) return null;

  return (
    <div className="flex justify-center animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-muted/40 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Summary</div>
        <div className="text-left text-sm">
          <ReactMarkdown content={summary} />
        </div>
      </div>
    </div>
  );
});

export default SessionSummaryCard;
