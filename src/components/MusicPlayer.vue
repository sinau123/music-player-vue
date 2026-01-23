<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { nanoid } from 'nanoid'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  List,
  Music,
  Shuffle,
  Trash,
  Loader,
  ChartColumnIncreasing,
} from 'lucide-vue-next'

import { type Track, getAllTracks, saveTrack, deleteTrack, clearTracks, getTrack } from '../db'
import { getMp3Duration } from '../utils'

// Types
interface ClientTrack {
  id: string
  name: string
  duration: number
}

// State
const clientTracks = ref<ClientTrack[]>([])
const currentTrack = ref<Track | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const showPlaylist = ref(true)
const isUploading = ref(false)
const enableVisualizer = ref(true)

// Refs
const audioRef = ref<HTMLAudioElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Audio visualizer refs
const audioContextRef = ref<AudioContext | null>(null)
const analyserRef = ref<AnalyserNode | null>(null)
const sourceRef = ref<MediaElementAudioSourceNode | null>(null)
const animationRef = ref<number | null>(null)

// Load tracks on mount
onMounted(async () => {
  try {
    const tracks = await getAllTracks()
    clientTracks.value = tracks.map((t) => ({
      id: t.id,
      name: t.name,
      duration: t.duration,
    }))
  } catch (err) {
    console.error(err)
  }
})

// Setup audio visualizer
const setupVisualizer = () => {
  if (!audioContextRef.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioContextRef.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    analyserRef.value = audioContextRef.value.createAnalyser()
    analyserRef.value.fftSize = 256

    if (!sourceRef.value && audioRef.value) {
      sourceRef.value = audioContextRef.value.createMediaElementSource(audioRef.value)
      sourceRef.value.connect(analyserRef.value)
      analyserRef.value.connect(audioContextRef.value.destination)
    }
  }
}

// Visualizer animation
const drawVisualizer = () => {
  if (!analyserRef.value || !canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const bufferLength = analyserRef.value.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  const draw = () => {
    animationRef.value = requestAnimationFrame(draw)
    analyserRef.value!.getByteFrequencyData(dataArray)

    ctx.fillStyle = 'rgb(15, 23, 42)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const barWidth = (canvas.width / bufferLength) * 2.5
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const data = dataArray[i] || 0
      const barHeight = (data / 255) * canvas.height * 0.8

      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
      gradient.addColorStop(0, '#8b5cf6')
      gradient.addColorStop(1, '#ec4899')

      ctx.fillStyle = gradient
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
      x += barWidth + 1
    }
  }

  draw()
}

watch(enableVisualizer, () => {
  if (enableVisualizer.value) {
    nextTick(() => {
      drawVisualizer()
    })
  } else {
    cancelAnimationFrame(animationRef.value!)
  }
})

// Upload handler
const handleFileUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return

  isUploading.value = true

  try {
    await Promise.all(
      files.map(
        (file) =>
          new Promise<void>((resolve, reject) => {
            if (!file.type.startsWith('audio/')) {
              resolve()
              return
            }

            const reader = new FileReader()

            reader.onload = async (event) => {
              try {
                const dur = await getMp3Duration(file)

                const track: Track = {
                  id: nanoid(),
                  name: file.name.replace(/\.[^/.]+$/, ''),
                  data: event.target?.result as string,
                  type: file.type,
                  duration: dur,
                }

                await saveTrack(track)

                clientTracks.value.push({
                  id: track.id,
                  name: track.name,
                  duration: track.duration,
                })

                resolve()
              } catch (err) {
                reject(err)
              }
            }

            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          }),
      ),
    )
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

watch([currentTrack, isPlaying], () => {
  const currentTrackName = currentTrack.value?.name || 'Music Player'
  document.title = `${isPlaying.value ? '▶ Playing' : '⏸ Paused'} - ${currentTrackName}`
})

// Controls
const togglePlay = () => {
  if (!audioRef.value || !currentTrack.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    setupVisualizer()
    audioRef.value.play()
    drawVisualizer()
  }
  isPlaying.value = !isPlaying.value
}

const playTrack = async (trackId: string | undefined) => {
  if (!trackId) return

  const track = await getTrack(trackId)
  if (!track) return

  currentTrack.value = track
  isPlaying.value = false

  setTimeout(() => {
    if (audioRef.value) {
      audioRef.value.load()
      audioRef.value.play().then(() => {
        isPlaying.value = true
        setupVisualizer()
        drawVisualizer()
      })
    }
  }, 100)
}

const playNext = () => {
  if (!currentTrack.value || clientTracks.value.length === 0) return

  const currentIndex = clientTracks.value.findIndex((t) => t.id === currentTrack.value!.id)
  const nextIndex = (currentIndex + 1) % clientTracks.value.length
  playTrack(clientTracks.value[nextIndex]?.id)
}

const playPrevious = () => {
  if (!currentTrack.value || clientTracks.value.length === 0) return

  const currentIndex = clientTracks.value.findIndex((t) => t.id === currentTrack.value!.id)
  const prevIndex = (currentIndex - 1 + clientTracks.value.length) % clientTracks.value.length
  playTrack(clientTracks.value[prevIndex]?.id)
}

const _deleteTrack = async (id: string) => {
  await deleteTrack(id)
  clientTracks.value = clientTracks.value.filter((t) => t.id !== id)

  if (currentTrack.value?.id === id) {
    currentTrack.value = null
    isPlaying.value = false
  }
}

// Volume
const handleVolumeChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const newVolume = parseFloat(input.value)
  volume.value = newVolume
  if (audioRef.value) audioRef.value.volume = newVolume
  isMuted.value = newVolume === 0
}

