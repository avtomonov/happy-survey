export interface QuestionChoice {
  choiceId: string
  title: string
  mark: number
}

export interface SurveyQuestion {
  questionId: string
  title: string
  type: string
  queueCycle: number
  choices: QuestionChoice[]
}

export interface QuestionTypeConfig {
  id: string
  label: string
  questionSetId: string
}

export const COMMON_QUESTION_SET_ID = 'common'

export const QUESTION_TYPE_CONFIGS: QuestionTypeConfig[] = [
  { id: 'nps', label: 'NPS', questionSetId: COMMON_QUESTION_SET_ID },
  { id: 'csat', label: 'CSAT', questionSetId: COMMON_QUESTION_SET_ID },
  { id: 'ces', label: 'CES', questionSetId: COMMON_QUESTION_SET_ID },
  { id: 'our_products', label: 'Наши товары', questionSetId: COMMON_QUESTION_SET_ID },
  { id: 'product_quality', label: 'Оценка качества продукта', questionSetId: COMMON_QUESTION_SET_ID },
  { id: 'focus_group', label: 'Отбор для фокус-группы', questionSetId: COMMON_QUESTION_SET_ID },
  { id: 'software', label: 'Оценка программного обеспечения', questionSetId: COMMON_QUESTION_SET_ID },
  {
    id: 'school',
    label: 'Оценка деятельности школы глазами родителей',
    questionSetId: COMMON_QUESTION_SET_ID,
  },
  { id: 'courses', label: 'Оценка образовательных курсов', questionSetId: COMMON_QUESTION_SET_ID },
]

export const QUESTION_SETS: Record<string, SurveyQuestion[]> = {
  [COMMON_QUESTION_SET_ID]: [
    {
      questionId: '1f13ca86-5338-66ae-a877-0a00ac070060',
      type: '4img',
      queueCycle: 0,
      title: 'Успех работы над сложными задачами или проектами в компании зависит',
      choices: [
        { choiceId: '1f13ca86-5338-67e4-9634-0a00ac070060', title: 'От личных усилий ответственного', mark: 1 },
        { choiceId: '1f13ca86-5338-682a-becb-0a00ac070060', title: 'Иногда от командной работы', mark: 4 },
        { choiceId: '1f13ca86-5338-6870-a648-0a00ac070060', title: 'Чаще от командной работы', mark: 7 },
        { choiceId: '1f13ca86-5338-68a2-98e4-0a00ac070060', title: 'Всегда от усилий всей команды', mark: 10 },
      ],
    },
    {
      questionId: '1f13ca86-541b-64b8-907a-0a00ac070060',
      type: '4img',
      queueCycle: 1,
      title: 'Непосредственный руководитель ставит Вам чёткие цели и задачи?',
      choices: [
        { choiceId: '1f13ca86-541b-65ee-85c6-0a00ac070060', title: 'Часто задачи непонятны, не имеют конечного срока', mark: 1 },
        { choiceId: '1f13ca86-541b-663e-9e9a-0a00ac070060', title: 'Часто задачи непонятны, но имеют конечный срок', mark: 4 },
        { choiceId: '1f13ca86-541b-66de-9f3f-0a00ac070060', title: 'Задачи всегда понятны, но есть сомнения в сроке', mark: 7 },
        { choiceId: '1f13ca86-541b-6724-b04d-0a00ac070060', title: 'Задачи всегда понятны и имеют конечный срок', mark: 10 },
      ],
    },
    {
      questionId: '1f13ca86-54f8-6ed0-92c8-0a00ac070060',
      type: '4img',
      queueCycle: 2,
      title: 'Знаете ли Вы ключевые цели и план действий подразделения на ближайший год?',
      choices: [
        { choiceId: '1f13ca86-54f9-6132-ac21-0a00ac070060', title: 'Я не знаю', mark: 1 },
        { choiceId: '1f13ca86-54f9-6182-9617-0a00ac070060', title: 'План действий есть, но нет целей', mark: 4 },
        { choiceId: '1f13ca86-54f9-61be-af3b-0a00ac070060', title: 'Цели есть, но нет плана действий', mark: 7 },
        { choiceId: '1f13ca86-54f9-61fa-9452-0a00ac070060', title: 'Знаю цели и план действий', mark: 10 },
      ],
    },
    {
      questionId: '1f13ca86-55f4-6078-9e55-0a00ac070060',
      type: '4img',
      queueCycle: 3,
      title: 'Как часто Ваш непосредственный руководитель хвалит Вас за хорошо выполненную работу?',
      choices: [
        { choiceId: '1f13ca86-55f4-61ae-b2e5-0a00ac070060', title: 'Обычно только ругает', mark: 1 },
        { choiceId: '1f13ca86-55f4-61fe-9630-0a00ac070060', title: 'Редко', mark: 4 },
        { choiceId: '1f13ca86-55f4-623a-8669-0a00ac070060', title: 'Раз в месяц', mark: 7 },
        { choiceId: '1f13ca86-55f4-626c-ba54-0a00ac070060', title: 'Часто', mark: 10 },
      ],
    },
    {
      questionId: '1f13ca86-5806-6992-92ca-0a00ac070060',
      type: '5stars',
      queueCycle: 5,
      title: 'У Вас достаточно ресурсов, чтобы эффективно выполнять свою ежедневную работу?',
      choices: [
        { choiceId: '1f13ca86-5807-6c02-8ffe-0a00ac070060', title: '2', mark: 2 },
        { choiceId: '1f13ca86-5807-6ce8-839c-0a00ac070060', title: '4', mark: 4 },
        { choiceId: '1f13ca86-5807-6d4c-960d-0a00ac070060', title: '6', mark: 6 },
        { choiceId: '1f13ca86-5807-6da6-b6ee-0a00ac070060', title: '8', mark: 8 },
        { choiceId: '1f13ca86-5807-6dec-bfa2-0a00ac070060', title: '10', mark: 10 },
      ],
    },
    {
      questionId: '1f13ca86-6060-6cbe-90a1-0a00ac070060',
      type: '10slide',
      queueCycle: 16,
      title: 'Готовы ли Вы рекомендовать Вашу компанию друзьям в качестве потенциального места работы?',
      choices: [
        { choiceId: '1f13ca86-6060-6e12-bc9b-0a00ac070060', title: '0', mark: 0 },
        { choiceId: '1f13ca86-6060-6fb6-bf1f-0a00ac070060', title: '5', mark: 5 },
        { choiceId: '1f13ca86-6061-60ec-b9d8-0a00ac070060', title: '10', mark: 10 },
      ],
    },
  ],
}

export const getQuestionTypeConfig = (typeId: string): QuestionTypeConfig | null => {
  return QUESTION_TYPE_CONFIGS.find((item) => item.id === typeId) ?? null
}

export const getQuestionsByType = (typeId: string): SurveyQuestion[] => {
  const config = getQuestionTypeConfig(typeId)

  if (!config) {
    return []
  }

  return QUESTION_SETS[config.questionSetId] ?? []
}
