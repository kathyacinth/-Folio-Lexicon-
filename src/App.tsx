import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppSection,
  DictionaryEntry,
  SpellingVariant,
  WordbookItem,
  WritingRegister,
} from './types/lexicon';
import { lookupDictionary } from './lib/api';
import { SAMPLE_DRAFTS, type SampleDraft } from './data/samples';
import { TopNav } from './components/TopNav';
import { DictionaryView } from './components/DictionaryView';
import { WritingStudioView } from './components/WritingStudioView';
import { WordbookView } from './components/WordbookView';
import { StyleGuideView } from './components/StyleGuideView';
import { DictionaryDrawer } from './components/DictionaryDrawer';

const WORDBOOK_STORAGE_KEY = 'folio_lexicon_wordbook_v1';
const RECENT_WORDS_STORAGE_KEY = 'folio_lexicon_recent_v1';
const DRAFT_STORAGE_KEY = 'folio_lexicon_draft_v1';

function loadJsonFromStorage<T>(
  key: string,
  fallback: T,
  validate: (val: unknown) => val is T
): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const isStringArray = (val: unknown): val is string[] =>
  Array.isArray(val) && val.every((item) => typeof item === 'string');

const isString = (val: unknown): val is string => typeof val === 'string';

const isWordbookArray = (val: unknown): val is WordbookItem[] =>
  Array.isArray(val) &&
  val.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as WordbookItem).word === 'string'
  );

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('dictionary');

  // Dictionary State
  const [dictQuery, setDictQuery] = useState('perspicuous');
  const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const [recentWords, setRecentWords] = useState<string[]>(() =>
    loadJsonFromStorage<string[]>(
      RECENT_WORDS_STORAGE_KEY,
      ['perspicuous', 'corroborate', 'laconic'],
      isStringArray
    )
  );

  // Writing Studio State
  const [draftText, setDraftText] = useState<string>(() =>
    loadJsonFromStorage<string>(DRAFT_STORAGE_KEY, SAMPLE_DRAFTS[0].text, isString)
  );
  const [register, setRegister] = useState<WritingRegister>('Editorial');
  const [spellingVariant, setSpellingVariant] = useState<SpellingVariant>('US');

  // Wordbook State
  const [wordbook, setWordbook] = useState<WordbookItem[]>(() =>
    loadJsonFromStorage<WordbookItem[]>(WORDBOOK_STORAGE_KEY, [], isWordbookArray)
  );

  // Studio Quick Dictionary Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [drawerEntry, setDrawerEntry] = useState<DictionaryEntry | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerReplaceSpan, setDrawerReplaceSpan] = useState<{ start: number; end: number } | null>(
    null
  );

  const dictAbortRef = useRef<AbortController | null>(null);
  const drawerAbortRef = useRef<AbortController | null>(null);

  const savedWordSet = useMemo(
    () =>
      new Set(
        wordbook
          .map((item) => (typeof item?.word === 'string' ? item.word.toLowerCase() : ''))
          .filter(Boolean)
      ),
    [wordbook]
  );

  useEffect(() => {
    try {
      localStorage.setItem(WORDBOOK_STORAGE_KEY, JSON.stringify(wordbook));
    } catch {
      // Ignore storage quota issues
    }
  }, [wordbook]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_WORDS_STORAGE_KEY, JSON.stringify(recentWords));
    } catch {
      // Ignore
    }
  }, [recentWords]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftText));
    } catch {
      // Ignore
    }
  }, [draftText]);

  const recordRecentWord = (word: string) => {
    if (typeof word !== 'string') return;
    const clean = word.trim();
    if (!clean) return;
    const cleanLower = clean.toLowerCase();
    setRecentWords((prev) =>
      [clean, ...prev.filter((w) => typeof w === 'string' && w.toLowerCase() !== cleanLower)].slice(0, 8)
    );
  };

  const handleDictionaryLookup = async (word: string) => {
    const clean = word.trim();
    if (!clean) return;

    dictAbortRef.current?.abort();
    const controller = new AbortController();
    dictAbortRef.current = controller;

    setDictQuery(clean);
    setDictLoading(true);
    setDictError(null);

    try {
      const result = await lookupDictionary(clean, undefined, controller.signal);
      if (!controller.signal.aborted) {
        setDictEntry(result);
        recordRecentWord(result.word);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setDictError(err instanceof Error ? err.message : 'Unable to fetch definition.');
    } finally {
      if (!controller.signal.aborted) {
        setDictLoading(false);
      }
    }
  };

  useEffect(() => {
    void handleDictionaryLookup('perspicuous');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDrawerLookup = async (
    word: string,
    contextSentence?: string,
    replaceSpan?: { start: number; end: number }
  ) => {
    const clean = word.trim();
    if (!clean) return;

    drawerAbortRef.current?.abort();
    const controller = new AbortController();
    drawerAbortRef.current = controller;

    if (replaceSpan !== undefined) {
      setDrawerReplaceSpan(replaceSpan);
    }
    setDrawerQuery(clean);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError(null);

    try {
      const result = await lookupDictionary(clean, contextSentence, controller.signal);
      if (!controller.signal.aborted) {
        setDrawerEntry(result);
        recordRecentWord(result.word);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setDrawerError(err instanceof Error ? err.message : 'Unable to fetch definition.');
    } finally {
      if (!controller.signal.aborted) {
        setDrawerLoading(false);
      }
    }
  };

  const handleToggleSaveWord = (entry: DictionaryEntry) => {
    if (!entry || typeof entry.word !== 'string') return;
    const lower = entry.word.toLowerCase();
    setWordbook((prev) => {
      if (prev.some((item) => typeof item?.word === 'string' && item.word.toLowerCase() === lower)) {
        return prev.filter((item) => typeof item?.word === 'string' && item.word.toLowerCase() !== lower);
      }
      const primarySense = Array.isArray(entry.senses) ? entry.senses[0] : undefined;
      const newItem: WordbookItem = {
        word: entry.word,
        phonetic: entry.phonetic || '',
        partOfSpeech: primarySense?.partOfSpeech || 'word',
        definition: primarySense?.definition || '',
        addedAt: new Date().toISOString(),
      };
      return [newItem, ...prev];
    });
  };

  const handleRemoveWordbookItem = (word: string) => {
    const targetLower = typeof word === 'string' ? word.toLowerCase() : '';
    setWordbook((prev) =>
      prev.filter((item) => typeof item?.word === 'string' && item.word.toLowerCase() !== targetLower)
    );
  };

  const handleUseWordInDraft = (word: string) => {
    setDraftText((prev) => {
      const trimmedEnd = prev.trimEnd();
      if (!trimmedEnd) return word;
      const needsSpace = !/\s$/.test(prev);
      return `${prev}${needsSpace ? ' ' : ''}${word}`;
    });
    setDrawerOpen(false);
    setActiveSection('studio');
  };

  const handleReplaceDrawerSpanInDraft = (word: string) => {
    if (!drawerReplaceSpan) {
      handleUseWordInDraft(word);
      return;
    }
    const { start, end } = drawerReplaceSpan;
    const original = draftText.slice(start, end);
    const formatted =
      original[0] &&
      original[0] === original[0].toUpperCase() &&
      original[0] !== original[0].toLowerCase() &&
      word[0]
        ? word[0].toUpperCase() + word.slice(1)
        : word;

    setDraftText((prev) => prev.slice(0, start) + formatted + prev.slice(end));
    setDrawerOpen(false);
    setDrawerReplaceSpan(null);
  };

  const handleLoadSample = (sample: SampleDraft) => {
    setRegister(sample.register);
    setDraftText(sample.text);
    setActiveSection('studio');
  };

  const handleNewDraft = () => {
    setDraftText('');
    setActiveSection('studio');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF6F8] text-[#3B1D2A]">
      <TopNav
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onNewDraft={handleNewDraft}
      />

      <main className="flex-1">
        {activeSection === 'dictionary' && (
          <DictionaryView
            query={dictQuery}
            entry={dictEntry}
            loading={dictLoading}
            error={dictError}
            recentWords={recentWords}
            savedWords={savedWordSet}
            onSearch={(w) => void handleDictionaryLookup(w)}
            onToggleSave={handleToggleSaveWord}
            onUseWordInDraft={handleUseWordInDraft}
            onOpenStudio={() => setActiveSection('studio')}
          />
        )}

        {activeSection === 'studio' && (
          <WritingStudioView
            text={draftText}
            register={register}
            spellingVariant={spellingVariant}
            onChangeText={setDraftText}
            onChangeRegister={setRegister}
            onChangeSpellingVariant={setSpellingVariant}
            onOpenDictionaryWord={(word, sentence, span) =>
              void handleOpenDrawerLookup(word, sentence, span)
            }
          />
        )}

        {activeSection === 'wordbook' && (
          <WordbookView
            items={wordbook}
            onLookupWord={(word) => {
              setActiveSection('dictionary');
              void handleDictionaryLookup(word);
            }}
            onRemoveWord={handleRemoveWordbookItem}
            onInsertInStudio={handleUseWordInDraft}
            onExploreDictionary={() => setActiveSection('dictionary')}
          />
        )}

        {activeSection === 'guide' && (
          <StyleGuideView
            onLoadSampleIntoStudio={handleLoadSample}
            onLookupWord={(word) => {
              setActiveSection('dictionary');
              void handleDictionaryLookup(word);
            }}
          />
        )}
      </main>

      <DictionaryDrawer
        open={drawerOpen}
        query={drawerQuery}
        entry={drawerEntry}
        loading={drawerLoading}
        error={drawerError}
        savedWords={savedWordSet}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerReplaceSpan(null);
        }}
        onLookupWord={(word) => void handleOpenDrawerLookup(word)}
        onToggleSave={handleToggleSaveWord}
        onReplaceWithWord={handleReplaceDrawerSpanInDraft}
      />

      <footer className="border-t border-[#F3CBD7] bg-[#FFF9FB]">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 py-5 text-xs text-[#8B5E70] lg:px-10">
          <span className="font-serif italic text-base font-medium text-[#3B1D2A]">
            Folio Lexicon
          </span>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveSection('dictionary')}
              className="hover:text-[#BE3E6D] cursor-pointer"
            >
              Dictionary
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('studio')}
              className="hover:text-[#BE3E6D] cursor-pointer"
            >
              Writing Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('wordbook')}
              className="hover:text-[#BE3E6D] cursor-pointer"
            >
              Wordbook
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('guide')}
              className="hover:text-[#BE3E6D] cursor-pointer"
            >
              Style Guide
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
