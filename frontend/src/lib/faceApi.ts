import * as faceapi from "face-api.js";

// Pretrained weights hosted on the face-api.js author's own GitHub Pages
// site — the standard place every face-api.js tutorial points at, since
// the npm package itself ships no model files (they're multi-megabyte
// binary shards, kept out of the JS bundle on purpose).
const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let modelsPromise: Promise<void> | null = null;

// Only the three nets attendance recognition actually needs: face
// detection, landmark alignment (improves descriptor quality), and the
// descriptor (embedding) net itself. Loaded once and cached for the life
// of the page — both the enroll dialog and the check-in kiosk call this.
export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsPromise;
}

// Returns a 128-length face embedding for the most prominent face in the
// current video frame, or null if no face was detected.
export async function detectFaceDescriptor(video: HTMLVideoElement): Promise<number[] | null> {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? Array.from(detection.descriptor) : null;
}
