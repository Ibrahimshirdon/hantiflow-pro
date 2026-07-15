import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  onScan: (barcode: string) => void;
}

export function CameraScanner({ onScan }: Props) {
  const { t } = useTranslation(["sales"]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  // Use state instead of ref so the effect below reacts when the video mounts
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  // Keep onScan stable inside the async callback via ref
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  // Callback ref — fires with the real element once the dialog mounts it
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    setVideoEl(el);
  }, []);

  // Reset error when dialog closes
  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  // Start/stop scanner whenever the video element mounts or unmounts
  useEffect(() => {
    if (!videoEl) {
      stopScanner();
      return;
    }

    let cancelled = false;

    async function startScanner() {
      setError(null);
      setScanning(true);

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserMultiFormatReader();

        // facingMode: "environment" selects the rear camera on mobile
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoEl!,
          (result, err) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText();
              controlsRef.current?.stop();
              controlsRef.current = null;
              setScanning(false);
              setOpen(false);
              onScanRef.current(text);
              return;
            }
            // ZXing fires NotFoundException / ChecksumException / FormatException
            // on every frame where no barcode is fully decoded — all are normal
            // scan-miss events. Only a DOMException (camera permission denied,
            // device not found, etc.) is a real hardware error worth surfacing.
            if (err && err instanceof DOMException) {
              setError(t("sales:cameraScanner.errorCamera"));
              controlsRef.current?.stop();
              controlsRef.current = null;
              setScanning(false);
            }
          },
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch {
        if (!cancelled) {
          setError(t("sales:cameraScanner.errorCamera"));
          setScanning(false);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [videoEl, stopScanner, t]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title={t("sales:cameraScanner.trigger")}
        onClick={() => setOpen(true)}
      >
        <Camera className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle>{t("sales:cameraScanner.title")}</DialogTitle>
          </DialogHeader>

          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoCallbackRef}
              className="w-full"
              autoPlay
              muted
              playsInline
            />
            {/* Scan-target overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-48 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          </div>

          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : scanning ? (
            <p className="text-center text-sm text-muted-foreground">
              {t("sales:cameraScanner.hint")}
            </p>
          ) : null}

          <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(false)}>
            <X className="size-4" />
            {t("sales:cameraScanner.cancel")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
