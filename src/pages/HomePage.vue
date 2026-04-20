<script setup lang="ts">
import AppLayout from '../layouts/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <q-page class="row items-center justify-center q-pa-md">
      <q-card class="q-pa-md" style="width: 100%; max-width: 420px;">
        <q-card-section>
          <div class="text-h6">Главная</div>
          <div class="text-subtitle2">Вы авторизованы</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn color="primary" label="Кнопка 1" />
          <q-btn flat color="secondary" label="Кнопка 2" />
        </q-card-actions>
      </q-card>
    </q-page>
  </AppLayout>
</template>
