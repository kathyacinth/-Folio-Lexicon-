import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractReadableError(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return String(parsed.error.message);
    }
  } catch {
    // Not JSON, use raw
  }
  return raw || fallback;
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isTransientError(err)) {
        const delayMs = 600 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function handleApiError(res: Response, err: unknown, fallbackMessage: string) {
  const rawMessage = err instanceof Error ? err.message : fallbackMessage;
  console.error('[Folio Lexicon API Error]', rawMessage);

  let status = 500;
  let userMessage = extractReadableError(rawMessage, fallbackMessage);

  if (rawMessage.includes('GEMINI_API_KEY is not configured')) {
    status = 503;
  } else if (rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')) {
    status = 403;
    userMessage = 'API access denied. Please verify your Gemini API key in Settings > Secrets.';
  } else if (rawMessage.includes('400') || rawMessage.includes('API_KEY_INVALID')) {
    status = 400;
    userMessage = 'Invalid Gemini API key or request. Please check Settings > Secrets.';
  } else if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    status = 429;
    userMessage = 'Rate limit reached. Please pause briefly before checking again.';
  } else if (rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE')) {
    status = 503;
    userMessage = 'The service is experiencing temporary high demand. Please retry in a moment.';
  }

  res.status(status).json({ error: userMessage });
}

// Simple bounded in-memory cache for dictionary lookups
const dictionaryCache = new Map<string, unknown>();
const MAX_CACHE_ENTRIES = 120;

function setDictionaryCache(key: string, value: unknown) {
  if (dictionaryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = dictionaryCache.keys().next().value;
    if (firstKey !== undefined) {
      dictionaryCache.delete(firstKey);
    }
  }
  dictionaryCache.set(key, value);
}

interface RawGeminiIssue {
  category: 'spelling' | 'grammar' | 'clarity' | 'vocabulary';
  subType: string;
  originalText: string;
  occurrence?: number;
  explanation: string;
  suggestions: { replacement: string; note: string }[];
}

interface ResolvedIssue {
  id: string;
  category: 'spelling' | 'grammar' | 'clarity' | 'vocabulary';
  subType: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  suggestions: { replacement: string; note: string }[];
}

function findNthOccurrence(
  haystack: string,
  needle: string,
  occurrence: number,
  occupied: Array<[number, number]>
): number {
  if (!needle) return -1;

  const isOverlapping = (start: number, end: number) =>
    occupied.some(([s, e]) => start < e && end > s);

  // First pass: exact match respecting occurrence count
  let count = 0;
  let fromIndex = 0;
  while (fromIndex <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, fromIndex);
    if (idx === -1) break;
    count += 1;
    if (count >= occurrence && !isOverlapping(idx, idx + needle.length)) {
      return idx;
    }
    fromIndex = idx + 1;
  }

  // Second pass: first non-overlapping exact match
  fromIndex = 0;
  while (fromIndex <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, fromIndex);
    if (idx === -1) break;
    if (!isOverlapping(idx, idx + needle.length)) {
      return idx;
    }
    fromIndex = idx + 1;
  }

  // Third pass: case-insensitive fallback
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  fromIndex = 0;
  while (fromIndex <= lowerHaystack.length - lowerNeedle.length) {
    const idx = lowerHaystack.indexOf(lowerNeedle, fromIndex);
    if (idx === -1) break;
    if (!isOverlapping(idx, idx + needle.length)) {
      return idx;
    }
    fromIndex = idx + 1;
  }

  return -1;
}

