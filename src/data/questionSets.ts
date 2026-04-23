export interface QuestionChoice {
  choiceId: string
  title: string
  mark: number
  filterId?: string
  attributes?: Record<string, any>
}

export interface SubQuestion {
  subQuestionId: string
  title: string
  attributes?: Record<string, any>
}

export interface SurveyQuestion {
  questionId: string
  title: string
  type: string
  queueCycle: number
  choices: QuestionChoice[]
  subQuestions?: SubQuestion[]
  attributes?: Record<string, any>
  localizedAttributes?: Record<string, any>
}

export interface SurveyQuestionTypeConfig {
  type: string
  typeName: string
  hasChoices: boolean
  hasSubQuestions: boolean
}

export const SURVEY_QUESTION_TYPES: SurveyQuestionTypeConfig[] = [
  { type: '2imgh',       typeName: '2 картинки горизонтально',        hasChoices: true,  hasSubQuestions: false },
  { type: '2imgv',       typeName: '2 картинки вертикально',          hasChoices: true,  hasSubQuestions: false },
  { type: '4img',        typeName: '4 картинки',                      hasChoices: true,  hasSubQuestions: false },
  { type: '4buttons',    typeName: '4 кнопки',                        hasChoices: true,  hasSubQuestions: false },
  { type: '5stars',      typeName: 'Пять звёзд',                      hasChoices: true,  hasSubQuestions: false },
  { type: '10slide',     typeName: 'Числовой слайдер',                hasChoices: true,  hasSubQuestions: false },
  { type: 'sliderImages',typeName: 'Шаговой слайдер с картинками',    hasChoices: true,  hasSubQuestions: false },
  { type: 'drivers',     typeName: 'Драйверы',                        hasChoices: true,  hasSubQuestions: false },
  { type: 'slider-range',typeName: 'Диапазон слайдера',               hasChoices: true,  hasSubQuestions: false },
  { type: 'text_entry',  typeName: 'Открытый вопрос',                 hasChoices: false, hasSubQuestions: false },
  { type: 'xoutofy',     typeName: 'X ответов из Y вариантов',        hasChoices: true,  hasSubQuestions: false },
  { type: 'complex',     typeName: 'Комплексный вопрос',              hasChoices: true,  hasSubQuestions: true  },
  { type: 'five-circles',typeName: 'Пять кружочков',                  hasChoices: true,  hasSubQuestions: false },
  { type: 'filters',     typeName: 'Фильтры',                         hasChoices: true,  hasSubQuestions: false },
]

export interface QuestionTypeConfig {
  id: string
  label: string
  templateCycleId: string
}

const DEFAULT_TEMPLATE_CYCLE_ID = import.meta.env.VITE_APP_TEMPLATE_CYCLE_ID as string | undefined ?? '1ef038f6-5631-61b6-a87c-0a00ac070060'

export const QUESTION_TYPE_CONFIGS: QuestionTypeConfig[] = [
  { id: 'engagement', label: 'Исследование вовлеченности', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'nps', label: 'NPS', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'csat', label: 'CSAT', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'ces', label: 'CES', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'our_products', label: 'Наши товары', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'product_quality', label: 'Оценка качества продукта', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'focus_group', label: 'Отбор для фокус-группы', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  { id: 'software', label: 'Оценка программного обеспечения', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
  {
    id: 'school',
    label: 'Оценка деятельности школы глазами родителей',
    templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID,
  },
  { id: 'courses', label: 'Оценка образовательных курсов', templateCycleId: DEFAULT_TEMPLATE_CYCLE_ID },
]

export const getQuestionTypeConfig = (typeId: string): QuestionTypeConfig | null => {
  return QUESTION_TYPE_CONFIGS.find((item) => item.id === typeId) ?? null
}

export const getTemplateCycleId = (typeId: string): string => {
  return getQuestionTypeConfig(typeId)?.templateCycleId ?? DEFAULT_TEMPLATE_CYCLE_ID
}
