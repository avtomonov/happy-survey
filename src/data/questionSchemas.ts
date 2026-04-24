export type FieldType = 'text' | 'number' | 'bool' | 'captions' | 'radio' | 'image' | 'filter'

export interface RadioVariant {
  text: string
  value: string | number | boolean
}

export interface FieldDef {
  type: FieldType
  caption: string
  defaultValue?: any
  variants?: RadioVariant[]
}

export interface QuestionSchema {
  type: string
  typeName: string
  hasChoices: boolean
  hasSubQuestions: boolean
  /** Override title shown above choices section */
  choicesTitle?: string
  /** Override title shown above subQuestions section */
  subQuestionsTitle?: string
  /** Question-level localizedAttributes fields */
  localizedAttributes?: Record<string, FieldDef>
  /** Question-level attributes fields */
  attributes?: Record<string, FieldDef>
  /** Direct fields on choice (title, mark, filterId) - used to know which to render */
  choiceSchemaFields?: Record<string, FieldDef>
  /** Fields in choice.attributes (localizedAttributes on API) */
  choiceAttributeFields?: Record<string, FieldDef>
  /** Direct fields on subQuestion (title etc.) */
  subQuestionSchemaFields?: Record<string, FieldDef>
  /** Fields in subQuestion.attributes */
  subQuestionAttributeFields?: Record<string, FieldDef>
}

// ─── Shared field definitions ───────────────────────────────────────────────

const INCLUDE_IN_DEPS: FieldDef = {
  type: 'bool',
  caption: 'Учитывается в отчётах "Вопросы" и "Сравнение Опроскин"',
  defaultValue: true,
}

const ALIAS_FIELD: FieldDef = {
  type: 'text',
  caption: 'Короткий текст (для отчёта, желательно не более 33 символов)',
  defaultValue: '',
}

const CAPTIONS_FIELD: FieldDef = {
  type: 'captions',
  caption: 'Заголовки (слева и справа)',
  defaultValue: ['', ''],
}

const IMAGE_URL_FIELD: FieldDef = { type: 'image', caption: 'Изображение', defaultValue: '' }

const CHOICE_FONT_SIZE: FieldDef = {
  type: 'number',
  caption: 'Размер текста ответа (в % от размера по умолчанию)',
  defaultValue: 100,
}

const CHOICE_IMAGE: FieldDef = { type: 'image', caption: 'Изображение ', defaultValue: '' }

const CHOICE_FIELDS_TITLE_MARK: Record<string, FieldDef> = {
  title: { type: 'text', caption: 'Текст ответа', defaultValue: '' },
  mark: { type: 'number', caption: 'Балл', defaultValue: 0 },
}

// ─── Schema map ─────────────────────────────────────────────────────────────