function resolveIssueSpans(text: string, rawIssues: RawGeminiIssue[]): ResolvedIssue[] {
  const occupied: Array<[number, number]> = [];
  const resolved: ResolvedIssue[] = [];

  for (let i = 0; i < rawIssues.length; i += 1) {
    const item = rawIssues[i];
    if (!item || !item.originalText || !item.suggestions || item.suggestions.length === 0) {
      continue;
    }

    const occurrence = typeof item.occurrence === 'number' && item.occurrence > 0 ? item.occurrence : 1;
    const startIndex = findNthOccurrence(text, item.originalText, occurrence, occupied);
    if (startIndex === -1) continue;

    const endIndex = startIndex + item.originalText.length;
    const exactSlice = text.slice(startIndex, endIndex);

    // Skip no-op suggestions where replacement equals original text
    const validSuggestions = item.suggestions.filter(
      (s) => s.replacement && s.replacement.trim() !== exactSlice.trim()
    );
    if (validSuggestions.length === 0) continue;

    occupied.push([startIndex, endIndex]);
    resolved.push({
      id: `issue-${i}-${startIndex}-${endIndex}`,
      category: item.category,
      subType: item.subType,
      originalText: exactSlice,
      startIndex,
      endIndex,
      explanation: item.explanation,
      suggestions: validSuggestions.slice(0, 4),
    });
  }

  return resolved.sort((a, b) => a.startIndex - b.startIndex);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // 1. Authoritative Dictionary & Thesaurus Lookup
  app.post('/api/dictionary', async (req: Request, res: Response) => {
    try {
      const rawWord = typeof req.body?.word === 'string' ? req.body.word.trim() : '';
      const contextSentence =
        typeof req.body?.contextSentence === 'string' ? req.body.contextSentence.trim() : '';

      if (!rawWord || rawWord.length > 80) {
        res.status(400).json({ error: 'Please enter a valid word or short phrase (1–80 characters).' });
        return;
      }

      const cacheKey = `${rawWord.toLowerCase()}::${contextSentence.toLowerCase()}`;
      if (dictionaryCache.has(cacheKey)) {
        res.json(dictionaryCache.get(cacheKey));
        return;
      }

      const ai = getGeminiClient();
      const contextPrompt = contextSentence
        ? ` The user encountered this word in the sentence: "${contextSentence}". Highlight the most relevant sense first and tailor the usage note accordingly.`
        : '';

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
        contents: `Provide a thorough, authoritative Oxford/Merriam-grade dictionary and thesaurus entry for "${rawWord}".${contextPrompt} If the query has a minor spelling mistake, set didYouMean to the user's original query and provide the entry for the corrected headword.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an expert lexicographer and editor. Produce accurate IPA phonetics, clear syllable dots (e.g. "per·spic·u·ous"), crisp numbered definitions grouped by part of speech, authentic literary or practical example sentences, strong collocations, nuanced synonyms (explaining the exact shade of meaning each synonym carries), antonyms, related word forms, concise etymology, and a practical usage note.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              didYouMean: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              syllables: { type: Type.STRING },
              etymology: { type: Type.STRING },
              frequencyNote: { type: Type.STRING },
              senses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    partOfSpeech: { type: Type.STRING },
                    register: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    example: { type: Type.STRING },
                    collocations: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['partOfSpeech', 'register', 'definition', 'example', 'collocations'],
                },
              },
              synonyms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    nuance: { type: Type.STRING },
                    strength: { type: Type.STRING },
                  },
                  required: ['word', 'nuance', 'strength'],
                },
              },
              antonyms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              relatedForms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    partOfSpeech: { type: Type.STRING },
                  },
                  required: ['word', 'partOfSpeech'],
                },
              },
              usageNote: { type: Type.STRING },
            },
            required: [
              'word',
              'phonetic',
              'syllables',
              'etymology',
              'frequencyNote',
              'senses',
              'synonyms',
              'antonyms',
              'relatedForms',
              'usageNote',
            ],
          },
        },
      })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      const resolvedWord =
        typeof parsed.word === 'string' && parsed.word.trim() ? parsed.word.trim() : rawWord;
      const senses = Array.isArray(parsed.senses) ? parsed.senses : [];
      if (senses.length === 0) {
        throw new Error('Dictionary lookup returned an incomplete entry. Please try again.');
      }

      const normalizedEntry = {
        word: resolvedWord,
        didYouMean: typeof parsed.didYouMean === 'string' ? parsed.didYouMean : undefined,
        phonetic: typeof parsed.phonetic === 'string' ? parsed.phonetic : '',
        syllables: typeof parsed.syllables === 'string' ? parsed.syllables : resolvedWord,
        etymology: typeof parsed.etymology === 'string' ? parsed.etymology : '',
        frequencyNote: typeof parsed.frequencyNote === 'string' ? parsed.frequencyNote : '',
        senses,
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
        antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : [],
        relatedForms: Array.isArray(parsed.relatedForms) ? parsed.relatedForms : [],
        usageNote: typeof parsed.usageNote === 'string' ? parsed.usageNote : '',
      };

      setDictionaryCache(cacheKey, normalizedEntry);
      res.json(normalizedEntry);
    } catch (err) {
      handleApiError(res, err, 'Failed to look up dictionary entry.');
    }
  });

  // 2. Real-Time Spelling, Grammar, Clarity & Vocabulary Analysis
  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      const register = typeof req.body?.register === 'string' ? req.body.register : 'Editorial';
      const spellingVariant = req.body?.spellingVariant === 'UK' ? 'UK English' : 'US English';

      if (!text.trim()) {
        res.json({
          issues: [],
          summary: 'Start writing or load a sample draft to check spelling, grammar, clarity, and vocabulary.',
          readabilityLabel: 'Ready',
          polishedPreview: '',
        });
        return;
      }

      if (text.length > 8000) {
        res.status(400).json({ error: 'Draft exceeds 8,000 characters. Please check a shorter passage.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
        contents: `Analyze the following draft written for a "${register}" register using ${spellingVariant} spelling conventions. Identify and classify every issue into one of these 4 exact categories:
1. "spelling": misspelled words, typos, transposed letters, missing apostrophes in contractions/possessives like "todays", confused homophones ("their"/"there", "its"/"it's"), or ${spellingVariant} regional spelling mismatches (e.g. colour vs color). Use subType like "Misspelling", "Typo", "Homophone", or "Regional Spelling".
2. "grammar": subject-verb agreement errors, verb tense mistakes, wrong articles, pronoun errors, or punctuation/syntax mistakes.
3. "clarity": wordiness, redundant phrases, awkward syntax, or passive constructions that obscure meaning.
4. "vocabulary": weak, generic, repetitive, or imprecise words/phrases (such as "very good", "a lot of", "make sure", "went", "big", "things") and propose stronger, register-appropriate words with brief nuance notes.

CRITICAL RULES:
- For every issue, "originalText" MUST be an exact, character-for-character verbatim substring from the input text (preserve exact casing and punctuation of the matched span).
- If the same substring appears more than once in the text, set "occurrence" to the 1-based occurrence number being flagged.
- Each "replacement" must fit seamlessly when substituted directly in place of "originalText" (preserving proper capitalization and grammar in the surrounding sentence).
- Also provide a concise 1–2 sentence editorial summary, a short 2–3 word readabilityLabel (e.g. "Clear & Conversational", "Dense Academic"), and a "polishedPreview" rewriting the full passage smoothly with all spelling, grammar, and vocabulary upgrades applied while keeping the author's meaning.

TEXT TO ANALYZE:
"""
${text}
"""`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a meticulous senior copy editor and writing coach. Never invent errors that are not present in the text. Be thorough on real grammar mistakes and insightful on vocabulary upgrades.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              readabilityLabel: { type: Type.STRING },
              polishedPreview: { type: Type.STRING },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    subType: { type: Type.STRING },
                    originalText: { type: Type.STRING },
                    occurrence: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    suggestions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          replacement: { type: Type.STRING },
                          note: { type: Type.STRING },
                        },
                        required: ['replacement', 'note'],
                      },
                    },
                  },
                  required: ['category', 'subType', 'originalText', 'explanation', 'suggestions'],
                },
              },
            },
            required: ['summary', 'readabilityLabel', 'polishedPreview', 'issues'],
          },
        },
      })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        summary?: string;
        readabilityLabel?: string;
        polishedPreview?: string;
        issues?: RawGeminiIssue[];
      };

      const sanitizedIssues = (parsed.issues ?? []).map((issue) => ({
        ...issue,
        category:
          issue.category === 'spelling' ||
          issue.category === 'grammar' ||
          issue.category === 'clarity' ||
          issue.category === 'vocabulary'
            ? issue.category
            : 'clarity',
      }));

      const resolvedIssues = resolveIssueSpans(text, sanitizedIssues);

      res.json({
        issues: resolvedIssues,
        summary:
          parsed.summary ||
          (resolvedIssues.length === 0
            ? 'Clean prose with no grammatical errors detected.'
            : 'Review the flagged grammar and vocabulary refinements.'),
        readabilityLabel: parsed.readabilityLabel || `${register} Prose`,
        polishedPreview: parsed.polishedPreview || text,
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to analyze writing.');
    }
  });

  // 3. Real-Time Contextual Vocabulary Suggestions for Cursor/Selected Word
  app.post('/api/suggest-word', async (req: Request, res: Response) => {
    try {
      const word = typeof req.body?.word === 'string' ? req.body.word.trim() : '';
      const sentence = typeof req.body?.sentence === 'string' ? req.body.sentence.trim() : '';
      const register = typeof req.body?.register === 'string' ? req.body.register : 'Editorial';

      if (!word || word.length > 60) {
        res.status(400).json({ error: 'Select a valid word to view contextual suggestions.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
        contents: `The writer is considering the word/phrase "${word}" inside this sentence (intended register: ${register}):
"${sentence || word}"

Provide 4 to 5 context-aware vocabulary replacements that fit grammatically in that exact slot (matching tense, pluralization, and part of speech, and preserving leading capitalization if needed). Explain the nuance and register fit of each choice.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a precision thesaurus and editorial advisor. Every suggested word must substitute cleanly into the given sentence without breaking syntax.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetWord: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              contextNote: { type: Type.STRING },
              alternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    nuance: { type: Type.STRING },
                    registerFit: { type: Type.STRING },
                  },
                  required: ['word', 'nuance', 'registerFit'],
                },
              },
            },
            required: ['targetWord', 'partOfSpeech', 'contextNote', 'alternatives'],
          },
        },
      })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      handleApiError(res, err, 'Failed to fetch vocabulary suggestions.');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Folio Lexicon server listening on http://localhost:${PORT}`);
  });
}

startServer();
