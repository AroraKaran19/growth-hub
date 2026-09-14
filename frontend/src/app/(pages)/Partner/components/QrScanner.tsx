"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

type DetectedCode = { rawValue: string };
type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedCode[]>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorInstance;

// The Barcode Detection API ships in Chromium browsers but is not in the
// TypeScript DOM library yet, so it is looked up defensively.
const getDetector = () =>
  (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;

type ScannerStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "unsupported"
  | "denied"
  | "error";

const MESSAGES: Partial<Record<ScannerStatus, string>> = {
  idle: "Point the camera at the member's QR code.",
  starting: "Starting the camera...",
  scanning: "Hold the code steady inside the frame.",
  unsupported:
    "This browser can't scan QR codes. Use Chrome or Edge, or type the booking ID below.",
  denied:
    "Camera access was blocked. Allow the camera in your browser settings, or type the booking ID below.",
  error: "The camera couldn't start. Try again, or type the booking ID below.",
};

const SCAN_INTERVAL_MS = 300;

const QrScanner = ({ onDetect }: { onDetect: (value: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");

  const releaseCamera = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Always let go of the camera when leaving the page.
  useEffect(() => releaseCamera, []);

  const stop = () => {
    releaseCamera();
    setStatus("idle");
  };

  const start = async () => {
    const Detector = getDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        releaseCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");

      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue;
          if (value) {
            stop();
            onDetect(value);
            return;
          }
        } catch {
          // A frame can fail to decode while the camera focuses; keep going.
        }
        timerRef.current = window.setTimeout(tick, SCAN_INTERVAL_MS);
      };
      void tick();
    } catch (error) {
      releaseCamera();
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "error",
      );
    }
  };

  const isLive = status === "scanning" || status === "starting";

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-tertiary">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Camera preview"
          className={isLive ? "size-full object-cover" : "hidden"}
        />

        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-secondary/70">
            <Camera aria-hidden="true" className="size-10" />
            <p className="text-sm">Camera is off</p>
          </div>
        )}

        {/* Frame corners guide where to hold the code. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-10">
          <span className="absolute left-0 top-0 size-8 rounded-tl-lg border-l-4 border-t-4 border-primary" />
          <span className="absolute right-0 top-0 size-8 rounded-tr-lg border-r-4 border-t-4 border-primary" />
          <span className="absolute bottom-0 left-0 size-8 rounded-bl-lg border-b-4 border-l-4 border-primary" />
          <span className="absolute bottom-0 right-0 size-8 rounded-br-lg border-b-4 border-r-4 border-primary" />
        </div>
      </div>

      <p aria-live="polite" className="mx-auto mt-3 max-w-sm text-center text-sm text-tertiary/65">
        {MESSAGES[status]}
      </p>

      <div className="mt-4 flex justify-center">
        {isLive ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <CameraOff aria-hidden="true" className="size-4" />
            Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <Camera aria-hidden="true" className="size-4" />
            {status === "idle" ? "Start camera" : "Try the camera again"}
          </button>
        )}
      </div>
    </div>
  );
};

export default QrScanner;
