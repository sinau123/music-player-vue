export function getMp3Duration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const objectUrl = URL.createObjectURL(file)

    audio.preload = 'metadata'
    audio.src = objectUrl

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(audio.duration) // seconds (float)
    }

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load audio metadata'))
    }
  })
}
