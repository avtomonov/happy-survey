import type { SurveyQuestion } from '../data/questionSets'

const INITIAL_SPACING = 1000

type SaveQueueCycleFn = (
  questionId: string,
  queueCycle: number,
  existingAttributes?: Record<string, unknown>,
  existingLocalizedAttributes?: Record<string, unknown>,
) => Promise<void>

/**
 * Вычисляет midpoint-значение queueCycle для элемента на позиции itemIndex.
 * Возвращает null, если соседи слишком близко (нужна полная перенумерация).
 */
export function computeMidpointQueueCycle(
  questions: SurveyQuestion[],
  itemIndex: number,
): number | null {
  const prev = itemIndex > 0 ? questions[itemIndex - 1].queueCycle : undefined
  const next = itemIndex + 1 < questions.length ? questions[itemIndex + 1].queueCycle : undefined

  if (prev === undefined && next === undefined) return INITIAL_SPACING
  if (prev === undefined) return (next as number) - INITIAL_SPACING
  if (next === undefined) return prev + INITIAL_SPACING

  if (next - prev < 1) return null // слишком близко — нужна перенумерация

  return (prev + next) / 2
}

/**
 * Перенумеровывает все вопросы с шагом INITIAL_SPACING (1000, 2000, …).
 * Вызывает saveQueueCycle для каждого изменённого вопроса.
 */
export async function renumberAllQueueCycles(
  questions: SurveyQuestion[],
  saveQueueCycle: SaveQueueCycleFn,
): Promise<void> {
  const promises: Promise<void>[] = []
  questions.forEach((q, i) => {
    const newQC = (i + 1) * INITIAL_SPACING
    q.queueCycle = newQC
    promises.push(saveQueueCycle(
      q.questionId,
      newQC,
      q.attributes as Record<string, unknown> | undefined,
      q.localizedAttributes as Record<string, unknown> | undefined,
    ))
  })
  await Promise.all(promises)
}

/**
 * После drag-and-drop: назначает midpoint-queueCycle перетащенному элементу (movedIndex).
 * Если между соседями нет места, перенумеровывает всё.
 */
export async function reorderQuestions(
  questions: SurveyQuestion[],
  movedIndex: number,
  saveQueueCycle: SaveQueueCycleFn,
): Promise<void> {
  const mid = computeMidpointQueueCycle(questions, movedIndex)
  if (mid !== null) {
    const moved = questions[movedIndex]
    moved.queueCycle = mid
    await saveQueueCycle(
      moved.questionId,
      mid,
      moved.attributes as Record<string, unknown> | undefined,
      moved.localizedAttributes as Record<string, unknown> | undefined,
    )
  } else {
    await renumberAllQueueCycles(questions, saveQueueCycle)
  }
}
