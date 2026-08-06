import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Camera, Check, Upload } from "lucide-react";
import { enrollFace } from "@/api/hr.api";
import { getApiErrorMessage } from "@/api/client";
import { captureVideoFrame, detectFaceDescriptor, loadFaceModels } from "@/lib/faceApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
}

export function FaceEnrollDialog({ open, onOpenChange, staffId, staffName }: Props) {
  const { t } = useTranslation(["hr", "common"]);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"camera" | "upload">("camera");

  // Camera mode state
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Upload mode state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadImgEl, setUploadImgEl] = useState<HTMLImageElement | null>(null);
  const [uploadImgLoaded, setUploadImgLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    setVideoEl(el);
  }, []);
  const uploadImgCallbackRef = useCallback((el: HTMLImageElement | null) => {
    setUploadImgEl(el);
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function resetUpload() {
    setUploadFile(null);
    setUploadImgLoaded(false);
    setUploadPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  // Reset everything when the dialog closes, and every time it re-opens
  // start back on the camera tab.
  useEffect(() => {
    if (!open) {
      setError(null);
      setReady(false);
      stopCamera();
      resetUpload();
      setMode("camera");
    }
  }, [open]);

  // Only requests the webcam while the Camera tab is actually active — an
  // admin who picks Upload Photo instead should never see a permission
  // prompt for a camera they're not using.
  useEffect(() => {
    if (!open || mode !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;

    async function start() {
      setError(null);
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled || !videoEl) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoEl.srcObject = stream;
        setReady(true);
      } catch {
        if (!cancelled) setError(t("hr:faceEnroll.errorCamera"));
      }
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, mode, videoEl, t]);

  // Preload the models for upload mode too — detection on the uploaded
  // image needs them just as much as the live camera path does.
  useEffect(() => {
    if (open && mode === "upload") {
      loadFaceModels().catch(() => setError(t("hr:faceEnroll.errorNoFace")));
    }
  }, [open, mode, t]);

  const enrollMutation = useMutation({
    mutationFn: ({ descriptor, photo }: { descriptor: number[]; photo: Blob }) =>
      enrollFace(staffId, descriptor, photo),
    onSuccess: () => {
      toast.success(t("hr:faceEnroll.toasts.enrolled", { name: staffName }));
      queryClient.invalidateQueries({ queryKey: ["faceEnrollments"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  async function handleCaptureFromCamera() {
    if (!videoEl) return;
    setCapturing(true);
    setError(null);
    try {
      const descriptor = await detectFaceDescriptor(videoEl);
      if (!descriptor) {
        setError(t("hr:faceEnroll.errorNoFace"));
        return;
      }
      const photo = await captureVideoFrame(videoEl);
      if (!photo) {
        setError(t("hr:faceEnroll.errorNoFace"));
        return;
      }
      enrollMutation.mutate({ descriptor, photo });
    } finally {
      setCapturing(false);
    }
  }

  function handleFileSelected(file: File | undefined) {
    if (!file) return;
    resetUpload();
    setUploadFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  async function handleEnrollFromUpload() {
    if (!uploadImgEl || !uploadFile) return;
    setCapturing(true);
    setError(null);
    try {
      const descriptor = await detectFaceDescriptor(uploadImgEl);
      if (!descriptor) {
        setError(t("hr:faceEnroll.errorNoFace"));
        return;
      }
      enrollMutation.mutate({ descriptor, photo: uploadFile });
    } finally {
      setCapturing(false);
    }
  }

  const canSubmit =
    mode === "camera" ? ready : !!uploadFile && uploadImgLoaded;
  const isBusy = capturing || enrollMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader>
          <DialogTitle>{t("hr:faceEnroll.title", { name: staffName })}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "camera" | "upload")}>
          <TabsList className="w-full">
            <TabsTrigger value="camera" className="flex-1 gap-1.5">
              <Camera className="size-4" />
              {t("hr:faceEnroll.tabs.camera")}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 gap-1.5">
              <Upload className="size-4" />
              {t("hr:faceEnroll.tabs.upload")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-3">
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video ref={videoCallbackRef} className="w-full" autoPlay muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-40 rounded-full border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : ready ? (
                t("hr:faceEnroll.hint")
              ) : (
                t("hr:faceEnroll.loadingCamera")
              )}
            </p>
          </TabsContent>

          <TabsContent value="upload" className="mt-3">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {uploadPreviewUrl ? (
                <img
                  ref={uploadImgCallbackRef}
                  src={uploadPreviewUrl}
                  alt=""
                  className="size-full object-contain"
                  onLoad={() => setUploadImgLoaded(true)}
                />
              ) : (
                <p className="px-6 text-center text-sm text-muted-foreground">
                  {t("hr:faceEnroll.uploadPlaceholder")}
                </p>
              )}
            </div>
            <label className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground hover:bg-muted">
              <Upload className="size-4" />
              {uploadFile ? uploadFile.name : t("hr:faceEnroll.chooseFile")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />
            </label>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : (
                t("hr:faceEnroll.uploadHint")
              )}
            </p>
          </TabsContent>
        </Tabs>

        <Button
          className="w-full gap-2"
          disabled={!canSubmit || isBusy}
          onClick={mode === "camera" ? handleCaptureFromCamera : handleEnrollFromUpload}
        >
          {isBusy ? <Camera className="size-4 animate-pulse" /> : <Check className="size-4" />}
          {mode === "camera" ? t("hr:faceEnroll.capture") : t("hr:faceEnroll.enrollFromPhoto")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
