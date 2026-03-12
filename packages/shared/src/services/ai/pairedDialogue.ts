import type { ModelMessage, Tool } from 'ai';
import type { LLMConfig, Message } from '../../types';
import { createSnapshotMessage, runDialogueTurn, type DialogueSnapshot, type DialogueVisibleCallbacks } from './dialogue';

export interface PairedDialogueTrack {
  llmConfig: LLMConfig;
  systemPrompt: string;
  transcript: ModelMessage[];
  history: DialogueSnapshot;
  tools: Record<string, Tool>;
  visibleCallbacks?: DialogueVisibleCallbacks;
  visibleTextRole?: 'assistant' | 'user';
  visibleTextType?: Message['type'];
  visibleTextMode?: 'per-step' | 'single' | 'none';
  exposeToolMessages?: boolean;
  hideSpecialTokenInVisibleText?: string;
  visibleTextSanitizer?: (content: string) => string;
  onPeerMessage?: (content: string) => void;
  shouldStop?: (content: string) => boolean;
}

export interface RunPairedDialogueOptions {
  maxTurns: number;
  abortSignal: AbortSignal;
  firstTrack: PairedDialogueTrack;
  secondTrack: PairedDialogueTrack;
  onReply?: (speaker: 'first' | 'second', content: string) => void;
  onTransfer?: (speaker: 'first' | 'second', content: string) => void;
}

export async function runPairedDialogue({
  maxTurns,
  abortSignal,
  firstTrack,
  secondTrack,
  onReply,
  onTransfer,
}: RunPairedDialogueOptions): Promise<void> {
  for (let turn = 0; turn < maxTurns; turn += 1) {
    const firstReply = await generateTrackReply(firstTrack, abortSignal);
    if (!firstReply) break;

    onReply?.('first', firstReply);
    if (firstTrack.shouldStop?.(firstReply)) {
      break;
    }

    transferReply(firstTrack, secondTrack, firstReply);
    onTransfer?.('first', firstReply);

    const secondReply = await generateTrackReply(secondTrack, abortSignal);
    if (!secondReply) break;

    onReply?.('second', secondReply);
    if (secondTrack.shouldStop?.(secondReply)) {
      break;
    }

    transferReply(secondTrack, firstTrack, secondReply);
    onTransfer?.('second', secondReply);
  }
}

async function generateTrackReply(track: PairedDialogueTrack, abortSignal: AbortSignal): Promise<string> {
  return runDialogueTurn({
    llmConfig: track.llmConfig,
    systemPrompt: track.systemPrompt,
    transcript: track.transcript,
    history: track.history,
    tools: track.tools,
    abortSignal,
    visibleCallbacks: track.visibleCallbacks,
    visibleTextRole: track.visibleTextRole,
    visibleTextType: track.visibleTextType,
    visibleTextMode: track.visibleTextMode,
    exposeToolMessages: track.exposeToolMessages,
    hideSpecialTokenInVisibleText: track.hideSpecialTokenInVisibleText,
    visibleTextSanitizer: track.visibleTextSanitizer,
  });
}

function transferReply(fromTrack: PairedDialogueTrack, toTrack: PairedDialogueTrack, content: string): void {
  fromTrack.transcript.push({ role: 'assistant', content });
  toTrack.transcript.push({ role: 'user', content });
  toTrack.history.messages.push(createSnapshotMessage({ role: 'user', content, type: 'normal' }));
  toTrack.onPeerMessage?.(content);
}