export const QUESTION_SCHEMAS: Record<string, QuestionSchema> = {
  '2imgh': {
    type: '2imgh',
    typeName: '2 картинки горизонтально',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: { alias: ALIAS_FIELD },
    attributes: { includeInDepsReports: INCLUDE_IN_DEPS },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      image: CHOICE_IMAGE,
    },
  },
  '2imgv': {
    type: '2imgv',
    typeName: '2 картинки вертикально',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: { alias: ALIAS_FIELD },
    attributes: { includeInDepsReports: INCLUDE_IN_DEPS },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      image: CHOICE_IMAGE,
    },
  },
  '4img': {
    type: '4img',
    typeName: '4 картинки',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: { alias: ALIAS_FIELD },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      vertical: { type: 'bool', caption: 'Вертикальное отображение блоков', defaultValue: false },
    },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      image: CHOICE_IMAGE,
      choiceFontSize: CHOICE_FONT_SIZE,
    },
  },
  '4buttons': {
    type: '4buttons',
    typeName: '4 кнопки',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: {
      alias: ALIAS_FIELD,
      image: IMAGE_URL_FIELD,
    },
    attributes: { includeInDepsReports: INCLUDE_IN_DEPS },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: { choiceFontSize: CHOICE_FONT_SIZE },
  },
  '5stars': {
    type: '5stars',
    typeName: 'Пять звёзд',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: {
      captions: CAPTIONS_FIELD,
      image: IMAGE_URL_FIELD,
      alias: ALIAS_FIELD,
    },
    attributes: { includeInDepsReports: INCLUDE_IN_DEPS },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
  },
  '10slide': {
    type: '10slide',
    typeName: 'Числовой слайдер',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: {
      alias: ALIAS_FIELD,
      captions: CAPTIONS_FIELD,
      image: IMAGE_URL_FIELD,
    },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      defaultAnswerIndex: {
        type: 'number',
        caption: 'Значение, с которым слайдер открывается по умолчанию',
        defaultValue: 5,
      },
      sliderType: {
        type: 'radio',
        caption: 'Тип слайдера',
        defaultValue: 'default',
        variants: [
          { text: 'Обычный', value: 'default' },
          { text: 'С картинкой', value: 'withPicture' },
        ],
      },
      automoveDemo: {
        type: 'bool',
        caption: 'Демонстрация движения (сдвиг на середину, потом в начало)',
        defaultValue: true,
      },
      startNumber: { type: 'number', caption: 'Демонстрация: старт', defaultValue: 0 },
      moveToNumber: { type: 'number', caption: 'Демонстрация: движение до', defaultValue: 5 },
    },
    choiceSchemaFields: {
      mark: { type: 'number', caption: 'Балл', defaultValue: 0 },
    },
    choiceAttributeFields: {
      image: { type: 'image', caption: 'Изображение ', defaultValue: '' },
      visualIndex: {
        type: 'number',
        caption: 'Отображать цвет и лицо как на позиции',
        defaultValue: 0,
      },
    },
  },
  sliderImages: {
    type: 'sliderImages',
    typeName: 'Шаговой слайдер с картинками',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: {
      alias: ALIAS_FIELD,
      captions: CAPTIONS_FIELD,
      image: {
        type: 'image',
        caption: 'Изображение (если нет картинки варианта, URL)',
        defaultValue: '',
      },
    },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      defaultAnswerIndex: {
        type: 'number',
        caption: 'Значение по умолчанию ("-1" = середина)',
        defaultValue: -1,
      },
      requireInteraction: {
        type: 'bool',
        caption: 'Не пропускать без взаимодействия хоть с 1 вариантом',
        defaultValue: true,
      },
    },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      image: CHOICE_IMAGE,
    },
  },
  drivers: {
    type: 'drivers',
    typeName: 'Драйверы',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: { alias: ALIAS_FIELD },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      maxCountAnswers: {
        type: 'number',
        caption: 'Максимальное количество выбираемых блоков',
        defaultValue: 3,
      },
      minCountAnswers: {
        type: 'number',
        caption: 'Минимальное количество выбираемых блоков',
        defaultValue: 1,
      },
    },
    choiceSchemaFields: {
      title: { type: 'text', caption: 'Текст ответа', defaultValue: '' },
    },
    choiceAttributeFields: { choiceFontSize: CHOICE_FONT_SIZE },
  },
  'slider-range': {
    type: 'slider-range',
    typeName: 'Слайдер влево и вправо от центра',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: {
      alias: ALIAS_FIELD,
      captions: CAPTIONS_FIELD,
    },
    attributes: { includeInDepsReports: INCLUDE_IN_DEPS },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      image: CHOICE_IMAGE,
    },
  },
  text_entry: {
    type: 'text_entry',
    typeName: 'Открытый вопрос',
    hasChoices: false,
    hasSubQuestions: false,
    localizedAttributes: {
      placeholderText: {
        type: 'text',
        caption: 'Placeholder в поле для ввода (пустой = текст по умолчанию)',
        defaultValue: '',
      },
    },
    attributes: {
      canBeEmpty: { type: 'bool', caption: 'Разрешить пустой текст', defaultValue: false },
      withTags: { type: 'bool', caption: 'Темы включены', defaultValue: false },
      tagsRequired: { type: 'bool', caption: 'Темы обязательны', defaultValue: false },
      showAnonSwitch: {
        type: 'bool',
        caption: 'Переключатель анонимности',
        defaultValue: false,
      },
      showManagerSwitch: {
        type: 'bool',
        caption: 'Переключатель видимости руководителю',
        defaultValue: false,
      },
    },
  },
  xoutofy: {
    type: 'xoutofy',
    typeName: 'X ответов из Y вариантов',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: { alias: ALIAS_FIELD },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      maxCountAnswers: {
        type: 'number',
        caption: 'Максимальное количество выбираемых блоков',
        defaultValue: 3,
      },
      minCountAnswers: {
        type: 'number',
        caption: 'Минимальное количество выбираемых блоков',
        defaultValue: 1,
      },
    },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      cancelOtherOptions: {
        type: 'bool',
        caption: 'Если выбрать этот вариант, другие варианты будут недоступны',
        defaultValue: false,
      },
    },
  },
  complex: {
    type: 'complex',
    typeName: 'Комплексный вопрос',
    hasChoices: true,
    hasSubQuestions: true,
    choicesTitle: 'Оценки',
    subQuestionsTitle: 'Подвопросы',
    localizedAttributes: {
      alias: ALIAS_FIELD,
      captions: {
        type: 'captions',
        caption: 'Заголовок (перед блоками)',
        defaultValue: ['', ''],
      },
    },
    attributes: { includeInDepsReports: INCLUDE_IN_DEPS },
    choiceSchemaFields: {
      title: { type: 'text', caption: 'Текст', defaultValue: '' },
      mark: { type: 'number', caption: 'Балл', defaultValue: 0 },
    },
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      desc: { type: 'text', caption: 'Описание', defaultValue: '' },
      descFontSize: {
        type: 'number',
        caption: 'Размер текста описания (в % от размера по умолчанию)',
        defaultValue: 100,
      },
      color: { type: 'text', caption: 'Цветовой код (HEX, напр. #c9a079)', defaultValue: '' },
    },
    subQuestionSchemaFields: {
      title: { type: 'text', caption: 'Текст подвопроса', defaultValue: '' },
    },
    subQuestionAttributeFields: {
      subquestionFontSize: {
        type: 'number',
        caption: 'Размер текста подвопроса (в % от размера по умолчанию)',
        defaultValue: 100,
      },
      alias: { type: 'text', caption: 'Короткий текст (для отчёта)', defaultValue: '' },
      subQuestionSkipButtonText: {
        type: 'text',
        caption: 'Текст кнопки "Можно пропустить" (пусто = нельзя пропустить)',
        defaultValue: '',
      },
    },
  },
  'five-circles': {
    type: 'five-circles',
    typeName: 'Пять кружочков',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: {
      alias: ALIAS_FIELD,
      captions: CAPTIONS_FIELD,
      showImages: { type: 'bool', caption: 'Показывать картинки', defaultValue: false },
      image: IMAGE_URL_FIELD,
    },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      showCaptions: {
        type: 'bool',
        caption: 'Показывать заголовки слева и справа (вместо текста ответов)',
        defaultValue: false,
      },
      scaledMode: { type: 'bool', caption: 'Шкалированные ответы', defaultValue: false },
    },
    choiceSchemaFields: CHOICE_FIELDS_TITLE_MARK,
    choiceAttributeFields: {
      choiceFontSize: CHOICE_FONT_SIZE,
      image: CHOICE_IMAGE,
    },
  },
  filters: {
    type: 'filters',
    typeName: 'Вопрос-фильтр',
    hasChoices: true,
    hasSubQuestions: false,
    localizedAttributes: { alias: ALIAS_FIELD },
    attributes: {
      includeInDepsReports: INCLUDE_IN_DEPS,
      hideSearchbar: {
        type: 'bool',
        caption: 'Скрыть окно поиска',
        defaultValue: false,
      },
    },
    choiceSchemaFields: {
      title: { type: 'text', caption: 'Текст ответа', defaultValue: '' },
      filterId: { type: 'filter', caption: 'ID фильтра', defaultValue: '' },
    },
  },
}

/**
 * Returns a Record with default values for all fields in `fieldDefs`.
 * Arrays and objects are deep-cloned.
 */
export const getSchemaDefaults = (
  fieldDefs: Record<string, FieldDef> | undefined,
): Record<string, any> => {
  if (!fieldDefs) return {}
  return Object.fromEntries(
    Object.entries(fieldDefs).map(([key, def]) => {
      let val = def.defaultValue
      if (val === undefined) {
        if (def.type === 'bool') val = false
        else if (def.type === 'number') val = 0
        else if (def.type === 'captions') val = ['', '']
        else val = ''
      }
      const cloned = Array.isArray(val) ? [...val] : val
      return [key, cloned]
    }),
  )
}
