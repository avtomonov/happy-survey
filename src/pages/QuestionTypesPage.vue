<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'

const router = useRouter()

interface QuestionType {
  id: string
  label: string
}

interface Category {
  id: string
  title: string
  types: QuestionType[]
}

const categories: Category[] = [
  {
    id: 'marketing',
    title: 'Маркетинг, периодические и пульс (мес, неделя, день) для клиентов',
    types: [
      { id: 'nps', label: 'NPS' },
      { id: 'csat', label: 'CSAT' },
      { id: 'ces', label: 'CES' },
      { id: 'our_products', label: 'Наши товары' },
      { id: 'product_quality', label: 'Оценка качества продукта' },
      { id: 'focus_group', label: 'Отбор для фокус-группы' },
      { id: 'software', label: 'Оценка программного обеспечения' },
    ],
  },
  {
    id: 'education',
    title: 'Образование',
    types: [
      { id: 'school', label: 'Оценка деятельности школы глазами родителей' },
      { id: 'courses', label: 'Оценка образовательных курсов' },
    ],
  },
]

const selectedType = ref<string | null>(null)

const selectType = (typeId: string): void => {
  selectedType.value = typeId
}

const proceed = (): void => {
  if (!selectedType.value) return
  router.push({ name: 'home' })
}
</script>

<template>
  <AppLayout>
    <q-page class="column items-center q-pa-lg">
      <div class="text-h5 text-center q-mb-xl">Выберите тип вопросов</div>

      <div class="question-types-container full-width">
        <div v-for="category in categories" :key="category.id" class="q-mb-xl">
          <div class="text-subtitle1 text-weight-bold q-mb-md category-heading">
            {{ category.title }}
          </div>

          <div class="row q-gutter-md">
            <q-card
              v-for="type in category.types"
              :key="type.id"
              clickable
              v-ripple
              class="type-card cursor-pointer col-auto"
              :class="{ 'type-card--selected': selectedType === type.id }"
              @click="selectType(type.id)"
            >
              <q-card-section class="column items-center justify-center q-pa-lg">
                <q-icon
                  :name="selectedType === type.id ? 'check_circle' : 'radio_button_unchecked'"
                  :color="selectedType === type.id ? 'primary' : 'grey-4'"
                  size="28px"
                  class="q-mb-sm"
                />
                <div class="text-uppercase text-weight-bold text-center type-card-label">
                  {{ type.label }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <q-btn
        color="primary"
        label="Продолжить"
        unelevated
        size="lg"
        class="q-mt-md full-width"
        style="max-width: 400px"
        :disable="!selectedType"
        @click="proceed"
      />
    </q-page>
  </AppLayout>
</template>

<style scoped>
.question-types-container {
  max-width: 760px;
  margin: 0 auto;
}

.category-heading {
  color: #555;
  border-left: 4px solid #1976d2;
  padding-left: 10px;
}

.type-card {
  width: 160px;
  min-height: 120px;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.type-card:hover {
  border-color: #90caf9;
  box-shadow: 0 2px 12px rgba(25, 118, 210, 0.15);
}

.type-card--selected {
  border-color: #1976d2;
  box-shadow: 0 2px 12px rgba(25, 118, 210, 0.25);
}

.type-card-label {
  font-size: 12px;
  line-height: 1.4;
}
</style>
