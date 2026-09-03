import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui';
import { generateSecureToken } from '../../utils/cryptoRandom';

interface CameraQrScannerProps {
  onScan: (decodedText: string) => void;
  isActive: boolean;
  onToggleActive?: (active: boolean) => void;
  className?: string;
}

export function CameraQrScanner({
  onScan,
  isActive,
  onToggleActive,
  className = '',
}: CameraQrScannerProps) {
  const containerIdRef = useRef<string>(generateSecureToken('qr-reader'));
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  // Debounce duplicate scans
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId?: string) => {
      setErrorMessage(null);
      setIsInitializing(true);

      // Stop any existing instance
      await stopScanner();

      // Ensure container DOM exists
      const container = document.getElementById(containerIdRef.current);
      if (!container) {
        setIsInitializing(false);
        return;
      }

      try {
        const scanner = new Html5Qrcode(containerIdRef.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        // Query available cameras
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras.map((c) => ({ id: c.id, label: c.label || `Camera ${c.id.slice(0, 5)}` })));
          }
        } catch {
          // Camera listing query can fail if permissions not yet granted
        }

        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        const config = {
          fps: 15,
        };

        await scanner.start(
          cameraConfig,
          config,
          (decodedText: string) => {
            const trimmed = decodedText.trim();
            if (!trimmed) return;

            const now = Date.now();
            // Prevent same QR code within 2 seconds
            if (trimmed === lastScanRef.current.text && now - lastScanRef.current.time < 2000) {
              return;
            }

            lastScanRef.current = { text: trimmed, time: now };
            onScan(trimmed);
          },
          () => {
            // Frame parse error (no QR detected in frame), safe to ignore
          },
        );
      } catch (err: any) {
        console.error('Failed to start camera scanner:', err);
        const msg =
          err?.message ||
          (typeof err === 'string' ? err : 'Unable to access camera. Please verify camera permissions.');
        setErrorMessage(msg);
      } finally {
        setIsInitializing(false);
      }
    },
    [onScan, stopScanner],
  );

  // Toggle or re-start when isActive changes
  useEffect(() => {
    if (isActive) {
      startScanner(selectedCameraId || undefined);
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, selectedCameraId, startScanner, stopScanner]);

  const handleSwitchCamera = () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Scanner Viewport Container - Full Frame 16:9 / Responsive Aspect */}
      <div className="relative w-full aspect-video max-h-[380px] rounded-2xl overflow-hidden border-2 border-emerald-500/60 bg-black flex items-center justify-center shadow-2xl">
        {/* DOM node for Html5Qrcode */}
        <div
          id={containerIdRef.current}
          className="w-full h-full [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video]:!block [&_#qr-shaded-region]:!hidden [&_#qr-shaded-region]:!border-0"
        />

        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-emerald-400 gap-2 z-10">
            <RefreshCw className="h-7 w-7 animate-spin" />
            <p className="text-xs font-semibold text-slate-300">Initializing full-frame camera...</p>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-slate-950/95 text-center z-10 space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-300">Camera Access Issue</p>
              <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-700"
                onClick={() => startScanner(selectedCameraId || undefined)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Camera
              </Button>
            </div>
          </div>
        )}

        {/* Full-Frame Scanner Reticle Overlay */}
        {!isInitializing && !errorMessage && isActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-full h-full max-w-sm max-h-56 border border-emerald-400/40 rounded-2xl">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {/* Laser line animation */}
              <div className="absolute top-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse" />
            </div>
            <p className="mt-3 text-[11px] font-semibold text-emerald-300 bg-slate-950/85 px-3.5 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md shadow-md">
              Full-frame active scanner — hold card QR anywhere in view
            </p>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium text-slate-300">Live Optical Scanner</span>
          {availableCameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 ml-2 px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
            >
              <SwitchCamera className="h-3 w-3" />
              <span>Switch Camera</span>
            </button>
          )}
        </div>

        {onToggleActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(false)}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 py-1 px-2.5 h-auto"
          >
            <CameraOff className="h-3.5 w-3.5 mr-1" /> Close Camera
          </Button>
        )}
      </div>
    </div>
  );
}
