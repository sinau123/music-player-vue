<script setup lang="ts">
import { type Ref } from 'vue'

defineProps<{
  enableVisualizer: boolean
  canvasRef: Ref<HTMLCanvasElement | null>
}>()
</script>

<template>
  <div
    v-if="enableVisualizer"
    class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700 rela"
  >
    <canvas :ref="canvasRef" width="800" height="200" class="w-full rounded-lg" />
  </div>
</template>
