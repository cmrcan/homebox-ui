<script setup lang="ts">
import { onMounted, ref } from "vue";
import { X } from "lucide-vue-next";
defineProps<{ title: string; subtitle?: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
onMounted(() => dialog.value?.showModal());
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    aria-labelledby="modal-title"
    @cancel.prevent="emit('close')"
  >
    <div class="modal-header">
      <div>
        <p v-if="subtitle" class="muted">{{ subtitle }}</p>
        <h2 id="modal-title" class="text-lg font-semibold">{{ title }}</h2>
      </div>
      <button
        class="icon-button"
        type="button"
        aria-label="Pencereyi kapat"
        @click="emit('close')"
      >
        <X :size="20" />
      </button>
    </div>
    <slot />
  </dialog>
</template>