const toggleMute = () => {
  if (isMuted.value) {
    volume.value = 0.5
    if (audioRef.value) audioRef.value.volume = 0.5
  } else {
    volume.value = 0
    if (audioRef.value) audioRef.value.volume = 0
  }
  isMuted.value = !isMuted.value
}

// Utils
const formatTime = (time: number) => {
  const hours = Math.floor(time / 3600)
  const mins = Math.floor((time / 60) % 60)
  const secs = Math.floor(time % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const totalDuration = () => clientTracks.value.reduce((acc, track) => acc + track.duration, 0)

// Cleanup
onBeforeUnmount(() => {
  if (animationRef.value) cancelAnimationFrame(animationRef.value)
})
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4"
  >
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1
          class="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Music Player
        </h1>
        <p class="text-slate-400">Upload and play your favorite tracks</p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Main Player -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Visualizer -->
          <div
            v-if="enableVisualizer"
            class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700 rela"
          >
            <canvas ref="canvasRef" width="800" height="200" class="w-full rounded-lg" />
          </div>

          <!-- Now Playing -->
          <div
            class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700"
          >
            <div class="flex items-center gap-4 mb-6">
              <div
                class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center"
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
                v-model="currentTime"
                @change="audioRef && (audioRef.currentTime = currentTime)"
                class="w-full h-2 bg-slate-700 rounded-lg cursor-pointer accent-purple-500"
              />
              <div class="flex justify-between text-sm text-slate-400">
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>
            </div>

            <!-- Controls -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button @click="toggleMute" class="p-2 hover:bg-slate-700 rounded-lg">
                  <VolumeX v-if="isMuted || volume === 0" class="w-5 h-5" />
                  <Volume2 v-else class="w-5 h-5" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  v-model="volume"
                  @input="handleVolumeChange"
                  class="w-24 h-2 bg-slate-700 rounded-lg cursor-pointer accent-purple-500"
                />
              </div>
              <div>
                <button
                  @click="enableVisualizer = !enableVisualizer"
                  class="p-2 bg-gradient-to-r rounded-full"
                  :class="
                    !enableVisualizer ? 'from-gray-500 to-gray-500' : 'from-purple-500 to-pink-500'
                  "
                >
                  <ChartColumnIncreasing class="w-5 h-5" />
                </button>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="playPrevious"
                  :disabled="!currentTrack"
                  class="p-3 hover:bg-slate-700 rounded-full disabled:opacity-50"
                >
                  <SkipBack class="w-6 h-6" />
                </button>

                <button
                  @click="togglePlay"
                  :disabled="!currentTrack"
                  class="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full disabled:opacity-50"
                >
                  <Pause v-if="isPlaying" class="w-6 h-6" />
                  <Play v-else class="w-6 h-6 ml-1" />
                </button>

                <button
                  @click="playNext"
                  :disabled="!currentTrack"
                  class="p-3 hover:bg-slate-700 rounded-full disabled:opacity-50"
                >
                  <SkipForward class="w-6 h-6" />
                </button>
              </div>

              <button
                @click="showPlaylist = !showPlaylist"
                class="p-2 hover:bg-slate-700 rounded-lg lg:hidden"
              >
                <List class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Playlist -->
        <div :class="showPlaylist ? 'block' : 'hidden lg:block'">
          <div
            class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700"
          >
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-xl font-semibold">
                  Playlist
                  <span class="ml-2 text-xs text-slate-400">({{ clientTracks.length }} songs)</span>
                </h2>
                <p class="text-slate-400 text-md">
                  Total duration: <b>{{ formatTime(totalDuration()) }}</b>
                </p>
              </div>

              <Loader v-if="isUploading" class="w-4 h-4 animate-spin" />
              <button
                v-else
                @click="fileInputRef?.click()"
                class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
              >
                <Plus class="w-4 h-4" /> Add
              </button>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              accept="audio/*"
              multiple
              class="hidden"
              @change="handleFileUpload"
            />

            <div class="flex items-center gap-2 py-4">
              <button
                @click="clientTracks = [...clientTracks].sort(() => Math.random() - 0.5)"
                class="px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
              >
                <Shuffle class="size-4" />
              </button>
              <button
                @click="
                  () => {
                    clearTracks()
                    clientTracks = []
                  }
                "
                class="px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
              >
                <Trash class="size-4" />
              </button>
            </div>

            <div class="space-y-2 max-h-96 overflow-y-auto">
              <p v-if="clientTracks.length === 0" class="text-slate-400 text-center py-8">
                No tracks yet. Add some music!
              </p>

              <div
                v-for="track in clientTracks"
                :key="track.id"
                :class="[
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition',
                  currentTrack?.id === track.id
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-slate-700/30 hover:bg-slate-700/50',
                ]"
              >
                <button @click="playTrack(track.id)" class="flex-1 text-left truncate">
                  {{ track.name }}
                  <span class="block text-slate-400 text-xs">{{ formatTime(track.duration) }}</span>
                </button>
                <button
                  @click.stop="_deleteTrack(track.id)"
                  class="p-2 hover:bg-red-500/20 rounded-lg"
                >
                  <Trash2 class="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden audio -->
      <audio
        ref="audioRef"
        @timeupdate="currentTime = audioRef?.currentTime || 0"
        @loadedmetadata="duration = audioRef?.duration || 0"
        @ended="playNext"
      >
        <source v-if="currentTrack" :src="currentTrack.data" :type="currentTrack.type" />
      </audio>
    </div>
  </div>
</template>
