/**
 * NSFW Image Scanner — Client-side AI Content Moderation
 * Uses nsfwjs (TensorFlow.js) to detect inappropriate content before upload.
 * Model is lazily loaded on first scan and cached for subsequent checks.
 * Both TensorFlow.js and nsfwjs are dynamically imported to avoid bloating the main bundle.
 */

let nsfwModel = null
let modelLoading = false
let modelPromise = null

const BLOCKED_CLASSES = ['Porn', 'Hentai', 'Sexy']
const THRESHOLD = 0.60 // 60% probability threshold

/**
 * Load the NSFW model (lazy, singleton)
 */
async function loadModel() {
  if (nsfwModel) return nsfwModel
  if (modelPromise) return modelPromise

  modelLoading = true
  modelPromise = (async () => {
    try {
      // Dynamic imports to keep TF.js + nsfwjs out of the main bundle
      const tfjs = await import('@tensorflow/tfjs')
      // Make tf available globally as nsfwjs might expect it when dynamically imported
      window.tf = tfjs.default || tfjs
      const nsfwjs = await import('nsfwjs')
      // Use the default model (InceptionV3) which is more reliable if the MobileNetV2 URL is blocked
      const model = await nsfwjs.load()
      nsfwModel = model
      modelLoading = false
      return model
    } catch (err) {
      modelLoading = false
      modelPromise = null
      console.error('[NSFW] Failed to load model:', err)
      throw err
    }
  })()
  return modelPromise
}

/**
 * Create an HTMLImageElement from a File
 */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

/**
 * Scan an image file for NSFW content.
 *
 * @param {File} file - The image file to scan
 * @returns {Promise<{ safe: boolean, label: string, confidence: number, predictions: Array }>}
 *
 * Example return for blocked image:
 *   { safe: false, label: 'Porn', confidence: 0.87, predictions: [...] }
 *
 * Example return for safe image:
 *   { safe: true, label: 'Neutral', confidence: 0.92, predictions: [...] }
 */
export async function scanImage(file) {
  // Skip non-image files (e.g. videos — nsfwjs only handles images)
  if (!file.type.startsWith('image/')) {
    return { safe: true, label: 'Skipped', confidence: 1, predictions: [] }
  }

  try {
    const model = await loadModel()
    const img = await fileToImage(file)

    // Classify the image
    const predictions = await model.classify(img)

    // Find the top blocked prediction
    const blocked = predictions.find(
      p => BLOCKED_CLASSES.includes(p.className) && p.probability > THRESHOLD
    )

    if (blocked) {
      return {
        safe: false,
        label: blocked.className,
        confidence: blocked.probability,
        predictions,
      }
    }

    // Find the top prediction overall
    const top = predictions.reduce((a, b) => (a.probability > b.probability ? a : b))
    return {
      safe: true,
      label: top.className,
      confidence: top.probability,
      predictions,
    }
  } catch (err) {
    console.error('[NSFW] Scan failed:', err)
    // On model failure, allow the upload (fail open) but log the error
    return { safe: true, label: 'Error', confidence: 0, predictions: [] }
  }
}

/**
 * Check if the NSFW model is currently loading
 */
export function isModelLoading() {
  return modelLoading
}
