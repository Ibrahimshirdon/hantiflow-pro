import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ScanFace, XCircle } from "lucide-react";
import { faceCheckIn } from "@/api/hr.api";
import { detectFaceDescriptor, loadFaceModels } from "@/lib/faceApi";
import { Card, CardContent } from "@/components/ui/card";

const SCAN_INTERVAL_MS = 1500;
// How long a result banner stays up before the kiosk resumes scanning for
// the next person — long enough to read, short enough that the next
// employee in line isn't kept waiting.
const RESULT_DISPLAY_MS = 4000;

type Result =
  | { kind: "matched"; staffName: string; checkedOut: boolean }
  | { kind: "unmatched" };

export function FaceCheckInPage() {
  const { t } = useTranslation(["hr"]);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "result" | "error">("loading");
  const [result, setResult] = useState<Result | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    setVideoEl(el);
  }, []);

  useEffect(() => {
    if (!videoEl) return;

    let cancelled = false;

    async function start() {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoEl!.srcObject = stream;
        setStatus("scanning");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [videoEl]);

  useEffect(() => {
    if (!videoEl) return;

    const interval = setInterval(async () => {
      // Only attempt a match while idly scanning — skip while a request is
      // in flight or a result banner is still being shown, so the kiosk
      // doesn't fire overlapping requests or re-match the same person
      // before they've had a chance to step away.
      if (busyRef.current || statusRef.current !== "scanning") return;

      const descriptor = await detectFaceDescriptor(videoEl);
      if (!descriptor || busyRef.current || statusRef.current !== "scanning") return;

      busyRef.current = true;
      try {
        const outcome = await faceCheckIn(descriptor);
        if (outcome.matched) {
          setResult({
            kind: "matched",
            staffName: outcome.staffName!,
            checkedOut: !!outcome.checkedOut,
          });
        } else {
          setResult({ kind: "unmatched" });
        }
        setStatus("result");
        setTimeout(() => {
          setResult(null);
          setStatus("scanning");
        }, RESULT_DISPLAY_MS);
      } catch {
        // Transient network/API error — stay in scanning state and just
        // try again on the next tick rather than surfacing a kiosk-blocking
        // error screen for what's likely a momentary blip.
      } finally {
        busyRef.current = false;
      }
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [videoEl]);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("hr:faceCheckInPage.title")}</h1>
        <p className="text-muted-foreground">{t("hr:faceCheckInPage.subtitle")}</p>
      </div>

      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoCallbackRef}
              className="size-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {status === "scanning" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-52 animate-pulse rounded-full border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            )}

            {status === "result" && result?.kind === "matched" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-950/85 text-center text-white">
                <CheckCircle2 className="size-14 text-emerald-400" />
                <p className="text-xl font-semibold">{result.staffName}</p>
                <p className="text-sm text-emerald-200">
                  {result.checkedOut
                    ? t("hr:faceCheckInPage.checkedOut")
                    : t("hr:faceCheckInPage.checkedIn")}
                </p>
              </div>
            )}

            {status === "result" && result?.kind === "unmatched" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-destructive/85 text-center text-white">
                <XCircle className="size-14" />
                <p className="text-lg font-semibold">{t("hr:faceCheckInPage.notRecognized")}</p>
              </div>
            )}

            {(status === "loading" || status === "error") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white">
                <ScanFace className="size-10 opacity-70" />
                <p className="text-sm">
                  {status === "loading"
                    ? t("hr:faceCheckInPage.loadingCamera")
                    : t("hr:faceCheckInPage.errorCamera")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {status === "scanning" && (
        <p className="text-sm text-muted-foreground">{t("hr:faceCheckInPage.hint")}</p>
      )}
    </div>
  );
}
