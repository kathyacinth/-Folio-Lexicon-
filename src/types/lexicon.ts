export type AppSection = 'dictionary' | 'studio' | 'wordbook' | 'guide';

export type WritingRegister = 'Academic' | 'Editorial' | 'Business' | 'Narrative';

export type SpellingVariant = 'US' | 'UK';

export type IssueCategory = 'spelling' | 'grammar' | 'clarity' | 'vocabulary';

export interface DictionarySense {
  partOfSpeech: string;
  register: string;
  definition: string;
  example: string;
  collocations: string[];
}

export interface DictionarySynonym {
  word: string;
  nuance: string;
  strength: 'Mild' | 'Moderate' | 'Strong';
}

export interface DictionaryRelatedForm {
  word: string;
  partOfSpeech: string;
}

export interface DictionaryEntry {
  word: string;
  didYouMean?: string;
  phonetic: string;
  syllables: string;
  etymology: string;
  frequencyNote: string;
  senses: DictionarySense[];
  synonyms: DictionarySynonym[];
  antonyms: string[];
  relatedForms: DictionaryRelatedForm[];
  usageNote: string;
}

export interface IssueSuggestion {
  replacement: string;
  note: string;
}

export interface WritingIssue {
  id: string;
  category: IssueCategory;
  subType: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  suggestions: IssueSuggestion[];
}

export interface AnalysisResult {
  issues: WritingIssue[];
  summary: string;
  readabilityLabel: string;
  polishedPreview: string;
}

export interface WordAlternative {
  word: string;
  nuance: string;
  registerFit: string;
}

export interface WordSuggestionResult {
  targetWord: string;
  partOfSpeech: string;
  contextNote: string;
  alternatives: WordAlternative[];
}

export interface WordbookItem {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  addedAt: string;
}
