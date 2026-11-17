import type { AssociatedKey, EtiologyKey, LanguageLevel, RatingKey, SpecifierKey, SeverityChoice } from "./types";

export interface Prompt {
  id: string;
  text: string;
}

export interface CriterionItem {
  id: RatingKey;
  code: string;
  title: string;
  lead: string;
  prompts: Prompt[];
}

export interface LevelOption {
  value: SeverityChoice;
  label: string;
  hint: string;
  text: string;
}

function prompts(prefix: string, lines: string[]): Prompt[] {
  return lines.map((text, index) => ({ id: `${prefix}-${index + 1}`, text }));
}

export const DOMAIN_A: CriterionItem[] = [
  {
    id: "a1",
    code: "A1",
    title: "Social-emotional reciprocity",
    lead: "Deficits in social-emotional reciprocity.",
    prompts: prompts("a1", [
      "Does not share or respond appropriately to other people's feelings",
      "Seems unaware of other people's feelings, or is unable to express their own",
      "Does not offer or seek comfort, or seeks comfort in an odd way",
      "Responds in a socially inappropriate way",
      "Does not spontaneously share enjoyment, achievements, or interests",
      "Difficulty with cooperative, give-and-take play or activity",
      "Difficulty starting or keeping a conversation going",
      "Limited back-and-forth conversation, especially about another person's topic",
      "Talks to make requests, rather than to be social or friendly",
    ]),
  },
  {
    id: "a2",
    code: "A2",
    title: "Nonverbal communication",
    lead: "Deficits in nonverbal communicative behaviors used for social interaction.",
    prompts: prompts("a2", [
      "Poor eye contact",
      "Does not use or respond to pointing to share attention",
      "Does not show or understand gestures, facial expression, or body language",
      "Does not use or understand tone of voice, such as sarcasm or warmth",
    ]),
  },
  {
    id: "a3",
    code: "A3",
    title: "Relationships",
    lead: "Deficits in developing, maintaining, and understanding relationships.",
    prompts: prompts("a3", [
      "Limited interest in peers",
      "Difficulty making or keeping friendships",
      "Rigid or atypical social interests and behavior",
      "Difficulty changing behavior to fit the social context",
      "Little or no pretend play",
      "Does not imitate other people's actions",
      "Overly literal: misses implied meaning, jokes, or puns",
    ]),
  },
];

export const DOMAIN_B: CriterionItem[] = [
  {
    id: "b1",
    code: "B1",
    title: "Stereotyped or repetitive behavior",
    lead: "Stereotyped or repetitive motor movements, use of objects, or speech.",
    prompts: prompts("b1", [
      "Repetitive motor mannerisms, such as flapping, clapping, or finger flicking",
      "Whole-body movements, such as rocking or swaying",
      "Repetitive use of objects, such as lining up, flipping, or spinning",
      "Stereotyped, repetitive, or idiosyncratic speech",
      "Odd phrases, words, or made-up words",
      "Repeats words, sentences, or scripts, immediately or later, in the same way",
      "Refers to themself in the third person",
      "Unusual tone, such as monotone, high-pitched, or robotic, or a pedantic style",
    ]),
  },
  {
    id: "b2",
    code: "B2",
    title: "Insistence on sameness",
    lead: "Insistence on sameness, inflexible routines, or ritualized patterns of verbal or nonverbal behavior.",
    prompts: prompts("b2", [
      "Strong need for sameness from day to day",
      "Unusually upset when a routine or the environment changes",
      "Verbal or nonverbal rituals, a fixed sequence that has to be completed",
      "Hard time changing their mind; rule-bound; difficulty with another point of view",
    ]),
  },
  {
    id: "b3",
    code: "B3",
    title: "Restricted interests",
    lead: "Highly restricted, fixated interests that are abnormal in intensity or focus.",
    prompts: prompts("b3", [
      "Very narrow range of interests",
      "An interest that is unusual in intensity, or odd in its focus",
      "Intense preoccupation with an ordinary interest",
      "Repeats the same activity, such as watching one movie again and again",
    ]),
  },
  {
    id: "b4",
    code: "B4",
    title: "Sensory reactivity",
    lead: "Hyper- or hyporeactivity to sensory input, or unusual interest in sensory aspects of the environment.",
    prompts: prompts("b4", [
      "Unusual attachment to objects",
      "Uses an object for something other than its purpose, such as spinning the wheels of a toy car",
      "Hyper-focus on a minor detail, without the broader context",
      "Sensory dysregulation of touch, sound, smell, taste, pain, temperature, or movement",
      "Hypersensitive to ordinary stimuli",
      "Hyposensitive to ordinary stimuli",
      "Extreme response to a stimulus other people treat as neutral or pleasant",
      "Unusual sensory interest, such as smelling or touching objects, or watching lights or movement",
    ]),
  },
];

export const CRITERION_C: CriterionItem = {
  id: "c",
  code: "C",
  title: "Early developmental period",
  lead: "Symptoms were present in the early developmental period. They may have been fully noticed only when social demands exceeded capacity, or they may have been masked later by learned strategies.",
  prompts: prompts("c", [
    "Differences were apparent in toddlerhood or early childhood",
    "Features became clear when social demands increased",
    "Features were later masked by learned strategies",
    "A caregiver describes early social or communication differences",
  ]),
};

