<script setup lang="ts">
import type { Track } from '@/db'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  List,
  ChartColumnIncreasing,
} from 'lucide-vue-next'

defineProps<{
  isPlaying: boolean
  isMuted: boolean
  volume: number
  enableVisualizer: boolean
  currentTrack: Track | null
}>()

const emit = defineEmits([
  'togglePlay',
  'playNext',
  'playPrevious',
  'toggleMute',
  'handleVolumeChange',
  'toggleVisualizer',
  'togglePlaylist',
])
</script>

<template>
  <div class="flex items-center justify-between flex-wrap gap-4">
    <div class="flex items-center gap-2">
      <button @click="emit('toggleMute')" class="p-2 hover:bg-slate-700 rounded-lg">
        <VolumeX v-if="isMuted || volume === 0" class="w-5 h-5" />
        <Volume2 v-else class="w-5 h-5" />
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        @input="emit('handleVolumeChange', $event)"
        class="w-24 h-2 bg-slate-700 rounded-lg cursor-pointer accent-purple-500"
      />
    </div>

    <div>
      <button
        @click="emit('toggleVisualizer')"
        class="p-2 bg-linear-to-r rounded-full"
        :class="!enableVisualizer ? 'from-gray-500 to-gray-500' : 'from-purple-500 to-pink-500'"
      >
        <ChartColumnIncreasing class="w-5 h-5" />
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        @click="emit('playPrevious')"
        :disabled="!currentTrack"
        class="p-3 hover:bg-slate-700 rounded-full disabled:opacity-50"
      >
        <SkipBack class="w-6 h-6" />
      </button>

      <button
        @click="emit('togglePlay')"
        :disabled="!currentTrack"
        class="p-4 bg-linear-to-r from-purple-500 to-pink-500 rounded-full disabled:opacity-50"
      >
        <Pause v-if="isPlaying" class="w-6 h-6" />
        <Play v-else class="w-6 h-6 ml-1" />
      </button>

      <button
        @click="emit('playNext')"
        :disabled="!currentTrack"
        class="p-3 hover:bg-slate-700 rounded-full disabled:opacity-50"
      >
        <SkipForward class="w-6 h-6" />
      </button>
    </div>

    <button @click="emit('togglePlaylist')" class="p-2 hover:bg-slate-700 rounded-lg lg:hidden">
      <List class="w-5 h-5" />
    </button>
  </div>
</template>
