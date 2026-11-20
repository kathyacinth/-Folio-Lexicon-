import { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { DictionaryEntry } from '../types/lexicon';
import { DictionaryEntryCard } from './DictionaryEntryCard';

interface DictionaryDrawerProps {
  open: boolean;
  query: string;
  entry: DictionaryEntry | null;
  loading: boolean;
  error: string | null;
  savedWords: Set<string>;
  onClose: () => void;
  onLookupWord: (word: string) => void;
  onToggleSave: (entry: DictionaryEntry) => void;
  onReplaceWithWord?: (word: string) => void;
}

export function DictionaryDrawer({
  open,
  query,
  entry,
  loading,
  error,
  savedWords,
  onClose,
  onLookupWord,
  onToggleSave,
  onReplaceWithWord,
}: DictionaryDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#3B1D2A]/30 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Dictionary entry for ${query}`}
    >
      <div
        className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[#F3CBD7] bg-[#FFF6F8] p-6 shadow-xl lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#F3CBD7] pb-4">
          <div>
            <p className="text-xs font-medium text-[#8B5E70]">Quick Lexicon Lookup</p>
            <h2 className="font-serif text-lg font-medium text-[#3B1D2A]">
              {entry?.word || query}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dictionary drawer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F3CBD7] bg-white text-[#6E4757] transition-colors hover:bg-[#FCE7F3] hover:text-[#3B1D2A] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div aria-busy="true" className="rounded-2xl border border-[#F3CBD7] bg-white p-6">
            <div className="h-8 w-44 animate-pulse rounded bg-[#FCE7F3]" />
            <div className="mt-3 h-4 w-56 animate-pulse rounded bg-[#FFF0F5]" />
            <div className="mt-6 space-y-3 border-t border-[#FCE7F3] pt-6">
              <div className="h-4 w-28 animate-pulse rounded bg-[#FCE7F3]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#FFF0F5]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[#FFF0F5]" />
            </div>
          </div>
        )}

        {!loading && entry && typeof entry.word === 'string' && (
          <DictionaryEntryCard
            entry={entry}
            isSaved={savedWords.has(entry.word.toLowerCase())}
            onToggleSave={onToggleSave}
            onLookupWord={onLookupWord}
            onUseWordInDraft={onReplaceWithWord}
            compact
          />
        )}
      </div>
    </div>
  );
}
