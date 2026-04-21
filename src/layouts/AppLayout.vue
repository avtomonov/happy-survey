<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const companyName = computed<string>(() => authStore.companyName)

const editDialog = ref(false)
const editName = ref('')
const isSaving = ref(false)
const saveError = ref('')

const openEdit = (): void => {
  editName.value = companyName.value
  saveError.value = ''
  editDialog.value = true
}

const closeEdit = (): void => {
  saveError.value = ''
  editDialog.value = false
}

const saveCompanyName = async (): Promise<void> => {
  const trimmed = editName.value.trim()
  if (!trimmed) return
  isSaving.value = true
  saveError.value = ''
  try {
    await authStore.renameClient(trimmed)
    editDialog.value = false
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Ошибка сохранения'
  } finally {
    isSaving.value = false
  }
}

const doLogout = (): void => {
  authStore.doLogout()
  void router.push('/login')
}
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-white text-dark">
      <q-toolbar>
        <q-toolbar-title v-if="companyName" class="row items-center q-mr-md">
          {{ companyName }}

          <q-btn
            flat
            round
            dense
            icon="edit"
            size="sm"
            class="q-ml-xs"
            title="Переименовать организацию"
            @click="openEdit"
          />
        </q-toolbar-title>
 
        <q-btn flat round icon="logout" title="Выйти" @click="doLogout" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>

    <q-dialog v-model="editDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">Название организации</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="editName"
            autofocus
            label="Название"
            outlined
            dense
            @keyup.enter="saveCompanyName"
          />
          <div v-if="saveError" class="text-negative text-caption q-mt-sm">{{ saveError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Отмена" :disable="isSaving" @click="closeEdit" />
          <q-btn
            unelevated
            color="primary"
            label="Сохранить"
            :loading="isSaving"
            :disable="!editName.trim()"
            @click="saveCompanyName"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>
