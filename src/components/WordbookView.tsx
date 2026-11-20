import { useMemo, useState } from 'react';
import { Volume2, Trash2, Search, ArrowUpRight, Bookmark } from 'lucide-react';
import type { WordbookItem } from '../types/lexicon';
import { speakWord } from '../lib/speech';
import { RibbonBow } from './RibbonBow';

interface WordbookViewProps {
  items: WordbookItem[];
  onLookupWord: (word: string) => void;
  onRemoveWord: (word: string) => void;
  onInsertInStudio: (word: string) => void;
  onExploreDictionary: () => void;
}

export function WordbookView({
  items,
  onLookupWord,
  onRemoveWord,
  onInsertInStudio,
  onExploreDictionary,
}: WordbookViewProps) {
  const [filterText, setFilterText] = useState('');
  const [posFilter, setPosFilter] = useState<string>('All');
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const partsOfSpeech = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.partOfSpeech).filter(Boolean)));
    return ['All', ...unique];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesPos = posFilter === 'All' || item.partOfSpeech === posFilter;
      const matchesQuery =
        !q ||
        (item.word || '').toLowerCase().includes(q) ||
        (item.definition || '').toLowerCase().includes(q);
      return matchesPos && matchesQuery;
    });
  }, [items, filterText, posFilter]);

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 lg:px-10 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#F3CBD7] pb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <RibbonBow className="h-4 w-7 text-[#DB5B8A]" />
            <p className="text-xs font-medium tracking-wide text-[#8B5E70]">
              Personal Lexicon Collection
            </p>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#3B1D2A] sm:text-4xl">
            Wordbook
          </h1>
          <p className="mt-2 text-sm text-[#6E4757]">
            <span className="tabular-nums font-medium text-[#3B1D2A]">{items.length}</span>{' '}
            {items.length === 1 ? 'saved entry' : 'saved entries'} ready for reference and drafting.
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreDictionary}
          className="min-h-[40px] rounded-full border border-[#F3CBD7] bg-white px-5 py-2 text-sm font-medium text-[#3B1D2A] transition-colors hover:border-[#DB5B8A] hover:bg-[#FFF9FB] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Search Dictionary
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#F3CBD7] bg-white p-10 text-center shadow-xs">
          <Bookmark className="mx-auto h-7 w-7 text-[#DB5B8A]" />
          <h2 className="mt-4 font-serif text-xl font-medium text-[#3B1D2A]">
            Your Wordbook is empty
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6E4757]">
            Save nuanced vocabulary from the Dictionary or Writing Studio to build a personal
            reference list for future drafts.
          </p>
          <button
            type="button"
            onClick={onExploreDictionary}
            className="mt-6 min-h-[40px] rounded-full bg-[#DB5B8A] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#BE3E6D] cursor-pointer"
          >
            Browse Curated Words
          </button>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B68999]"
              />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter saved words or definitions..."
                aria-label="Filter wordbook"
                className="min-h-[40px] w-full rounded-full border border-[#F3CBD7] bg-white pl-10 pr-4 text-sm text-[#3B1D2A] placeholder:text-[#B68999] focus:border-[#DB5B8A] focus:outline-none"
              />
            </div>

            {partsOfSpeech.length > 2 && (
              <div className="flex flex-wrap items-center gap-1 rounded-full bg-[#FCE7F3]/80 p-1">
                {partsOfSpeech.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosFilter(pos)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      posFilter === pos
                        ? 'bg-white text-[#3B1D2A] shadow-xs'
                        : 'text-[#6E4757] hover:text-[#3B1D2A]'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Word List */}
          {filteredItems.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#F3CBD7] bg-white p-8 text-center text-sm text-[#6E4757]">
              No saved entries match your current filter.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-[#FCE7F3] rounded-2xl border border-[#F3CBD7] bg-white shadow-xs">
              {filteredItems.map((item) => (
                <div
                  key={item.word}
                  className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => onLookupWord(item.word)}
                        className="font-serif text-2xl font-medium text-[#3B1D2A] hover:text-[#BE3E6D] hover:underline underline-offset-4 cursor-pointer"
                      >
                        {item.word}
                      </button>
                      <span className="font-mono text-xs text-[#8B5E70]">{item.phonetic}</span>
                      <span aria-hidden="true" className="text-[#E6B2C3]">
                        ·
                      </span>
                      <span className="font-serif italic text-sm text-[#BE3E6D]">
                        {item.partOfSpeech}
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#573142]">
                      {item.definition}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSpeakingWord(item.word);
                        speakWord(item.word, () => setSpeakingWord(null));
                      }}
                      aria-label={`Pronounce ${item.word}`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#F3CBD7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#573142] hover:bg-[#FFF6F8] whitespace-nowrap cursor-pointer"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>{speakingWord === item.word ? 'Speaking' : 'Listen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onInsertInStudio(item.word)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#F3CBD7] bg-[#FFF6F8] px-3.5 py-1.5 text-xs font-medium text-[#3B1D2A] hover:bg-[#FCE7F3] whitespace-nowrap cursor-pointer"
                    >
                      <span>Use in Draft</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#BE3E6D]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveWord(item.word)}
                      aria-label={`Remove ${item.word} from Wordbook`}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-[#F3CBD7] bg-white px-3 py-1.5 text-xs font-medium text-[#8B5E70] hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
