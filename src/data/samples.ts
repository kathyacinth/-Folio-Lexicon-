import type { WritingRegister } from '../types/lexicon';

export interface CuratedWordGroup {
  category: string;
  description: string;
  words: { word: string; gloss: string }[];
}

export const CURATED_LEXICON_GROUPS: CuratedWordGroup[] = [
  {
    category: 'Precision Verbs',
    description: 'Replace generic action verbs with exact, vivid alternatives.',
    words: [
      { word: 'elucidate', gloss: 'make clear by explaining' },
      { word: 'corroborate', gloss: 'confirm with evidence' },
      { word: 'mitigate', gloss: 'make less severe' },
      { word: 'galvanize', gloss: 'shock or excite into action' },
      { word: 'epitomize', gloss: 'be a perfect example of' },
    ],
  },
  {
    category: 'Nuanced Adjectives',
    description: 'Sharpen descriptions beyond vague qualifiers.',
    words: [
      { word: 'perspicuous', gloss: 'clearly expressed and lucid' },
      { word: 'trenchant', gloss: 'vigorous and incisive in style' },
      { word: 'ephemeral', gloss: 'lasting for a very short time' },
      { word: 'cogent', gloss: 'clear, logical, and convincing' },
      { word: 'laconic', gloss: 'using very few words' },
    ],
  },
  {
    category: 'Rhetorical & Analytical Nouns',
    description: 'Anchor arguments and critical commentary with exact concepts.',
    words: [
      { word: 'synthesis', gloss: 'combination into a coherent whole' },
      { word: 'nuance', gloss: 'a subtle distinction in meaning' },
      { word: 'paradigm', gloss: 'a typical model or pattern' },
      { word: 'cacophony', gloss: 'a harsh, discordant mixture' },
      { word: 'candor', gloss: 'open, honest expression' },
    ],
  },
];

export interface SampleDraft {
  id: string;
  title: string;
  register: WritingRegister;
  description: string;
  text: string;
}

export const SAMPLE_DRAFTS: SampleDraft[] = [
  {
    id: 'editorial-essay',
    title: 'The Architecture of Attention',
    register: 'Editorial',
    description: 'Contains spelling slips, subject-verb agreement errors, and flat modifiers ready for elevation.',
    text: 'In todays fast-paced digital world, a lot of people finds it definately hard to focus on deep reading. Many modern platforms is designed to recieve instant clicks instead of encouraging careful reflection about complex ideas. When we constantly switch between short updates, our ability to remember important details get weaker over time. Creating quiet spaces for long-form thought is a really good way to bring back mental clarity.',
  },
  {
    id: 'business-memo',
    title: 'Quarterly Product Briefing',
    register: 'Business',
    description: 'Misspellings, wordy corporate phrasing, and weak verbs suited for concise executive prose.',
    text: 'Due to the fact that our customer onboarding process currently takes a very long amount of time, several seperate accounts has been experiencing delays untill they can actually start using the platform. In order to fix this problem, the product team are going to make a big update to the setup checklist next month. We think this change will make retention numbers look much better.',
  },
  {
    id: 'academic-abstract',
    title: 'Urban Microclimate Study',
    register: 'Academic',
    description: 'Demonstrates spelling verification, register calibration, and analytical vocabulary refinement.',
    text: 'This paper looks at how street-level tree canopies helps lower afternoon heat in dense city neighborhoods. Data from twelve monitoring stations were collected over two summers and show a clear drop in surface tempratures. However, the results also suggests that uneven tree planting create big differences between wealthier and lower-income districts, which means city planners needs better investment strategies.',
  },
  {
    id: 'narrative-prose',
    title: 'Harbor at Dawn',
    register: 'Narrative',
    description: 'Spelling slips, flat sensory verbs, and repetitive modifiers primed for literary vocabulary suggestions.',
    text: 'The small fishing boat went slowly across the dark water as morning light occured behind the hills. Old wooden piers was still wet from the night rain, and a very loud bell rang from the harbor tower. Clara stood on the dock and looked at the mist, feeling very happy that she had finally came back to the coast.',
  },
];

export interface UsagePitfall {
  pair: string;
  rule: string;
  exampleCorrect: string;
  exampleIncorrect: string;
}

export const USAGE_PITFALLS: UsagePitfall[] = [
  {
    pair: 'Affect vs. Effect',
    rule: 'Affect is ordinarily a verb meaning to influence; effect is ordinarily a noun meaning a result (though effect as a verb means to bring about).',
    exampleCorrect: 'The revised policy will affect quarterly budgets and produce a lasting effect.',
    exampleIncorrect: 'The revised policy will effect quarterly budgets.',
  },
  {
    pair: 'Comprise vs. Compose',
    rule: 'The whole comprises the parts; the parts compose (or make up) the whole. Never write "comprised of".',
    exampleCorrect: 'The anthology comprises twelve essays from postwar critics.',
    exampleIncorrect: 'The anthology is comprised of twelve essays.',
  },
  {
    pair: 'Fewer vs. Less',
    rule: 'Use fewer for countable plural nouns; use less for uncountable mass quantities, time, or measurements.',
    exampleCorrect: 'The revised draft uses fewer adjectives and demands less patience.',
    exampleIncorrect: 'The revised draft uses less adjectives.',
  },
  {
    pair: 'Disinterested vs. Uninterested',
    rule: 'Disinterested means impartial and free from bias; uninterested means bored or lacking curiosity.',
    exampleCorrect: 'A disinterested judge listens carefully even when the topic is dry.',
    exampleIncorrect: 'The audience looked disinterested and checked their phones.',
  },
];