export const ALL_CRITERIA: CriterionItem[] = [...DOMAIN_A, ...DOMAIN_B, CRITERION_C];

const promptIndex = new Map<string, { code: string; text: string }>();
for (const item of ALL_CRITERIA) {
  for (const prompt of item.prompts) promptIndex.set(prompt.id, { code: item.code, text: prompt.text });
}

export function lookupPrompt(id: string): { code: string; text: string } | undefined {
  return promptIndex.get(id);
}

export const SPECIFIERS: { id: SpecifierKey; title: string; text: string }[] = [
  {
    id: "intellectual",
    title: "Intellectual disability",
    text: "Associated with intellectual disability. IQ below 70, confirmed or strongly supported.",
  },
  {
    id: "language",
    title: "Language impairment",
    text: "Associated with a structural language impairment, beyond the social use of language.",
  },
  {
    id: "etiology",
    title: "Known medical, genetic, or environmental condition",
    text: "Associated with a known medical condition, genetic condition, or environmental factor.",
  },
  {
    id: "other",
    title: "Another neurodevelopmental, mental, or behavioral disorder",
    text: "Associated with another neurodevelopmental, mental, or behavioral condition.",
  },
  {
    id: "catatonia",
    title: "Catatonia",
    text: "Associated with catatonia during the course of the disorder.",
  },
];

export const ASSOCIATED: { id: AssociatedKey; title: string; text: string }[] = [
  { id: "motor", title: "Motor coordination", text: "Fine or gross motor coordination impairment." },
  { id: "novelty", title: "Novelty aversion", text: "Novelty-aversive behavior, including a limited diet." },
  { id: "injury", title: "Self-injury", text: "Self-injurious behavior." },
  { id: "regression", title: "Regression", text: "Loss of social or language skills that had been acquired." },
];

export const LANGUAGE_LEVEL_OPTIONS: { id: LanguageLevel; label: string }[] = [
  { id: "no-language", label: "No language" },
  { id: "single-words", label: "Single words" },
  { id: "phrase", label: "Phrase speech" },
];

export const ETIOLOGY_OPTIONS: { id: EtiologyKey; label: string }[] = [
  { id: "medical", label: "Medical condition" },
  { id: "genetic", label: "Genetic condition" },
  { id: "environmental", label: "Environmental factor" },
];

export const GENDERS = [
  { value: "", label: "Not recorded" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "another", label: "Another" },
] as const;

export function genderLabel(value: string): string {
  return GENDERS.find((item) => item.value === value)?.label ?? (value.trim() || "Not recorded");
}

export function languageLabel(value: LanguageLevel | null): string {
  return LANGUAGE_LEVEL_OPTIONS.find((item) => item.id === value)?.label ?? "";
}

const SOCIAL_SUPPORT = [
  {
    value: "1" as const,
    label: "Level 1",
    hint: "Requiring support",
    text: "Without support, social-communication deficits are noticeable. Initiating is hard, and responses to other people are atypical or unsuccessful.",
  },
  {
    value: "2" as const,
    label: "Level 2",
    hint: "Requiring substantial support",
    text: "Marked deficits in verbal and nonverbal social communication. Limited initiation, and reduced or atypical responses, even with support in place.",
  },
  {
    value: "3" as const,
    label: "Level 3",
    hint: "Requiring very substantial support",
    text: "Severe deficits. Very limited initiation of social interaction and minimal response to social overtures.",
  },
];

const RRB_SUPPORT = [
  {
    value: "1" as const,
    label: "Level 1",
    hint: "Requiring support",
    text: "Inflexibility interferes with functioning in at least one context. Switching activities is hard. Organization and planning limit independence.",
  },
  {
    value: "2" as const,
    label: "Level 2",
    hint: "Requiring substantial support",
    text: "Restricted or repetitive behavior is obvious to a casual observer and interferes across contexts. Changing focus brings distress.",
  },
  {
    value: "3" as const,
    label: "Level 3",
    hint: "Requiring very substantial support",
    text: "Extreme difficulty with change. Restricted or repetitive behavior markedly interferes with functioning in all spheres.",
  },
];

function withNone(levels: LevelOption[]): LevelOption[] {
  return [
    {
      value: "unsure",
      label: "Unsure",
      hint: "Not enough information",
      text: "Leave the level open when the record does not support a rating yet.",
    },
    {
      value: "0",
      label: "No significant impairment",
      hint: "Does not limit functioning",
      text: "Any features do not currently limit social, school, work, or other important functioning.",
    },
    ...levels,
  ];
}

export const SOCIAL_LEVELS: LevelOption[] = withNone(SOCIAL_SUPPORT);
export const RRB_LEVELS: LevelOption[] = withNone(RRB_SUPPORT);

export const ITEM_LABELS: Record<string, string> = {
  a1: "A1 Social-emotional reciprocity",
  a2: "A2 Nonverbal communication",
  a3: "A3 Relationships",
  b1: "B1 Stereotyped or repetitive behavior",
  b2: "B2 Insistence on sameness",
  b3: "B3 Restricted interests",
  b4: "B4 Sensory reactivity",
  c: "C Early developmental period",
  dSocial: "D Social-communication severity",
  dRrb: "D Restricted and repetitive severity",
};
