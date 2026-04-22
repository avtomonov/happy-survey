<template>
  <div class="schema-field">
    <!-- bool → toggle -->
    <q-toggle
      v-if="fieldDef.type === 'bool'"
      :model-value="modelValue ?? false"
      :label="fieldDef.caption"
      dense
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <!-- captions → two side-by-side text inputs -->
    <template v-else-if="fieldDef.type === 'captions'">
      <div class="text-caption text-grey-6 q-mb-xs">{{ fieldDef.caption }}</div>
      <div class="row q-gutter-sm">
        <q-input
          :model-value="captionLeft"
          dense
          outlined
          label="Слева"
          class="col"
          @update:model-value="emitCaption(0, $event)"
        />
        <q-input
          :model-value="captionRight"
          dense
          outlined
          label="Справа"
          class="col"
          @update:model-value="emitCaption(1, $event)"
        />
      </div>
    </template>

    <!-- radio → option-group -->
    <template v-else-if="fieldDef.type === 'radio'">
      <div class="text-caption text-grey-6 q-mb-xs">{{ fieldDef.caption }}</div>
      <q-option-group
        :model-value="modelValue"
        :options="radioOptions"
        inline
        dense
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </template>

    <!-- number → number input -->
    <q-input
      v-else-if="fieldDef.type === 'number'"
      :model-value="modelValue"
      dense
      outlined
      type="number"
      :label="fieldDef.caption"
      @update:model-value="$emit('update:modelValue', $event === '' || $event === null ? null : Number($event))"
    />

    <!-- image → file upload with preview -->
    <template v-else-if="fieldDef.type === 'image'">
      <div class="text-caption text-grey-6 q-mb-xs">{{ fieldDef.caption }}</div>

      <!-- Preview -->
      <div v-if="imagePreviewUrl" class="image-preview-wrapper q-mb-sm">
        <img v-if="imageKind === 'image'" :src="imagePreviewUrl" class="image-preview" alt="preview" />
        <video
          v-else
          :src="imagePreviewUrl"
          class="image-preview"
          controls
          playsinline
          preload="metadata"
        />
        <q-btn
          flat
          dense
          round
          size="xs"
          icon="close"
          color="negative"
          class="image-preview-remove"
          @click="$emit('update:modelValue', '')"
        />
      </div>

      <!-- URL text input + upload button -->
      <div class="row q-gutter-sm items-center">
        <q-input
          :model-value="imageRawValue"
          dense
          outlined
          label="URL картинки"
          class="col"
          @update:model-value="emitImageUrl($event)"
        />
        <q-btn
          flat
          dense
          round
          icon="upload"
          color="primary"
          size="sm"
          :loading="uploading"
          title="Загрузить файл"
          @click="triggerFileInput"
        />
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*,video/mp4"
          style="display: none"
          @change="handleFileChange"
        />
      </div>
      <div v-if="uploadError" class="text-negative text-caption q-mt-xs">{{ uploadError }}</div>
    </template>

    <!-- filter / text → text input -->
    <q-input
      v-else
      :model-value="modelValue ?? ''"
      dense
      outlined
      :label="fieldDef.caption"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FieldDef } from '../data/questionSchemas'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  fieldDef: FieldDef
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const authStore = useAuthStore()

// ── image field state ──
const uploading = ref(false)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

/** Extract plain URL from stored value (handles plain string or JSON `{url:'...'}` object) */
const resolveImageUrl = (val: any): string => {
  if (!val) return ''
  if (typeof val === 'object' && val?.url) return val.url
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (parsed?.url) return parsed.url
    } catch { /* plain string */ }
    return val
  }
  return ''
}

const imagePreviewUrl = computed(() => resolveImageUrl(props.modelValue))

const resolveImageKind = (val: any): 'image' | 'video' => {
  if (val && typeof val === 'object' && val?.type === 'video') return 'video'
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (parsed?.type === 'video') return 'video'
    } catch {
      return val.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
    }
  }
  return 'image'
}

const imageKind = computed(() => resolveImageKind(props.modelValue))
const imageRawValue = computed(() => resolveImageUrl(props.modelValue))

const emitImageUrl = (value: string | number | null): void => {
  const url = String(value ?? '')
  const trimmed = url.trim()
  if (!trimmed) {
    emit('update:modelValue', '')
    return
  }

  if (props.modelValue && typeof props.modelValue === 'object' && 'url' in props.modelValue) {
    emit('update:modelValue', { ...props.modelValue, url: trimmed })
    return
  }

  if (typeof props.modelValue === 'string') {
    try {
      const parsed = JSON.parse(props.modelValue)
      if (parsed && typeof parsed === 'object' && 'url' in parsed) {
        emit('update:modelValue', { ...parsed, url: trimmed })
        return
      }
    } catch {
      // Keep plain URL string as-is.
    }
  }

  emit('update:modelValue', trimmed)
}

const triggerFileInput = (): void => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  try {
    const uploadedMedia = await authStore.uploadPublicFile(file)
    emit('update:modelValue', uploadedMedia)
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'Ошибка загрузки'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// ── captions field ──
const captionLeft = computed(() =>
  Array.isArray(props.modelValue) ? (props.modelValue[0] ?? '') : '',
)

const captionRight = computed(() =>
  Array.isArray(props.modelValue) ? (props.modelValue[1] ?? '') : '',
)

const emitCaption = (idx: number, val: string | number | null) => {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : ['', '']
  arr[idx] = val ?? ''
  emit('update:modelValue', arr)
}

const radioOptions = computed(() =>
  props.fieldDef.variants?.map((v) => ({ label: v.text, value: v.value })) ?? [],
)
</script>

<style scoped>
.image-preview-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  max-width: 160px;
}

.image-preview {
  display: block;
  width: 160px;
  max-height: 120px;
  object-fit: cover;
  background: #fafafa;
}

.image-preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(255,255,255,0.85);
}
</style>
