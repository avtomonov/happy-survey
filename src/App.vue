<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCounterStore } from './stores/counter'

const counterStore = useCounterStore()
const { count, doubled } = storeToRefs(counterStore)

const onIncrement = (): void => {
  counterStore.increment()
}

const onReset = (): void => {
  counterStore.reset()
}
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-blue-9">
      <q-toolbar>
        <q-toolbar-title>Happy Job Constructor</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="row items-center justify-center q-pa-md">
        <q-card class="q-pa-md" style="width: 100%; max-width: 560px;">
          <q-card-section>
            <div class="text-subtitle2 q-mt-sm">Типизированный state management готов к расширению</div>
          </q-card-section>

          <q-separator spaced />

          <q-card-section>
            <div class="text-body1">Счётчик: {{ count }}</div>
            <div class="text-body2 text-grey-7">Удвоенное значение: {{ doubled }}</div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn color="primary" label="Увеличить" @click="onIncrement" />
            <q-btn flat color="secondary" label="Сброс" @click="onReset" />
          </q-card-actions>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
