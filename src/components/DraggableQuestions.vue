<template>
  <div>
    <draggable
      v-model="items"
      group="questions"
      item-key="questionId"
      @end="onDragEnd"
      :animation="180"
      ghost-class="question-drag-ghost"
      chosen-class="question-drag-chosen"
    >
      <template #item="{ element, index }">
        <slot name="item" :question="element" :index="index" />
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import type { SurveyQuestion } from '../data/questionSets'

const props = defineProps<{
  modelValue: SurveyQuestion[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SurveyQuestion[]): void
  (e: 'drag-end', value: SurveyQuestion[]): void
}>()

const items = computed({
  get: () => props.modelValue,
  set: (value: SurveyQuestion[]) => {
    emit('update:modelValue', value)
  },
})

function onDragEnd() {
  emit('drag-end', items.value)
}
</script>
