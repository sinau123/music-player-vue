<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { Plus, Trash2, Shuffle, Trash, Loader } from 'lucide-vue-next'
import { type TrackMeta } from '../../db'

defineProps<{
  clientTracks: TrackMeta[]
  playlist: TrackMeta[]
  currentTrackId?: string
  isUploading: boolean
  totalDurationFormatted: string
  formatTime: (time: number) => string
  fileInputRef: Ref<HTMLInputElement | null>
  showPlaylist: boolean
}>()

const emit = defineEmits([
  'handleFileUpload',
  'handleShuffle',
  'clearTracks',
  'playTrack',
  'deleteTrack',
  'update:searchQuery',
])

const searchQuery = ref('')

const handleSearchUpdate = (e: Event) => {
  const target = e.target as HTMLInputElement
  searchQuery.value = target.value
  emit('update:searchQuery', target.value)
}

const handleFileChange = (e: Event) => {
  emit('handleFileUpload', e)
}
</script>

<template>
  <div :class="showPlaylist ? 'block' : 'hidden lg:block'">
    <div class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700">
      <div class="flex items-center justify-between mb-4 flex-wrap">
        <div>
          <h2 class="text-xl font-semibold">
            Playlist
            <span class="ml-2 text-xs text-slate-400">({{ clientTracks.length }} songs)</span>
          </h2>
          <p class="text-slate-400 text-md">
            Total duration: <b>{{ totalDurationFormatted }}</b>
          </p>
        </div>

        <Loader v-if="isUploading" class="w-4 h-4 animate-spin" />
        <button
          v-else
          @click="fileInputRef.value?.click()"
          class="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg"
        >
          <Plus class="w-4 h-4" /> Add
        </button>
      </div>

      <input
        :ref="fileInputRef"
        type="file"
        accept="audio/*"
        multiple
        class="hidden"
        @change="handleFileChange"
      />

      <div class="flex items-center gap-2 py-4">
        <button
          @click="emit('handleShuffle')"
          class="px-4 py-1 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg"
        >
          <Shuffle class="size-4" />
        </button>
        <button
          @click="emit('clearTracks')"
          class="px-4 py-1 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg"
        >
          <Trash class="size-4" />
        </button>
      </div>

      <div class="py-4">
        <input
          :value="searchQuery"
          @input="handleSearchUpdate"
          type="text"
          placeholder="Search"
          class="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-900/50 text-white"
        />
      </div>

      <div class="space-y-2 sm:max-h-[500px] sm:overflow-y-auto custom-scrollbar">
        <p v-if="clientTracks.length === 0" class="text-slate-400 text-center py-8">
          No tracks yet. Add some music!
        </p>

        <div
          v-for="track in playlist"
          :key="track.id"
          :class="[
            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition',
            currentTrackId === track.id
              ? 'bg-purple-500/20 border border-purple-500/50'
              : 'bg-slate-700/30 hover:bg-slate-700/50',
          ]"
        >
          <button @click="emit('playTrack', track.id)" class="flex-1 text-left truncate">
            {{ track.name }}
            <span class="block text-slate-400 text-xs">{{ formatTime(track.duration) }}</span>
          </button>
          <button
            @click.stop="emit('deleteTrack', track.id)"
            class="p-2 hover:bg-red-500/20 rounded-lg"
          >
            <Trash2 class="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
