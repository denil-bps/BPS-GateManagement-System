import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, SwitchCamera, Upload, CheckCircle2, QrCode } from 'lucide-react';
import jsQR from 'jsqr';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [detectedFeedback, setDetectedFeedback] = useState<string | null>(null);

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
    if (!data || !data.trim()) return;
    const cleanData = data.trim();
    playGateBeep('SUCCESS');
    setDetectedFeedback(cleanData);

    // Stop scanning loop
    stopCamera();

    // Broadcast immediate detection to Monitor 2
    StorageService.broadcastPublicDisplay({
      mode: 'SCANNER_DETECTED',
      timestamp: Date.now(),
      scanner: {
        statusText: `QR CODE DETECTED · ${cleanData}`,
        isDetected: true,
        detectedCode: cleanData,
      },
      activeActionLabel: `QR Code Verified: ${cleanData}`,
    });

    // Small delay for visual feedback before opening processed modal
    setTimeout(() => {
      onScanSuccess(cleanData);
    }, 280);
  }, [stopCamera, onScanSuccess]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setDetectedFeedback(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Webcam access not supported on this browser context.');
        return;
      }

      // Stop any existing stream before switching
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        setHasCamera(true);
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      // If environment camera failed, try user camera fallback
      if (facingMode === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
            setIsScanning(true);
            setHasCamera(true);
            return;
          }
        } catch {
          // continue to error below
        }
      }
      setHasCamera(false);
      setCameraError('Webcam permission denied or camera device in use. You can use direct entry or student selection below.');
    }
  }, [facingMode]);

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

  // Continuous high-speed scanning loop using dual-engine decoder
  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (!active || !isScanning) return;

      if (
        videoRef.current &&
        canvasRef.current &&
        videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0
      ) {
        try {
          const qrResult = await scanVideoFrame(videoRef.current, canvasRef.current);
          if (qrResult && qrResult.trim()) {
            handleDetected(qrResult.trim());
            return;
          }
        } catch (err) {
          console.warn('[Scanner] Frame decode warning:', err);
        }
      }

      if (active && isScanning) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isScanning, handleDetected]);

  // Handle uploaded image containing QR code
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.onload = async () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        // Analyze via jsQR
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data && code.data.trim()) {
          handleDetected(code.data.trim());
        } else {
          alert('No valid QR code detected in the uploaded image. Please try another image or enter manually.');
        }
      };
      img.src = URL.createObjectURL(file);
    } catch {
      alert('Failed to process uploaded image file.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-[#d5e0eb] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#012758] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#073a7d] rounded-xl border border-[#fda31b]/30">
              <Camera className="w-5 h-5 text-[#fda31b]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>Instant QR & Barcode Scanner</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  LIVE DECODER
                </span>
              </h3>
              <p className="text-xs text-[#d5e0eb]">
                Birla Public School · Golden Gate Security Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasCamera && !cameraError && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                title="Switch Camera"
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
              >
                <SwitchCamera className="w-4 h-4 text-[#fda31b]" />
                <span className="hidden sm:inline">Flip</span>
              </button>
            )}

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Scanner Area */}
        <div className="relative bg-slate-950 flex items-center justify-center min-h-[300px] sm:min-h-[340px] overflow-hidden">
          {hasCamera && !cameraError ? (
            <div className="relative w-full h-[320px] sm:h-[360px] flex items-center justify-center bg-black">
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
                <div className="w-60 h-60 sm:w-68 sm:h-68 border-2 border-[#fda31b]/90 rounded-2xl relative shadow-[0_0_25px_rgba(253,163,27,0.45)]">
                  {/* Corner Markers */}
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-[#fda31b] -mt-1 -ml-1 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-[#fda31b] -mt-1 -mr-1 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-[#fda31b] -mb-1 -ml-1 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-[#fda31b] -mb-1 -mr-1 rounded-br-lg" />

                  {/* Laser Sweeper Bar */}
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#fda31b] to-transparent animate-bounce mt-30 sm:mt-34 opacity-90 shadow-[0_0_10px_#fda31b]" />

                  {/* Center Target Crosshairs */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <QrCode className="w-16 h-16 text-[#fda31b]" />
                  </div>
                </div>
              </div>

              {/* Detection Feedback Overlay */}
              {detectedFeedback && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-in fade-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 animate-bounce" />
                  <h4 className="text-xl font-black font-crest tracking-wide text-white">QR CODE DETECTED</h4>
                  <p className="text-sm font-mono text-emerald-200 mt-1 max-w-sm truncate px-4">
                    {detectedFeedback}
                  </p>
                  <p className="text-xs text-emerald-300/80 mt-2">Opening student pass record...</p>
                </div>
              )}

              {/* Live Guidance Banner */}
              <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none px-4">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#012758]/90 text-white text-xs font-mono border border-[#fda31b]/60 backdrop-blur-md shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Hold QR Code or ID Card facing camera</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center max-w-md bg-slate-900 w-full">
              <div className="w-14 h-14 rounded-2xl bg-[#19558a]/30 text-[#fda31b] flex items-center justify-center mx-auto mb-3 border border-[#fda31b]/30">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-100 mb-1">
                Camera Stream Unavailable
              </p>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {cameraError || 'Webcam stream could not be started in this browser context.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer border border-[#fda31b]/40 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#fda31b]" />
                  <span>Retry Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#fda31b]" />
                  <span>Upload QR Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls & Manual Input Bar */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#d5e0eb] space-y-4">
          
          {/* File Upload Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#012758]">
                Type or Scan Admission No. / Student ID / Gate Pass:
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-[#19558a] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3 text-[#fda31b]" />
                <span>Upload QR Image</span>
              </button>
            </div>

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
                placeholder="e.g. 12045, BPSST5000001, GP-94821, or VP-1001"
                className="flex-1 bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#012758] focus:bg-white font-mono shadow-xs"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
              >
                Open Record
              </button>
            </form>
          </div>

          {/* Quick Picker for Registered Students in Database */}
          {availableStudents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#19558a] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#fda31b]" />
                  One-Click Student Selector (Instant Verification):
                </span>
                <span className="text-[10px] text-[#688099]">Click to process instantly</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableStudents.slice(0, 4).map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleDetected(student.admissionNo || student.qrId || student.id)}
                    className="p-2.5 rounded-xl bg-[#f5f9fc] hover:bg-[#e8f1fa] border border-[#d5e0eb] hover:border-[#012758] text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 mb-1 justify-between">
                      <span className="text-xs font-bold text-[#012758] truncate">
                        {student.name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        student.status === 'OUTSIDE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
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
