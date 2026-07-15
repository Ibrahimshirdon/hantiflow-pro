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
  const videoRef = useRef<HTMLVideoElement>(null);
  // IScannerControls returned by decodeFromVideoDevice — has stop()
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setError(null);
      return;
    }

    let cancelled = false;

    async function startScanner() {
      if (!videoRef.current) return;
      setError(null);
      setScanning(true);

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserMultiFormatReader();

        // decodeFromVideoDevice resolves with IScannerControls once the camera
        // stream starts. The callback then fires on every decoded frame.
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText();
              controlsRef.current?.stop();
              controlsRef.current = null;
              setScanning(false);
              setOpen(false);
              onScan(text);
              return;
            }
            // "NotFoundException" fires every frame when no barcode is visible — ignore it.
            // Any other error (camera access denied, decode failure) is real.
            if (err && err.name !== "NotFoundException") {
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
  }, [open, onScan, stopScanner, t]);

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
              ref={videoRef}
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
