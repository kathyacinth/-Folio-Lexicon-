import type {
  AnalysisResult,
  DictionaryEntry,
  SpellingVariant,
  WordSuggestionResult,
  WritingRegister,
} from '../types/lexicon';

async function postJson<T>(url: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`Unexpected server response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${response.status})`);
  }
  return data as T;
}

export async function lookupDictionary(
  word: string,
  contextSentence?: string,
  signal?: AbortSignal
): Promise<DictionaryEntry> {
  const data = await postJson<DictionaryEntry>('/api/dictionary', { word, contextSentence }, signal);
  if (!data || typeof data.word !== 'string' || !Array.isArray(data.senses)) {
    throw new Error('Dictionary entry was unavailable. Please try again.');
  }
  return data;
}

export async function analyzeWriting(
  text: string,
  register: WritingRegister,
  spellingVariant: SpellingVariant = 'US',
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const data = await postJson<AnalysisResult>(
    '/api/analyze',
    { text, register, spellingVariant },
    signal
  );
  if (!data || !Array.isArray(data.issues)) {
    throw new Error('Writing analysis returned an invalid response. Please try again.');
  }
  return data;
}

export async function suggestWordInContext(
  word: string,
  sentence: string,
  register: WritingRegister,
  signal?: AbortSignal
): Promise<WordSuggestionResult> {
  const data = await postJson<WordSuggestionResult>(
    '/api/suggest-word',
    { word, sentence, register },
    signal
  );
  if (!data || !Array.isArray(data.alternatives)) {
    throw new Error('Vocabulary suggestions were unavailable. Please try again.');
  }
  return data;
}
