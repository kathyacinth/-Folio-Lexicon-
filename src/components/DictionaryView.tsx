import { useState, type FormEvent } from 'react';
import { Search, X, AlertCircle, BookOpen, PenLine } from 'lucide-react';
import type { DictionaryEntry } from '../types/lexicon';
import { CURATED_LEXICON_GROUPS } from '../data/samples';
import { DictionaryEntryCard } from './DictionaryEntryCard';
import { RibbonBow } from './RibbonBow';

interface DictionaryViewProps {
  query: string;
  entry: DictionaryEntry | null;
  loading: boolean;
  error: string | null;
  recentWords: string[];
  savedWords: Set<string>;
  onSearch: (word: string) => void;
  onToggleSave: (entry: DictionaryEntry) => void;
  onUseWordInDraft: (word: string) => void;
  onOpenStudio: () => void;
}

export function DictionaryView({
  query,
  entry,
  loading,
  error,
  recentWords,
  savedWords,
  onSearch,
  onToggleSave,
  onUseWordInDraft,
  onOpenStudio,
}: DictionaryViewProps) {
  const [inputValue, setInputValue] = useState(query);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleQuickLookup = (word: string) => {
    setInputValue(word);
    onSearch(word);
  };

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 lg:px-10 lg:py-12">
      {/* Masthead & Unified Dictionary Search */}
      <section className="border-b border-[#F3CBD7] pb-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2.5">
              <RibbonBow className="h-4 w-7 text-[#DB5B8A]" />
              <p className="text-xs font-medium tracking-wide text-[#8B5E70]">
                Editorial Lexicon &amp; Thesaurus
              </p>
            </div>
            <h1
              className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#3B1D2A] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              Precision begins with the{' '}
              <span className="italic text-[#BE3E6D]">right word.</span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <button
              type="button"
              onClick={onOpenStudio}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#F3CBD7] bg-white px-5 py-2 text-sm font-medium text-[#3B1D2A] transition-colors duration-150 hover:border-[#DB5B8A] hover:bg-[#FFF9FB] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PenLine className="h-4 w-4 text-[#BE3E6D]" />
              <span>Open Spelling, Grammar &amp; Writing Studio</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B68999]"
              />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Look up a word, check spelling, or explore synonyms (e.g., perspicuous, corroborate)..."
                aria-label="Search dictionary"
                className="min-h-[48px] w-full rounded-full border border-[#EFC3D1] bg-white pl-12 pr-11 text-base text-[#3B1D2A] placeholder:text-[#B68999] transition-colors focus:border-[#DB5B8A] focus:outline-none focus:ring-2 focus:ring-[#DB5B8A]/20"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#9B7384] hover:bg-[#FFF6F8] hover:text-[#3B1D2A] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="min-h-[48px] rounded-full bg-[#DB5B8A] px-7 py-3 text-sm font-medium text-white shadow-xs transition-colors duration-150 hover:bg-[#BE3E6D] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? 'Looking up…' : 'Look Up Word'}
            </button>
          </div>
        </form>

        {recentWords.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#8B5E70]">
            <span>Recent lookups:</span>
            {recentWords.map((word, idx) => (
              <span key={word} className="inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickLookup(word)}
                  className="font-medium text-[#573142] underline decoration-[#E6B2C3] underline-offset-4 hover:text-[#BE3E6D] hover:decoration-[#BE3E6D] cursor-pointer"
                >
                  {word}
                </button>
                {idx < recentWords.length - 1 && (
                  <span aria-hidden="true" className="text-[#E6B2C3]">
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <div>
            <p className="font-medium">Lookup unavailable</p>
            <p className="mt-0.5 text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div
          aria-busy="true"
          className="mt-8 rounded-2xl border border-[#F3CBD7] bg-white p-7 lg:p-10"
        >
          <div className="h-10 w-56 animate-pulse rounded bg-[#FCE7F3]" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-[#FFF0F5]" />
          <div className="mt-8 space-y-4 border-t border-[#FCE7F3] pt-8">
            <div className="h-4 w-32 animate-pulse rounded bg-[#FCE7F3]" />
            <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-[#FFF0F5]" />
            <div className="h-5 w-4/5 max-w-xl animate-pulse rounded bg-[#FFF0F5]" />
          </div>
        </div>
      )}

      {/* Active Entry */}
      {!loading && entry && typeof entry.word === 'string' && (
        <div className="mt-8">
          <DictionaryEntryCard
            entry={entry}
            isSaved={savedWords.has(entry.word.toLowerCase())}
            onToggleSave={onToggleSave}
            onLookupWord={handleQuickLookup}
            onUseWordInDraft={onUseWordInDraft}
          />
        </div>
      )}

      {/* Curated Lexicon Index */}
      <section className={entry || loading ? 'mt-14 pt-10 border-t border-[#F3CBD7]' : 'mt-10'}>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#3B1D2A]">
              Curated Writers’ Index
            </h2>
            <p className="mt-1 text-sm text-[#6E4757]">
              Explore high-precision verbs, adjectives, and analytical nouns to elevate your prose.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#8B5E70]">
            <BookOpen className="h-3.5 w-3.5 text-[#BE3E6D]" />
            <span>Select any headword for full definitions &amp; nuances</span>
          </span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {CURATED_LEXICON_GROUPS.map((group) => (
            <div
              key={group.category}
              className="rounded-2xl border border-[#F3CBD7] bg-white p-6 shadow-xs"
            >
              <h3 className="font-serif text-lg font-medium text-[#3B1D2A]">
                {group.category}
              </h3>
              <p className="mt-1 text-sm text-[#8B5E70]">{group.description}</p>

              <ul className="mt-5 divide-y divide-[#FCE7F3] border-t border-[#FCE7F3]">
                {group.words.map((item) => (
                  <li key={item.word}>
                    <button
                      type="button"
                      onClick={() => handleQuickLookup(item.word)}
                      className="flex w-full items-baseline justify-between gap-4 py-3 text-left transition-colors hover:text-[#BE3E6D] cursor-pointer"
                    >
                      <span className="font-serif text-base font-medium text-[#3B1D2A] hover:text-[#BE3E6D]">
                        {item.word}
                      </span>
                      <span className="text-xs text-[#8B5E70] text-right">{item.gloss}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
