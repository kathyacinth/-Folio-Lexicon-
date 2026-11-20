import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  Feather,
  Loader2,
  RefreshCw,
  RotateCcw,
  SpellCheck,
  X,
} from 'lucide-react';
import type {
  AnalysisResult,
  IssueCategory,
  SpellingVariant,
  WordSuggestionResult,
  WritingIssue,
  WritingRegister,
} from '../types/lexicon';
import { analyzeWriting, suggestWordInContext } from '../lib/api';
import { SAMPLE_DRAFTS, type SampleDraft } from '../data/samples';
import { RibbonBow } from './RibbonBow';

interface WritingStudioViewProps {
  text: string;
  register: WritingRegister;
  spellingVariant: SpellingVariant;
  onChangeText: (nextText: string) => void;
  onChangeRegister: (nextRegister: WritingRegister) => void;
  onChangeSpellingVariant: (nextVariant: SpellingVariant) => void;
  onOpenDictionaryWord: (
    word: string,
    contextSentence?: string,
    replaceTarget?: { start: number; end: number }
  ) => void;
}

interface CursorWordTarget {
  word: string;
  sentence: string;
  start: number;
  end: number;
}

const REGISTERS: WritingRegister[] = ['Academic', 'Editorial', 'Business', 'Narrative'];
const SPELLING_VARIANTS: SpellingVariant[] = ['US', 'UK'];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'from', 'that',
  'this', 'they', 'with', 'will', 'would', 'there', 'their', 'what', 'when',
  'where', 'which', 'while', 'about', 'into', 'than', 'then', 'them', 'these',
  'those', 'some', 'such', 'only', 'also', 'more', 'most', 'very',
]);

