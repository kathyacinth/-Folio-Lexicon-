import { ArrowUpRight } from 'lucide-react';
import { SAMPLE_DRAFTS, USAGE_PITFALLS } from '../data/samples';
import type { SampleDraft } from '../data/samples';
import { RibbonBow } from './RibbonBow';

interface StyleGuideViewProps {
  onLoadSampleIntoStudio: (sample: SampleDraft) => void;
  onLookupWord: (word: string) => void;
}

const WEAK_TO_STRONG_TABLE = [
  {
    weak: 'very clear',
    alternatives: ['lucid', 'perspicuous', 'unambiguous'],
    note: 'Match formality to audience.',
  },
  {
    weak: 'make stronger',
    alternatives: ['bolster', 'reinforce', 'fortify'],
    note: 'Concrete verbs tighten argument structure.',
  },
  {
    weak: 'a lot of',
    alternatives: ['numerous', 'substantial', 'abundant'],
    note: 'Distinguish countable items from mass quantities.',
  },
  {
    weak: 'look closely at',
    alternatives: ['scrutinize', 'examine', 'interrogate'],
    note: 'Signals analytical rigor.',
  },
  {
    weak: 'very brief',
    alternatives: ['laconic', 'terse', 'succinct'],
    note: 'Laconic implies stylistic restraint; succinct implies clarity.',
  },
];

export function StyleGuideView({
  onLoadSampleIntoStudio,
  onLookupWord,
}: StyleGuideViewProps) {
  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 lg:px-10 lg:py-12">
      <div className="border-b border-[#F3CBD7] pb-8">
        <div className="flex items-center gap-2.5">
          <RibbonBow className="h-4 w-7 text-[#DB5B8A]" />
          <p className="text-xs font-medium tracking-wide text-[#8B5E70]">
            Editorial Craft &amp; Reference
          </p>
        </div>
        <h1
          className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#3B1D2A] sm:text-4xl"
          style={{ textWrap: 'balance' }}
        >
          Style Guide &amp; Practice Drafts
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E4757]">
          Load a draft directly into the Writing Studio to test real-time spelling checks, grammar
          corrections, and register-aware vocabulary elevation.
        </p>
      </div>

      {/* Practice Drafts */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl font-medium text-[#3B1D2A]">
          Editorial Practice Drafts
        </h2>
        <p className="mt-1 text-sm text-[#6E4757]">
          Each passage contains realistic spelling slips, grammar errors, and flat phrasing calibrated to a specific register.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {SAMPLE_DRAFTS.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-col justify-between rounded-2xl border border-[#F3CBD7] bg-white p-6 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-3 text-xs text-[#8B5E70]">
                  <span className="font-medium text-[#BE3E6D]">{draft.register} Register</span>
                  <span className="tabular-nums">
                    {draft.text.trim().split(/\s+/).length} words
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl font-medium text-[#3B1D2A]">
                  {draft.title}
                </h3>
                <p className="mt-1.5 text-sm text-[#6E4757]">{draft.description}</p>
                <p className="mt-4 line-clamp-3 border-t border-[#FCE7F3] pt-4 font-serif italic text-sm leading-relaxed text-[#8B5E70]">
                  “{draft.text}”
                </p>
              </div>

              <div className="mt-5 pt-2">
                <button
                  type="button"
                  onClick={() => onLoadSampleIntoStudio(draft)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#F3CBD7] bg-[#FFF6F8] px-5 py-2 text-sm font-medium text-[#3B1D2A] transition-colors hover:border-[#DB5B8A] hover:bg-[#DB5B8A] hover:text-white cursor-pointer"
                >
                  <span>Open in Writing Studio</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Weak-to-Strong Vocabulary Matrix */}
      <section className="mt-14 border-t border-[#F3CBD7] pt-10">
        <h2 className="font-serif text-2xl font-medium text-[#3B1D2A]">
          Replacing Flat Qualifiers
        </h2>
        <p className="mt-1 text-sm text-[#6E4757]">
          Click any replacement word to inspect its full dictionary entry and nuance.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#F3CBD7] bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#F3CBD7] bg-[#FFF9FB] text-xs font-semibold text-[#8B5E70]">
                <th className="px-6 py-3.5">Overused Phrase</th>
                <th className="px-6 py-3.5">Stronger Alternatives</th>
                <th className="px-6 py-3.5">Editorial Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FCE7F3]">
              {WEAK_TO_STRONG_TABLE.map((row) => (
                <tr key={row.weak} className="hover:bg-[#FFF6F8]/60">
                  <td className="px-6 py-4 font-medium text-[#9B7384] line-through decoration-[#E6B2C3]">
                    {row.weak}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {row.alternatives.map((alt, idx) => (
                        <span key={alt} className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onLookupWord(alt)}
                            className="font-serif text-base font-medium text-[#BE3E6D] hover:underline underline-offset-4 cursor-pointer"
                          >
                            {alt}
                          </button>
                          {idx < row.alternatives.length - 1 && (
                            <span aria-hidden="true" className="text-[#E6B2C3]">
                              ·
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#573142]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usage Pitfalls */}
      <section className="mt-14 border-t border-[#F3CBD7] pt-10">
        <h2 className="font-serif text-2xl font-medium text-[#3B1D2A]">
          Commonly Confused Pairs
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {USAGE_PITFALLS.map((pitfall) => (
            <div
              key={pitfall.pair}
              className="rounded-2xl border border-[#F3CBD7] bg-white p-6 shadow-xs"
            >
              <h3 className="font-serif text-lg font-medium text-[#3B1D2A]">
                {pitfall.pair}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#573142]">{pitfall.rule}</p>
              <div className="mt-4 space-y-1.5 border-t border-[#FCE7F3] pt-3 text-xs">
                <p className="text-emerald-800">
                  <span className="font-semibold">Preferred:</span> {pitfall.exampleCorrect}
                </p>
                <p className="text-red-800">
                  <span className="font-semibold">Avoid:</span> {pitfall.exampleIncorrect}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
