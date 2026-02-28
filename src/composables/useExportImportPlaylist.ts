import JSZip from 'jszip'
import { getAllTracksMeta, getTrackBlob, saveTrack, type Track, type TrackMeta } from '../db'

type ManifestFile = {
  version: number
  files: TrackMeta[]
}

export function useExportImportPlaylist() {
  async function exportAudioZip() {
    const zip = new JSZip()
    const audioFolder = zip.folder('audio')
    const manifest: ManifestFile['files'] = []

    const tracks = await getAllTracksMeta()
    const results = await Promise.all(
      tracks.map(async (track) => {
        const blob = await getTrackBlob(track.id)
        if (!blob) return null
        return { ...track, ...blob }
      }),
    )

    const tracksWithBlob = results.filter((track): track is Track => track !== null)

    for await (const cursor of tracksWithBlob) {
      const { id, name, blob, type, duration, createdAt, order } = cursor

      audioFolder!.file(name, blob) // streams blob
      manifest.push({ id, name, type, duration, createdAt, order })
    }

    zip.file('manifest.json', JSON.stringify({ version: 1, files: manifest }, null, 2))

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      streamFiles: true, // critical for big files
    })

    download(zipBlob, 'audio-export.zip')
  }

  async function importAudioZip(file: File) {
    const zip = await JSZip.loadAsync(file)

    const manifest: ManifestFile = JSON.parse(await zip.file('manifest.json')!.async('string'))

    for (const item of manifest.files) {
      const blob = await zip.file(`audio/${item.name}`)!.async('blob')

      await saveTrack({
        id: item.id,
        name: item.name,
        type: item.type,
        blob,
        duration: item.duration,
        order: item.order,
      })
    }

    return manifest.files
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    exportAudioZip,
    importAudioZip,
  }
}
