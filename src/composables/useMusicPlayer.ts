import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { nanoid } from 'nanoid'
import {
  type Track,
  type TrackBlob,
  type TrackMeta,
  saveTrack,
  deleteTrack,
  clearTracks as dbClearTracks,
  getTrackBlob,
  getAllTracksMeta,
  bulkSaveTracksMeta,
} from '../db'
import { getMp3Duration } from '../utils'
import { useExportImportPlaylist } from './useExportImportPlaylist'

export function useMusicPlayer() {
  // State
  const searchQuery = ref('')
  const clientTracks = ref<TrackMeta[]>([])
  const currentTrack = ref<Track | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const isMuted = ref(false)
  const showPlaylist = ref(true)
  const isUploading = ref(false)
  const enableVisualizer = ref(true)
  const audioUrl = ref<string | null>(null)

  // Refs
  const audioRef = ref<HTMLAudioElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  // Audio visualizer internal refs
  const audioContextRef = ref<AudioContext | null>(null)
  const analyserRef = ref<AnalyserNode | null>(null)
  const sourceRef = ref<MediaElementAudioSourceNode | null>(null)
  const animationRef = ref<number | null>(null)

  const { exportAudioZip, importAudioZip } = useExportImportPlaylist()

  const playlist = computed(() => {
    if (!searchQuery.value) {
      return clientTracks.value
    }
    return clientTracks.value.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  })

  const totalDuration = computed(() =>
    clientTracks.value.reduce((acc, track) => acc + track.duration, 0),
  )

  // Load tracks on mount
  onMounted(async () => {
    try {
      const tracks = await getAllTracksMeta()
      clientTracks.value = tracks
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
      if (animationRef.value) cancelAnimationFrame(animationRef.value)
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
        files.map(async (file, index) => {
          if (!file.type.startsWith('audio/')) return

          const dur = await getMp3Duration(file)

          const track: TrackMeta & TrackBlob = {
            id: nanoid(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            blob: file,
            type: file.type,
            duration: dur,
            createdAt: new Date().getTime(),
            order: index,
          }

          await saveTrack(track)
          clientTracks.value.push(track)
        }),
      )
    } finally {
      isUploading.value = false
      input.value = ''
    }
  }

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

    const x = await getTrackBlob(trackId)
    const y = clientTracks.value.find((track) => track.id === trackId)

    if (!x || !y) {
      return
    }

    const track = { ...x, ...y }
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

  const handleShuffle = () => {
    const shuffled = [...clientTracks.value]
      .sort(() => Math.random() - 0.5)
      .map((track, index) => ({ ...track, order: index }))
    clientTracks.value = shuffled
    bulkSaveTracksMeta(shuffled)
  }

  const clearTracks = () => {
    dbClearTracks()
    clientTracks.value = []
    currentTrack.value = null
    isPlaying.value = false
  }

  const handleExport = () => {
    exportAudioZip()
  }

  const handleImport = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const files = input.files ? Array.from(input.files) : []
    if (!files[0]) return

    const tracks = await importAudioZip(files[0])
    clientTracks.value.push(...tracks)
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const mins = Math.floor((time / 60) % 60)
    const secs = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Side Effects
  watch([currentTrack, isPlaying], () => {
    const currentTrackName = currentTrack.value?.name || 'Music Player'
    document.title = `${isPlaying.value ? '▶ Playing' : '⏸ Paused'} - ${currentTrackName}`
  })

  watch(
    () => currentTrack.value?.blob,
    (blob) => {
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value)
        audioUrl.value = null
      }

      if (blob) {
        audioUrl.value = URL.createObjectURL(blob)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (animationRef.value) cancelAnimationFrame(animationRef.value)
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  })

  onMounted(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.setActionHandler('play', togglePlay)
    navigator.mediaSession.setActionHandler('pause', togglePlay)
    navigator.mediaSession.setActionHandler('nexttrack', playNext)
    navigator.mediaSession.setActionHandler('previoustrack', playPrevious)
  })

  watch(
    currentTrack,
    (track) => {
      if (!('mediaSession' in navigator) || !track) return

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: track.name,
        album: '-',
        artwork: [{ src: '', sizes: '512x512', type: 'image/png' }],
      })
    },
    { immediate: true },
  )

  return {
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
    canvasRef,
    fileInputRef,
    totalDuration,
    togglePlay,
    playTrack,
    playNext,
    playPrevious,
    handleFileUpload,
    deleteTrack: _deleteTrack,
    handleVolumeChange,
    toggleMute,
    handleShuffle,
    clearTracks,
    formatTime,
    handleExport,
    handleImport,
  }
}
