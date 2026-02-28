<script setup lang="ts">
import { Music } from 'lucide-vue-next'
import { type Track } from '../../db'
import type { Ref } from 'vue'

defineProps<{
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  formatTime: (time: number) => string
  audioRef: Ref<HTMLAudioElement | null>
}>()

const emit = defineEmits(['update:currentTime'])

const handleSeek = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:currentTime', parseFloat(target.value))
}
</script>

<template>
  <div class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700">
    <div class="flex items-center gap-4 mb-6">
      <div
        class="w-16 h-16 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center"
      >
        <Music class="w-8 h-8" />
      </div>
      <div class="flex-1">
        <h3 class="text-xl font-semibold">
          {{ currentTrack ? currentTrack.name : 'No track selected' }}
        </h3>
        <p class="text-slate-400 text-sm">
          {{ isPlaying ? 'Playing' : 'Paused' }}
        </p>
      </div>
    </div>

    <!-- Progress -->
    <div class="space-y-2 mb-6">
      <input
        type="range"
        min="0"
        :max="duration || 0"
        :value="currentTime"
        @change="handleSeek"
        class="w-full h-2 bg-slate-700 rounded-lg cursor-pointer accent-purple-500"
      />
      <div class="flex justify-between text-sm text-slate-400">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>
  </div>
</template>
