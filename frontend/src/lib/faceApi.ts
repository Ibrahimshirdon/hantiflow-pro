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

// Snapshots the current video frame as a JPEG blob — purely for human
// review (an admin looking at "whose face is this?"), never used in the
// matching logic itself, which relies solely on the descriptor above.
export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}