function extractWordAndSentenceAtCursor(
  text: string,
  selStart: number,
  selEnd: number
): CursorWordTarget | null {
  if (!text.trim()) return null;

  let start = selStart;
  let end = selEnd;

  if (selStart === selEnd) {
    const isWordChar = (ch: string) => /[A-Za-z'-]/.test(ch);
    let left = selStart;
    while (left > 0 && isWordChar(text[left - 1])) {
      left -= 1;
    }
    let right = selStart;
    while (right < text.length && isWordChar(text[right])) {
      right += 1;
    }
    start = left;
    end = right;
  }

  const rawSelected = text.slice(start, end).trim();
  const cleanWord = rawSelected.replace(/^['"-]+|['"-]+$/g, '');
  if (!cleanWord || cleanWord.length < 3 || cleanWord.length > 45) return null;
  if (!/[A-Za-z]/.test(cleanWord)) return null;
  if (selStart === selEnd && STOPWORDS.has(cleanWord.toLowerCase())) return null;

  const offsetInRaw = rawSelected.indexOf(cleanWord);
  const leadingWs = text.slice(start, end).search(/\S/);
  const exactStart = start + (leadingWs > 0 ? leadingWs : 0) + (offsetInRaw > 0 ? offsetInRaw : 0);
  const exactEnd = exactStart + cleanWord.length;

  let sentStart = exactStart;
  while (sentStart > 0 && !/[.!?\n]/.test(text[sentStart - 1])) {
    sentStart -= 1;
  }
  let sentEnd = exactEnd;
  while (sentEnd < text.length && !/[.!?\n]/.test(text[sentEnd])) {
    sentEnd += 1;
  }
  const sentence = text.slice(sentStart, Math.min(text.length, sentEnd + 1)).trim();

  return {
    word: text.slice(exactStart, exactEnd),
    sentence,
    start: exactStart,
    end: exactEnd,
  };
}

function getCategoryMeta(category: IssueCategory): {
  label: string;
  underlineClass: string;
  badgeTextClass: string;
  icon: ReactNode;
} {
  switch (category) {
    case 'spelling':
      return {
        label: 'Spelling',
        underlineClass: 'underline-spelling bg-[#FCE7F3] hover:bg-[#FBCFE8]/70',
        badgeTextClass: 'text-[#9D174D]',
        icon: <SpellCheck className="h-3.5 w-3.5 text-[#9D174D]" />,
      };
    case 'grammar':
      return {
        label: 'Grammar',
        underlineClass: 'underline-grammar bg-red-50/80 hover:bg-red-100/70',
        badgeTextClass: 'text-[#C81E4B]',
        icon: <AlertCircle className="h-3.5 w-3.5 text-[#C81E4B]" />,
      };
    case 'clarity':
      return {
        label: 'Clarity',
        underlineClass: 'underline-clarity bg-amber-50/80 hover:bg-amber-100/70',
        badgeTextClass: 'text-[#B45309]',
        icon: <AlertTriangle className="h-3.5 w-3.5 text-[#B45309]" />,
      };
    case 'vocabulary':
      return {
        label: 'Vocabulary',
        underlineClass: 'underline-vocabulary bg-emerald-50/80 hover:bg-emerald-100/70',
        badgeTextClass: 'text-[#047857]',
        icon: <Feather className="h-3.5 w-3.5 text-[#047857]" />,
      };
  }
}

export function WritingStudioView({
  text,
  register,
  spellingVariant,
  onChangeText,
  onChangeRegister,
  onChangeSpellingVariant,
  onOpenDictionaryWord,
}: WritingStudioViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [paneMode, setPaneMode] = useState<'compose' | 'polished'>('compose');
  const [liveCheckEnabled, setLiveCheckEnabled] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | IssueCategory>('all');

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const [cursorTarget, setCursorTarget] = useState<CursorWordTarget | null>(null);
  const [wordSuggestion, setWordSuggestion] = useState<WordSuggestionResult | null>(null);
  const [suggestingWord, setSuggestingWord] = useState(false);
  const [wordSuggestError, setWordSuggestError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [showSamplePicker, setShowSamplePicker] = useState(false);

  const analyzeAbortRef = useRef<AbortController | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed
      ? trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
      : 0;
    const chars = text.length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    return { words, sentences, chars, minutes };
  }, [text]);

  const runAnalysis = async (
    draftText: string,
    targetRegister: WritingRegister,
    variant: SpellingVariant
  ) => {
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    if (!draftText.trim()) {
      setAnalysis({
        issues: [],
        summary: 'Write or paste prose above, or load a sample draft to check spelling, grammar, and vocabulary.',
        readabilityLabel: 'Ready',
        polishedPreview: '',
      });
      setAnalyzing(false);
      setAnalysisError(null);
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeWriting(draftText, targetRegister, variant, controller.signal);
      if (!controller.signal.aborted) {
        setAnalysis(result);
        setSelectedIssueId((prev) =>
          prev && result.issues.some((i) => i.id === prev) ? prev : null
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setAnalysisError(err instanceof Error ? err.message : 'Unable to analyze writing.');
    } finally {
      if (!controller.signal.aborted) {
        setAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    if (!liveCheckEnabled) return;
    if (!text.trim()) {
      setAnalysis(null);
      setAnalysisError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalysis(text, register, spellingVariant);
    }, 850);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, register, spellingVariant, liveCheckEnabled]);

  useEffect(() => {
    if (!cursorTarget || !cursorTarget.word) {
      return;
    }

    const timer = window.setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;

      setSuggestingWord(true);
      setWordSuggestError(null);
      try {
        const res = await suggestWordInContext(
          cursorTarget.word,
          cursorTarget.sentence,
          register,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setWordSuggestion(res);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setWordSuggestError(err instanceof Error ? err.message : 'Unable to suggest alternatives.');
      } finally {
        if (!controller.signal.aborted) {
          setSuggestingWord(false);
        }
      }
    }, 480);

    return () => window.clearTimeout(timer);
  }, [cursorTarget?.word, cursorTarget?.sentence, register]);

  const handleCursorUpdate = () => {
    const el = textareaRef.current;
    if (!el) return;
    const target = extractWordAndSentenceAtCursor(text, el.selectionStart, el.selectionEnd);
    setCursorTarget(target);
  };

  const handleApplySuggestion = (issue: WritingIssue, replacement: string) => {
    const before = text.slice(0, issue.startIndex);
    const after = text.slice(issue.endIndex);
    const nextText = before + replacement + after;
    const delta = replacement.length - (issue.endIndex - issue.startIndex);

    onChangeText(nextText);

    setAnalysis((prev) => {
      if (!prev) return prev;
      const updated = prev.issues
        .filter((item) => item.id !== issue.id)
        .map((item) =>
          item.startIndex >= issue.endIndex
            ? {
                ...item,
                startIndex: item.startIndex + delta,
                endIndex: item.endIndex + delta,
              }
            : item
        );
      return { ...prev, issues: updated };
    });

    if (selectedIssueId === issue.id) {
      setSelectedIssueId(null);
    }
  };

  const handleBatchFixByCategories = (categories: IssueCategory[]) => {
    if (!analysis) return;
    const targetSet = new Set(categories);
    const matchingIssues = analysis.issues
      .filter((i) => targetSet.has(i.category) && i.suggestions.length > 0)
      .sort((a, b) => b.startIndex - a.startIndex);

    if (matchingIssues.length === 0) return;

    let nextText = text;
    for (const issue of matchingIssues) {
      const replacement = issue.suggestions[0].replacement;
      nextText =
        nextText.slice(0, issue.startIndex) + replacement + nextText.slice(issue.endIndex);
    }
    onChangeText(nextText);
    setSelectedIssueId(null);
  };

  const handleDismissIssue = (issueId: string) => {
    setAnalysis((prev) =>
      prev ? { ...prev, issues: prev.issues.filter((i) => i.id !== issueId) } : prev
    );
    if (selectedIssueId === issueId) {
      setSelectedIssueId(null);
    }
  };

  const handleSwapCursorWord = (replacement: string) => {
    if (!cursorTarget) return;
    const { start, end, word } = cursorTarget;
    const formatted =
      word[0] &&
      word[0] === word[0].toUpperCase() &&
      word[0] !== word[0].toLowerCase() &&
      replacement[0]
        ? replacement[0].toUpperCase() + replacement.slice(1)
        : replacement;

    const nextText = text.slice(0, start) + formatted + text.slice(end);
    onChangeText(nextText);
    setCursorTarget({
      ...cursorTarget,
      word: formatted,
      end: start + formatted.length,
    });
  };

  const handleCopyText = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleLoadSample = (sample: SampleDraft) => {
    onChangeRegister(sample.register);
    onChangeText(sample.text);
    setShowSamplePicker(false);
    setPaneMode('compose');
    setCursorTarget(null);
    setWordSuggestion(null);
  };

  const issues = analysis?.issues ?? [];
  const counts = useMemo(() => {
    let spelling = 0;
    let grammar = 0;
    let clarity = 0;
    let vocabulary = 0;
    for (const issue of issues) {
      if (issue.category === 'spelling') spelling += 1;
      else if (issue.category === 'grammar') grammar += 1;
      else if (issue.category === 'clarity') clarity += 1;
      else vocabulary += 1;
    }
    return { all: issues.length, spelling, grammar, clarity, vocabulary };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (categoryFilter === 'all') return issues;
    return issues.filter((i) => i.category === categoryFilter);
  }, [issues, categoryFilter]);

  const activeIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  );

  const renderUnflaggedTextWithWordLookup = (segment: string, baseOffset: number) => {
    const tokens = segment.split(/([A-Za-z'-]+)/);
    let runningOffset = baseOffset;
    return tokens.map((token, idx) => {
      const tokenStart = runningOffset;
      runningOffset += token.length;
      if (/^[A-Za-z][A-Za-z'-]*$/.test(token) && token.length >= 2) {
        return (
          <button
            key={`${tokenStart}-${idx}`}
            type="button"
            onClick={() =>
              onOpenDictionaryWord(token, text.slice(Math.max(0, tokenStart - 60), tokenStart + 80), {
                start: tokenStart,
                end: tokenStart + token.length,
              })
            }
            title={`Look up "${token}" in Dictionary`}
            className="rounded px-0.5 -mx-0.5 transition-colors hover:bg-[#FCE7F3] hover:text-[#BE3E6D] cursor-pointer"
          >
            {token}
          </button>
        );
      }
      return <span key={`${tokenStart}-${idx}`}>{token}</span>;
    });
  };

  const renderAnnotatedProse = () => {
    if (!text.trim()) {
      return (
        <p className="text-sm italic text-[#A57B8B]">
          Your annotated proof will appear here as you write, highlighting spelling, grammar,
          clarity, and clickable dictionary words.
        </p>
      );
    }

    const sorted = [...issues].sort((a, b) => a.startIndex - b.startIndex);
    const nodes: ReactNode[] = [];
    let cursor = 0;

    for (const issue of sorted) {
      if (issue.startIndex < cursor || issue.endIndex > text.length) continue;
      if (issue.startIndex > cursor) {
        const plainSegment = text.slice(cursor, issue.startIndex);
        nodes.push(
          <span key={`plain-${cursor}`}>
            {renderUnflaggedTextWithWordLookup(plainSegment, cursor)}
          </span>
        );
      }

      const meta = getCategoryMeta(issue.category);
      const isSelected = selectedIssueId === issue.id;
      nodes.push(
        <button
          key={issue.id}
          type="button"
          onClick={() => setSelectedIssueId(isSelected ? null : issue.id)}
          className={`rounded px-0.5 transition-colors cursor-pointer ${meta.underlineClass} ${
            isSelected ? 'ring-2 ring-[#DB5B8A]/50' : ''
          }`}
        >
          {text.slice(issue.startIndex, issue.endIndex)}
        </button>
      );
      cursor = issue.endIndex;
    }

    if (cursor < text.length) {
      nodes.push(
        <span key={`plain-end-${cursor}`}>
          {renderUnflaggedTextWithWordLookup(text.slice(cursor), cursor)}
        </span>
      );
    }

    return <div className="whitespace-pre-wrap text-[15px] leading-[1.8] text-[#3B1D2A]">{nodes}</div>;
  };

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-8 lg:px-10">
      {/* Studio Workspace Toolbar */}
      <div className="mb-6 flex flex-col gap-4 border-b border-[#F3CBD7] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <RibbonBow className="h-4 w-7 text-[#DB5B8A]" />
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#3B1D2A]">
              Writing Studio
            </h1>
          </div>

          <div
            role="group"
            aria-label="Target writing register"
            className="flex flex-wrap items-center gap-1 rounded-full bg-[#FCE7F3]/80 p-1"
          >
            {REGISTERS.map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => onChangeRegister(reg)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  register === reg
                    ? 'bg-white text-[#3B1D2A] shadow-xs'
                    : 'text-[#6E4757] hover:text-[#3B1D2A]'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Spelling standard"
            className="flex items-center gap-1 rounded-full bg-[#FCE7F3]/80 p-1"
          >
            {SPELLING_VARIANTS.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => onChangeSpellingVariant(variant)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  spellingVariant === variant
                    ? 'bg-white text-[#9D174D] shadow-xs'
                    : 'text-[#6E4757] hover:text-[#3B1D2A]'
                }`}
              >
                {variant} Spelling
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSamplePicker((prev) => !prev)}
              className="min-h-[40px] rounded-full border border-[#F3CBD7] bg-white px-4 py-2 text-xs font-medium text-[#573142] transition-colors hover:bg-[#FFF9FB] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Load Sample Draft
            </button>

            {showSamplePicker && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-[#F3CBD7] bg-white p-2 shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[#8B5E70]">
                  <span>Select an editorial sample</span>
                  <button
                    type="button"
                    onClick={() => setShowSamplePicker(false)}
                    aria-label="Close sample list"
                    className="text-[#9B7384] hover:text-[#3B1D2A] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-[#FCE7F3]">
                  {SAMPLE_DRAFTS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="block w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#FFF6F8] cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif text-sm font-medium text-[#3B1D2A]">
                          {sample.title}
                        </span>
                        <span className="text-[11px] font-medium text-[#BE3E6D]">
                          {sample.register}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-[#6E4757]">
                        {sample.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setLiveCheckEnabled((v) => !v)}
            className={`min-h-[40px] rounded-full border px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              liveCheckEnabled
                ? 'border-[#F3CBD7] bg-white text-[#3B1D2A] hover:bg-[#FFF9FB]'
                : 'border-[#F3CBD7] bg-[#FCE7F3]/60 text-[#8B5E70]'
            }`}
          >
            {liveCheckEnabled ? 'Live Check: On' : 'Live Check: Paused'}
          </button>

          <button
            type="button"
            onClick={() => void runAnalysis(text, register, spellingVariant)}
            disabled={analyzing || !text.trim()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#DB5B8A] px-4 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#BE3E6D] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {analyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>{analyzing ? 'Checking…' : 'Check Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyText()}
            disabled={!text}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#F3CBD7] bg-white px-4 py-2 text-xs font-medium text-[#573142] transition-colors hover:bg-[#FFF9FB] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {text && (
            <button
              type="button"
              onClick={() => {
                onChangeText('');
                setAnalysis(null);
                setCursorTarget(null);
                setWordSuggestion(null);
                setSelectedIssueId(null);
              }}
              aria-label="Clear draft"
              className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-[#F3CBD7] bg-white px-3.5 py-2 text-xs font-medium text-[#8B5E70] transition-colors hover:bg-[#FFF9FB] hover:text-[#3B1D2A] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Editorial Canvas */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Manuscript Editor & Interactive Proof */}
        <section className="lg:col-span-7 rounded-2xl border border-[#F3CBD7] bg-white shadow-xs">
          {/* Sheet Subheader */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F6D5DF] bg-[#FFF9FB] rounded-t-2xl px-6 py-3.5">
            <div className="flex items-center gap-1 rounded-full bg-[#FCE7F3]/80 p-1">
              <button
                type="button"
                onClick={() => setPaneMode('compose')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paneMode === 'compose'
                    ? 'bg-white text-[#3B1D2A] shadow-xs'
                    : 'text-[#6E4757] hover:text-[#3B1D2A]'
                }`}
              >
                Compose &amp; Proof
              </button>
              <button
                type="button"
                onClick={() => setPaneMode('polished')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paneMode === 'polished'
                    ? 'bg-white text-[#3B1D2A] shadow-xs'
                    : 'text-[#6E4757] hover:text-[#3B1D2A]'
                }`}
              >
                Polished Preview
              </button>
            </div>

            {cursorTarget ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#8B5E70]">
                  Selected:{' '}
                  <span className="font-serif italic font-medium text-[#3B1D2A]">
                    “{cursorTarget.word}”
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onOpenDictionaryWord(cursorTarget.word, cursorTarget.sentence, {
                      start: cursorTarget.start,
                      end: cursorTarget.end,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-[#F3CBD7] bg-white px-3 py-1 font-medium text-[#BE3E6D] hover:bg-[#FFF6F8] whitespace-nowrap cursor-pointer"
                >
                  <BookOpen className="h-3 w-3" />
                  <span>Define</span>
                </button>
              </div>
            ) : (
              <span className="text-xs text-[#A57B8B]">
                Place cursor on any word for live synonyms
              </span>
            )}
          </div>

          {paneMode === 'compose' ? (
            <>
              {/* Editor Textarea */}
              <div className="p-6">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    onChangeText(e.target.value);
                  }}
                  onClick={handleCursorUpdate}
                  onKeyUp={handleCursorUpdate}
                  onSelect={handleCursorUpdate}
                  placeholder="Begin drafting your paragraph, essay, or letter here. Spelling, grammar corrections, and real-time vocabulary suggestions appear automatically as you write..."
                  aria-label="Manuscript editor"
                  rows={10}
                  className="w-full resize-y border-0 bg-transparent text-base leading-[1.75] text-[#3B1D2A] placeholder:text-[#B68999] focus:outline-none"
                />
              </div>

              {/* Interactive Annotated Proof */}
              <div className="border-t border-[#F6D5DF] bg-[#FFF9FB]/80 p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold tracking-wide text-[#8B5E70]">
                    Interactive Proof &amp; Clickable Lexicon
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6E4757]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="underline-spelling font-medium text-[#9D174D]">abc</span>
                      <span>Spelling</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="underline-grammar font-medium text-[#C81E4B]">abc</span>
                      <span>Grammar</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="underline-clarity font-medium text-[#B45309]">abc</span>
                      <span>Clarity</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="underline-vocabulary font-medium text-[#047857]">abc</span>
                      <span>Vocabulary</span>
                    </span>
                  </div>
                </div>

                {renderAnnotatedProse()}

                {/* Inline Quick-Fix Bar */}
                {activeIssue && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F3CBD7] bg-white p-3.5 text-xs shadow-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[#3B1D2A]">
                        {activeIssue.subType}:
                      </span>{' '}
                      <span className="text-[#6E4757]">{activeIssue.explanation}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {activeIssue.suggestions.slice(0, 3).map((sug) => (
                        <button
                          key={sug.replacement}
                          type="button"
                          onClick={() => handleApplySuggestion(activeIssue, sug.replacement)}
                          className="rounded-full bg-[#DB5B8A] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[#BE3E6D] whitespace-nowrap cursor-pointer"
                        >
                          {sug.replacement}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedIssueId(null)}
                        aria-label="Close inline fix"
                        className="rounded-full p-1 text-[#9B7384] hover:bg-[#FCE7F3] hover:text-[#3B1D2A] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Polished Preview Mode */
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg font-medium text-[#3B1D2A]">
                    Polished {register} Revision
                  </h2>
                  <p className="text-xs text-[#6E4757]">
                    Preview of your draft with spelling, grammar, and vocabulary refinements applied.
                  </p>
                </div>
                {analysis?.polishedPreview && analysis.polishedPreview !== text && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeText(analysis.polishedPreview);
                      setPaneMode('compose');
                    }}
                    className="min-h-[38px] rounded-full bg-[#DB5B8A] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#BE3E6D] whitespace-nowrap cursor-pointer"
                  >
                    Replace Draft with Polished Version
                  </button>
                )}
              </div>

              {analysis?.polishedPreview ? (
                <div className="rounded-xl border border-[#F3CBD7] bg-[#FFF9FB] p-5 whitespace-pre-wrap text-base leading-[1.8] text-[#3B1D2A]">
                  {analysis.polishedPreview}
                </div>
              ) : (
                <p className="py-8 text-sm text-[#6E4757]">
                  Write or analyze a draft first to generate a polished revision preview.
                </p>
              )}
            </div>
          )}

          {/* Manuscript Tabular Metrics Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F6D5DF] px-6 py-3 text-xs text-[#8B5E70]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
              <span>{stats.words} words</span>
              <span aria-hidden="true">·</span>
              <span>{stats.sentences} sentences</span>
              <span aria-hidden="true">·</span>
              <span>{stats.chars} chars</span>
              <span aria-hidden="true">·</span>
              <span>{stats.minutes} min read</span>
            </div>
            {analysis?.readabilityLabel && (
              <span className="font-medium text-[#573142]">{analysis.readabilityLabel}</span>
            )}
          </div>
        </section>

        {/* Right Column: Live Spelling, Grammar & Vocabulary Inspector Rail */}
        <aside className="lg:col-span-5 space-y-6">
          {analysisError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <div className="flex-1">
                <p className="font-medium">Check paused</p>
                <p className="mt-0.5 text-xs text-red-800">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Live Cursor Vocabulary Companion */}
          {(cursorTarget || wordSuggestion || suggestingWord) && (
            <div className="rounded-2xl border border-[#F3CBD7] bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3 border-b border-[#FCE7F3] pb-3.5">
                <div>
                  <p className="text-xs font-medium text-[#047857]">
                    Real-Time Vocabulary Companion
                  </p>
                  <h2 className="mt-0.5 font-serif text-lg font-medium text-[#3B1D2A]">
                    Alternatives for “{cursorTarget?.word || wordSuggestion?.targetWord}”
                  </h2>
                </div>
                {suggestingWord && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#DB5B8A] shrink-0" />
                )}
              </div>

              {wordSuggestError ? (
                <p className="mt-3 text-xs text-red-700">{wordSuggestError}</p>
              ) : wordSuggestion ? (
                <div className="mt-3.5">
                  <p className="text-xs leading-relaxed text-[#6E4757]">
                    <span className="font-serif italic text-[#BE3E6D]">
                      {wordSuggestion.partOfSpeech}
                    </span>{' '}
                    <span aria-hidden="true">·</span> {wordSuggestion.contextNote}
                  </p>

                  <div className="mt-3 divide-y divide-[#FCE7F3] border-t border-[#FCE7F3]">
                    {wordSuggestion.alternatives.map((alt) => (
                      <div
                        key={alt.word}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif text-base font-medium text-[#3B1D2A]">
                              {alt.word}
                            </span>
                            <span className="text-[11px] text-[#9B7384]">{alt.registerFit}</span>
                          </div>
                          <p className="text-xs text-[#6E4757]">{alt.nuance}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenDictionaryWord(
                                alt.word,
                                cursorTarget?.sentence,
                                cursorTarget
                                  ? {
                                      start: cursorTarget.start,
                                      end: cursorTarget.end,
                                    }
                                  : undefined
                              )
                            }
                            className="rounded-full border border-[#F3CBD7] px-3 py-1 text-xs font-medium text-[#573142] hover:bg-[#FFF6F8] hover:text-[#3B1D2A] cursor-pointer"
                          >
                            Define
                          </button>
                          {cursorTarget && (
                            <button
                              type="button"
                              onClick={() => handleSwapCursorWord(alt.word)}
                              className="rounded-full bg-[#047857] px-3 py-1 text-xs font-medium text-white hover:bg-[#065F46] cursor-pointer"
                            >
                              Swap
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#8B5E70]">
                  Finding register-matched synonyms…
                </p>
              )}
            </div>
          )}

          {/* Editorial Summary & Batch Fixes */}
          <div className="rounded-2xl border border-[#F3CBD7] bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-medium text-[#3B1D2A]">
                Editorial Review
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {counts.spelling > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBatchFixByCategories(['spelling'])}
                    className="rounded-full border border-[#F3CBD7] bg-[#FFF6F8] px-3 py-1.5 text-xs font-medium text-[#9D174D] transition-colors hover:border-[#9D174D] hover:bg-[#9D174D] hover:text-white whitespace-nowrap cursor-pointer"
                  >
                    Fix Spelling ({counts.spelling})
                  </button>
                )}
                {counts.grammar > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBatchFixByCategories(['grammar'])}
                    className="rounded-full border border-[#F3CBD7] bg-[#FFF6F8] px-3 py-1.5 text-xs font-medium text-[#3B1D2A] transition-colors hover:border-[#DB5B8A] hover:bg-[#DB5B8A] hover:text-white whitespace-nowrap cursor-pointer"
                  >
                    Fix Grammar ({counts.grammar})
                  </button>
                )}
              </div>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-[#6E4757]">
              {analysis?.summary ||
                'Start writing or load a sample draft to receive real-time spelling checks, grammar corrections, and vocabulary suggestions.'}
            </p>

            {/* Filter Tabs */}
            <div
              role="tablist"
              aria-label="Filter writing suggestions"
              className="mt-4 flex flex-wrap items-center gap-1 rounded-2xl bg-[#FCE7F3]/75 p-1"
            >
              {(
                [
                  { id: 'all', label: `All (${counts.all})` },
                  { id: 'spelling', label: `Spelling (${counts.spelling})` },
                  { id: 'grammar', label: `Grammar (${counts.grammar})` },
                  { id: 'clarity', label: `Clarity (${counts.clarity})` },
                  { id: 'vocabulary', label: `Vocabulary (${counts.vocabulary})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    categoryFilter === tab.id
                      ? 'bg-white text-[#3B1D2A] shadow-xs'
                      : 'text-[#6E4757] hover:text-[#3B1D2A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Issue & Vocabulary Refinement List */}
          {analyzing && issues.length === 0 ? (
            <div aria-busy="true" className="space-y-3">
              {[1, 2, 3].map((k) => (
                <div key={k} className="rounded-2xl border border-[#F3CBD7] bg-white p-5">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-[#FCE7F3]" />
                  <div className="mt-3 h-4 w-full animate-pulse rounded bg-[#FFF0F5]" />
                  <div className="mt-3 h-8 w-28 animate-pulse rounded bg-[#FFF0F5]" />
                </div>
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="rounded-2xl border border-[#F3CBD7] bg-white p-6 text-center shadow-xs">
              <p className="font-serif text-base font-medium text-[#3B1D2A]">
                {text.trim() ? 'No issues in this view' : 'Ready for your draft'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#6E4757]">
                {text.trim()
                  ? 'Click any word in the Interactive Proof to inspect its dictionary entry or place your cursor in the editor for live synonym ideas.'
                  : 'Type in the manuscript pane or choose Load Sample Draft to see real-time spelling, grammar, and vocabulary refinements.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => {
                const meta = getCategoryMeta(issue.category);
                const isSelected = selectedIssueId === issue.id;
                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`rounded-2xl border bg-white p-5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#DB5B8A] ring-2 ring-[#DB5B8A]/15'
                        : 'border-[#F3CBD7] hover:border-[#E7A8BC]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {meta.icon}
                        <span className={meta.badgeTextClass}>{meta.label}</span>
                        <span aria-hidden="true" className="text-[#E6B2C3]">
                          ·
                        </span>
                        <span className="font-medium text-[#6E4757]">{issue.subType}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissIssue(issue.id);
                        }}
                        aria-label="Dismiss suggestion"
                        className="rounded-full p-1 text-[#9B7384] hover:bg-[#FCE7F3] hover:text-[#3B1D2A] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2.5 text-sm">
                      <span className="rounded-md bg-[#FFF0F5] px-2 py-0.5 text-[#6E4757] line-through decoration-[#DB5B8A]">
                        {issue.originalText}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#573142]">
                      {issue.explanation}
                    </p>

                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {issue.suggestions.map((sug) => (
                        <div key={sug.replacement} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySuggestion(issue, sug.replacement);
                            }}
                            title={sug.note}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[#F3CBD7] bg-[#FFF6F8] px-3.5 py-1.5 text-xs font-medium text-[#3B1D2A] transition-colors hover:border-[#DB5B8A] hover:bg-[#DB5B8A] hover:text-white cursor-pointer"
                          >
                            <span>{sug.replacement}</span>
                          </button>
                          {(issue.category === 'vocabulary' || issue.category === 'spelling') &&
                            !/\s/.test(sug.replacement.trim()) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDictionaryWord(sug.replacement, undefined, {
                                    start: issue.startIndex,
                                    end: issue.endIndex,
                                  });
                                }}
                                aria-label={`Define ${sug.replacement}`}
                                className="rounded-full p-1.5 text-[#9B7384] hover:bg-[#FCE7F3] hover:text-[#BE3E6D] cursor-pointer"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                              </button>
                            )}
                        </div>
                      ))}
                    </div>

                    {issue.suggestions[0]?.note && (
                      <p className="mt-2.5 text-[11px] text-[#8B5E70]">
                        {issue.suggestions[0].note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
