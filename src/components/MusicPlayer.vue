<script setup lang="ts">
import { useMusicPlayer } from '../composables/useMusicPlayer'
import Visualizer from './player/PlayerVisualizer.vue'
import PlayerInfo from './player/PlayerInfo.vue'
import PlayerControls from './player/PlayerControls.vue'
import Playlist from './player/PlayerPlaylist.vue'

const musicPlayerData = useMusicPlayer()

const {
  searchQuery,
  clientTracks,
  playlist,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  showPlaylist,
  isUploading,
  enableVisualizer,
  audioUrl,
  audioRef,
  totalDuration,
  togglePlay,
  playTrack,
  playNext,
  playPrevious,
  handleFileUpload,
  deleteTrack,
  handleVolumeChange,
  toggleMute,
  handleShuffle,
  clearTracks,
  formatTime,
  handleImport,
  handleExport,
} = musicPlayerData
</script>

<template>
  <div
    class="h-screen overflow-y-auto sm:min-h-screen sm:h-auto bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4"
  >
    <div class="max-w-6xl w-full mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1
          class="text-4xl font-bold mb-2 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Music Player
        </h1>
        <p class="text-slate-400">Upload and play your favorite tracks</p>
      </div>

      <div class="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <!-- Main Player -->
        <div class="lg:col-span-2 space-y-6">
          <Visualizer
            :enable-visualizer="enableVisualizer"
            :canvas-ref="musicPlayerData.canvasRef"
          />

          <div
            class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700"
          >
            <PlayerInfo
              :current-track="currentTrack"
              :is-playing="isPlaying"
              :current-time="currentTime"
              :duration="duration"
              :format-time="formatTime"
              :audio-ref="musicPlayerData.audioRef"
              @update:current-time="
                (val) => {
                  currentTime = val
                  if (audioRef) audioRef.currentTime = val
                }
              "
            />

            <PlayerControls
              class="mt-6"
              :is-playing="isPlaying"
              :is-muted="isMuted"
              :volume="volume"
              :enable-visualizer="enableVisualizer"
              :current-track="currentTrack"
              @toggle-play="togglePlay"
              @play-next="playNext"
              @play-previous="playPrevious"
              @toggle-mute="toggleMute"
              @handle-volume-change="handleVolumeChange"
              @toggle-visualizer="enableVisualizer = !enableVisualizer"
              @toggle-playlist="showPlaylist = !showPlaylist"
            />
          </div>
        </div>

        <!-- Playlist -->
        <Playlist
          :client-tracks="clientTracks"
          :playlist="playlist"
          :current-track-id="currentTrack?.id"
          :is-uploading="isUploading"
          :total-duration-formatted="formatTime(totalDuration)"
          :format-time="formatTime"
          :file-input-ref="musicPlayerData.fileInputRef"
          :show-playlist="showPlaylist"
          @handle-file-upload="handleFileUpload"
          @handle-shuffle="handleShuffle"
          @clear-tracks="clearTracks"
          @play-track="playTrack"
          @delete-track="deleteTrack"
          @handle-export="handleExport"
          @handle-import="handleImport"
          @update:search-query="(val) => (searchQuery = val)"
        />
      </div>

      <!-- Hidden audio -->
      <audio
        ref="audioRef"
        @timeupdate="currentTime = audioRef?.currentTime || 0"
        @loadedmetadata="duration = audioRef?.duration || 0"
        @ended="playNext"
      >
        <source v-if="currentTrack && audioUrl" :src="audioUrl" :type="currentTrack.type" />
      </audio>
    </div>
  </div>
</template>
