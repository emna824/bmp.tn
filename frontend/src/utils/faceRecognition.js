let faceApiPromise = null
let modelsPromise = null

const MODEL_URL = '/models'

export async function loadFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = import('face-api.js')
  }

  return faceApiPromise
}

export async function loadFaceModels() {
  const faceapi = await loadFaceApi()

  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
  }

  await modelsPromise
  return faceapi
}

export async function getSingleFaceDescriptor(videoElement) {
  if (!videoElement || videoElement.readyState < 2) {
    throw new Error('Camera is still warming up. Please try again.')
  }

  const faceapi = await loadFaceModels()
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.5,
  })

  const detections = await faceapi
    .detectAllFaces(videoElement, options)
    .withFaceLandmarks()
    .withFaceDescriptors()

  if (!detections.length) {
    throw new Error('No face detected. Center your face in the frame and try again.')
  }

  if (detections.length > 1) {
    throw new Error('Multiple faces detected. Only one person can be visible.')
  }

  return Array.from(detections[0].descriptor)
}

