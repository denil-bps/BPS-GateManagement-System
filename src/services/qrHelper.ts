// QR Code helper and audio feedback for Birla Public School Golden Gate
import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string, size = 300): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#012758',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.warn('[QR] Error generating QR code with library, fallbacking:', err);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#012758';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.fillStyle = '#012758';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, size / 2, size / 2);
    return canvas.toDataURL('image/png');
  }
}

export async function renderQrToCanvas(canvas: HTMLCanvasElement, text: string, size = 300): Promise<void> {
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#012758',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.warn('[QR] Canvas render error:', err);
  }
}

export function playGateBeep(type: 'SUCCESS' | 'ALERT' | 'OUT' | 'IN') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'SUCCESS' || type === 'IN') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12); // D6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'OUT') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } else {
      // Alert / Block
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    }
  } catch {
    // audio failure fallback silent
  }
}

// Lightweight Barcode / QR frame scanning analyzer
export function scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  try {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return null;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return null;
  } catch {
    return null;
  }
}
