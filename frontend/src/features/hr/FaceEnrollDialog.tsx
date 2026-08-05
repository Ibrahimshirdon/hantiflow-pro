import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Camera, Check } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
}

export function FaceEnrollDialog({ open, onOpenChange, staffId, staffName }: Props) {
  const { t } = useTranslation(["hr", "common"]);
  const queryClient = useQueryClient();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    setVideoEl(el);
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      setError(null);
      setReady(false);
      stopCamera();
      return;
    }

    let cancelled = false;

    async function start() {
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
  }, [open, videoEl, t]);

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

  async function handleCapture() {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader>
          <DialogTitle>{t("hr:faceEnroll.title", { name: staffName })}</DialogTitle>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg bg-black">
          <video ref={videoCallbackRef} className="w-full" autoPlay muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-40 rounded-full border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        </div>

        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {ready ? t("hr:faceEnroll.hint") : t("hr:faceEnroll.loadingCamera")}
          </p>
        )}

        <Button
          className="w-full gap-2"
          disabled={!ready || capturing || enrollMutation.isPending}
          onClick={handleCapture}
        >
          {capturing || enrollMutation.isPending ? (
            <Camera className="size-4 animate-pulse" />
          ) : (
            <Check className="size-4" />
          )}
          {t("hr:faceEnroll.capture")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
