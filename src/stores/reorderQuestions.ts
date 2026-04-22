import type { SurveyQuestion } from '../data/questionSets'

export async function reorderQuestions(questions: SurveyQuestion[]) {
  // Присваиваем queueCycle по новому порядку
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (q.queueCycle !== i) {
      q.queueCycle = i
      // Можно добавить вызов API для обновления порядка, если потребуется
      // await authStore.setQuestionAttributes(q.questionId, { queueCycle: i }, {})
    }
  }
  // TODO: если есть API для массового обновления порядка — вызвать его здесь
}
