import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { scanVideoFrame, playGateBeep } from '../../services/qrHelper';
import { StorageService } from '../../services/storage';
import { Student } from '../../types';

interface WebcamScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrCode: string) => void;
  availableStudents: Student[];
}

export const WebcamScannerModal: React.FC<WebcamScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  availableStudents,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleDetected = useCallback((data: string) => {
    playGateBeep('SUCCESS');
    stopCamera();
    StorageService.broadcastPublicDisplay({
      mode: 'SCANNER_DETECTED',
      timestamp: Date.now(),
      scanner: {
        statusText: 'QR CODE SCANNED SUCCESSFULLY',
        isDetected: true,
        detectedCode: data,
      },
      activeActionLabel: `QR Code Detected: ${data}`,
    });
    onScanSuccess(data);
  }, [stopCamera, onScanSuccess]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Webcam access not supported on this browser context.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setHasCamera(false);
      setCameraError('Webcam permission denied or camera device in use. You can use direct entry or student selection below.');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    StorageService.broadcastPublicDisplay({
      mode: 'SCANNER_ACTIVE',
      timestamp: Date.now(),
      scanner: {
        statusText: 'LIVE CAMERA SCANNER ACTIVE · AWAITING QR CODE',
        isDetected: false,
      },
      activeActionLabel: 'Guard Terminal opened Live QR & Barcode Scanner',
    });
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active || !isScanning) return;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const qrResult = scanVideoFrame(videoRef.current, canvasRef.current);
        if (qrResult) {
          handleDetected(qrResult);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, handleDetected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-[#d5e0eb] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#012758] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#073a7d] rounded-lg">
              <Camera className="w-5 h-5 text-[#fda31b]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                Live QR & Barcode Scanner
              </h3>
              <p className="text-xs text-[#d5e0eb]">
                Birla Public School · Golden Gate Desk
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Scanner Area */}
        <div className="relative bg-slate-950 flex items-center justify-center min-h-[280px] sm:min-h-[320px] overflow-hidden">
          {hasCamera && !cameraError ? (
            <div className="relative w-full h-[300px] sm:h-[340px] flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Graphic in Golden Amber & Navy */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-[#fda31b]/80 rounded-xl relative shadow-[0_0_15px_rgba(253,163,27,0.35)]">
                  {/* Corner Markers */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#fda31b] -mt-1 -ml-1" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#fda31b] -mt-1 -mr-1" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#fda31b] -mb-1 -ml-1" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#fda31b] -mb-1 -mr-1" />

                  {/* Laser Sweeper */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#fda31b] to-transparent animate-bounce mt-28 sm:mt-32 opacity-85" />
                </div>
              </div>

              <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                <span className="inline-block px-3 py-1 rounded-full bg-[#012758]/90 text-white text-xs font-mono border border-[#fda31b]/50 backdrop-blur-sm">
                  Aim camera at Student ID QR code
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center max-w-md bg-slate-900">
              <div className="w-12 h-12 rounded-full bg-[#19558a]/30 text-[#fda31b] flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Camera Unavailable
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {cameraError || 'Webcam stream could not be started.'}
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Quick Type / Manual Entry Bar */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#d5e0eb] space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#012758] mb-1.5">
              Type or Scan Admission No. / Student ID / QR Code:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) {
                  handleDetected(manualCode.trim());
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 12455, BPSST5012455, or QR-BPS-12455"
                className="flex-1 bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#012758] focus:bg-white font-mono shadow-xs"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
              >
                Process Code
              </button>
            </form>
          </div>

          {/* Quick Picker for Registered Students in Database */}
          {availableStudents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#19558a] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#fda31b]" />
                  Select Registered Student from Database:
                </span>
                <span className="text-[10px] text-[#688099]">Click to process</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableStudents.slice(0, 4).map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleDetected(student.qrId || student.admissionNo)}
                    className="p-2 rounded-lg bg-[#f5f9fc] hover:bg-[#e8f1fa] border border-[#d5e0eb] hover:border-[#012758] text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-[#012758] truncate">
                        {student.name}
                      </span>
                      <span className="text-[9px] px-1 rounded font-mono font-bold bg-[#fff3d9] text-[#9d6500]">
                        {student.status === 'OUTSIDE' ? 'OUT' : 'IN'}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[#688099] truncate">
                      {student.house} · {student.admissionNo}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
