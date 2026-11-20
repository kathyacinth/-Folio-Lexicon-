import { useState } from 'react';
import { Bookmark, Check, Volume2, ArrowUpRight } from 'lucide-react';
import type { DictionaryEntry } from '../types/lexicon';
import { speakWord } from '../lib/speech';
import { RibbonBow } from './RibbonBow';

interface DictionaryEntryCardProps {
  entry: DictionaryEntry;
  isSaved: boolean;
  onToggleSave: (entry: DictionaryEntry) => void;
  onLookupWord: (word: string) => void;
  onUseWordInDraft?: (word: string) => void;
  compact?: boolean;
}

export function DictionaryEntryCard({
  entry,
  isSaved,
  onToggleSave,
  onLookupWord,
  onUseWordInDraft,
  compact = false,
}: DictionaryEntryCardProps) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    setSpeaking(true);
    speakWord(entry.word, () => setSpeaking(false));
  };

  return (
    <article className="bg-white border border-[#F3CBD7] rounded-2xl shadow-xs">
      {/* Headword & Pronunciation Masthead */}
      <div
        className={`${
          compact ? 'p-6' : 'p-7 lg:p-10'
        } border-b border-[#F6D5DF] bg-gradient-to-b from-[#FFF9FB] to-white rounded-t-2xl`}
      >
        {typeof entry.didYouMean === 'string' &&
          typeof entry.word === 'string' &&
          entry.didYouMean.toLowerCase() !== entry.word.toLowerCase() && (
            <p className="mb-3 text-xs text-[#8E244D]">
              Spelling corrected from “{entry.didYouMean}” <span aria-hidden="true">·</span>{' '}
              Showing entry for <span className="font-semibold">{entry.word}</span>
            </p>
          )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1
                className={`font-serif font-semibold tracking-tight text-[#3B1D2A] ${
                  compact ? 'text-3xl' : 'text-4xl lg:text-5xl'
                }`}
                style={{ textWrap: 'balance' }}
              >
                {entry.word}
              </h1>
              {!compact && <RibbonBow className="h-5 w-8 text-[#DB5B8A]/80 shrink-0" />}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6E4757]">
              <span className="font-mono text-[#3B1D2A]">{entry.phonetic}</span>
              <span aria-hidden="true" className="text-[#E6B2C3]">
                ·
              </span>
              <span>{entry.syllables}</span>
              {entry.frequencyNote && (
                <>
                  <span aria-hidden="true" className="text-[#E6B2C3]">
                    ·
                  </span>
                  <span className="text-[#8B5E70]">{entry.frequencyNote}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSpeak}
              aria-label={`Pronounce ${entry.word}`}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                speaking
                  ? 'border-[#DB5B8A] bg-[#FDF2F6] text-[#BE3E6D]'
                  : 'border-[#F3CBD7] bg-white text-[#573142] hover:border-[#E7A8BC] hover:bg-[#FFF6F8]'
              }`}
            >
              <Volume2 className="h-4 w-4" />
              <span>{speaking ? 'Speaking' : 'Listen'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(entry)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                isSaved
                  ? 'border-[#DB5B8A] bg-[#DB5B8A] text-white hover:bg-[#BE3E6D]'
                  : 'border-[#F3CBD7] bg-white text-[#573142] hover:border-[#E7A8BC] hover:bg-[#FFF6F8]'
              }`}
            >
              {isSaved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>{isSaved ? 'Saved' : 'Save Word'}</span>
            </button>

            {onUseWordInDraft && (
              <button
                type="button"
                onClick={() => onUseWordInDraft(entry.word)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#F3CBD7] bg-[#FFF6F8] px-4 py-2 text-sm font-medium text-[#3B1D2A] transition-colors duration-150 hover:bg-[#FCE7F3] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Use in Draft</span>
                <ArrowUpRight className="h-4 w-4 text-[#BE3E6D]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Definitions by Sense */}
      <div className={`${compact ? 'p-6' : 'p-7 lg:p-10'} space-y-8 border-b border-[#F6D5DF]`}>
        <div className="space-y-6">
          {(Array.isArray(entry.senses) ? entry.senses : []).map((sense, index) => (
            <div
              key={`${sense.partOfSpeech}-${index}`}
              className={index > 0 ? 'pt-6 border-t border-[#FCE7F3]' : ''}
            >
              <div className="mb-2 flex items-center gap-2.5 text-sm">
                <span className="font-mono text-xs text-[#B68999] tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-serif italic font-medium text-[#BE3E6D]">
                  {sense.partOfSpeech}
                </span>
                {sense.register && (
                  <>
                    <span aria-hidden="true" className="text-[#E6B2C3]">
                      ·
                    </span>
                    <span className="text-xs text-[#8B5E70]">{sense.register}</span>
                  </>
                )}
              </div>

              <p className="max-w-prose text-base leading-relaxed text-[#3B1D2A]">
                {sense.definition}
              </p>

              {sense.example && (
                <p className="mt-2.5 max-w-prose font-serif italic text-[15px] leading-relaxed text-[#6E4757]">
                  “{sense.example}”
                </p>
              )}

              {sense.collocations && sense.collocations.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8B5E70]">
                  <span className="font-medium text-[#573142]">Common pairings:</span>
                  {sense.collocations.map((col, cIdx) => (
                    <span key={col}>
                      {col}
                      {cIdx < sense.collocations.length - 1 && (
                        <span aria-hidden="true" className="ml-2 text-[#E6B2C3]">
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nuanced Synonyms & Antonyms */}
      <div
        className={`${compact ? 'p-6' : 'p-7 lg:p-10'} grid gap-8 border-b border-[#F6D5DF] ${
          compact ? 'grid-cols-1' : 'lg:grid-cols-12'
        }`}
      >
        <div className={compact ? '' : 'lg:col-span-8'}>
          <h2 className="font-serif text-lg font-medium text-[#3B1D2A]">
            Nuanced Synonyms
          </h2>
          <p className="mt-1 text-sm text-[#6E4757]">
            Select any alternative to inspect its distinct shade of meaning.
          </p>

          <div className="mt-4 divide-y divide-[#FCE7F3] border-t border-[#FCE7F3]">
            {(Array.isArray(entry.synonyms) ? entry.synonyms : []).map((syn) => (
              <div
                key={syn.word}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <div className="flex items-baseline gap-3">
                  <button
                    type="button"
                    onClick={() => onLookupWord(syn.word)}
                    className="font-serif text-base font-medium text-[#BE3E6D] underline-offset-4 hover:underline cursor-pointer"
                  >
                    {syn.word}
                  </button>
                  <span className="text-xs text-[#A57B8B]">{syn.strength}</span>
                </div>
                <p className="text-sm text-[#6E4757] sm:text-right">{syn.nuance}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={compact ? '' : 'lg:col-span-4 lg:border-l lg:border-[#FCE7F3] lg:pl-8'}>
          {entry.antonyms && entry.antonyms.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold tracking-wide text-[#8B5E70]">
                Antonyms
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-2">
                {entry.antonyms.map((ant) => (
                  <button
                    key={ant}
                    type="button"
                    onClick={() => onLookupWord(ant)}
                    className="text-sm font-medium text-[#573142] underline decoration-[#E6B2C3] underline-offset-4 hover:text-[#BE3E6D] hover:decoration-[#BE3E6D] cursor-pointer"
                  >
                    {ant}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entry.relatedForms && entry.relatedForms.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-[#8B5E70]">
                Related Word Forms
              </h3>
              <dl className="mt-2.5 space-y-2">
                {entry.relatedForms.map((rel) => (
                  <div
                    key={`${rel.word}-${rel.partOfSpeech}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <dt>
                      <button
                        type="button"
                        onClick={() => onLookupWord(rel.word)}
                        className="font-medium text-[#3B1D2A] hover:text-[#BE3E6D] hover:underline underline-offset-4 cursor-pointer"
                      >
                        {rel.word}
                      </button>
                    </dt>
                    <dd className="font-serif italic text-xs text-[#8B5E70]">
                      {rel.partOfSpeech}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Etymology & Editorial Usage Note */}
      <div
        className={`${compact ? 'p-6' : 'p-7 lg:p-10'} grid gap-6 bg-[#FFF9FB] rounded-b-2xl ${
          compact ? 'grid-cols-1' : 'md:grid-cols-2 md:gap-10'
        }`}
      >
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-[#8B5E70]">
            Origin &amp; Etymology
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#573142]">{entry.etymology}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-[#8B5E70]">
            Editorial Usage Note
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#573142]">{entry.usageNote}</p>
        </div>
      </div>
    </article>
  );
}
