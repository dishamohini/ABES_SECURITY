import React, { useState } from 'react';
import { QrCode, Search, Radio, CheckCircle, AlertTriangle, Play } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (type: 'CARD' | 'STICKER', value: string) => void;
  isLoading: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, isLoading }) => {
  const [manualInput, setManualInput] = useState('');
  const [scanType, setScanType] = useState<'CARD' | 'STICKER'>('CARD');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Seeded mock cards from our DB for easy guard scan-clicks
  const mockStudents = [
    { id: 'ABES2026CS101', name: 'Aarav Mehta (Student - Active)' },
    { id: 'ABES2026IT205', name: 'Isha Patel (Student - Active)' },
    { id: 'ABES2026EC032', name: 'Rohan Sharma (Student - SUSPENDED)' },
    { id: 'ABESEMP204', name: 'Verghese Kurien (Staff - Active)' },
  ];

  const mockVehicles = [
    { sticker: 'STK2026A99', name: 'UP-16-AB-1234 (Aarav - Active)' },
    { sticker: 'STK2026B88', name: 'DL-3C-CD-5678 (Isha - Active)' },
    { sticker: 'STK2026C77', name: 'UP-14-XY-9999 (Rohan - INACTIVE Sticker)' },
    { sticker: 'STK2026DELIVERY', name: 'MH-12-PQ-8888 (Delivery - Active)' },
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onScanSuccess(scanType, manualInput.trim());
    setManualInput('');
  };

  const startCameraSim = () => {
    setIsCameraActive(true);
    // In a real device, this would call html5-qrcode.
    // For local testing, we simulate a camera feed with a scanning laser animation
    // and let the user select a mock scan value or auto-scan after 2 seconds.
  };

  const stopCameraSim = () => {
    setIsCameraActive(false);
  };

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => { setScanType('CARD'); stopCameraSim(); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            scanType === 'CARD'
              ? 'bg-brand-500 text-white shadow-glow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Student / Staff ID Card
        </button>
        <button
          type="button"
          onClick={() => { setScanType('STICKER'); stopCameraSim(); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            scanType === 'STICKER'
              ? 'bg-brand-500 text-white shadow-glow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Vehicle QR Sticker
        </button>
      </div>

      {/* Simulated Scanner / Camera Preview */}
      {isCameraActive ? (
        <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-brand-500/30 scanning-glow">
          {/* Laser Scan line */}
          <div className="scanner-laser-line" />

          {/* Camera UI Elements */}
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex justify-between items-center text-xs text-brand-400 font-semibold bg-slate-900/80 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-2" />
              LIVE CAMERA STREAMING (SIMULATED)
            </div>
            
            {/* Center target box */}
            <div className="self-center w-40 h-40 border-2 border-brand-400 border-dashed rounded-lg flex items-center justify-center bg-brand-500/5">
              <QrCode className="w-12 h-12 text-brand-400 animate-pulse" />
            </div>

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={stopCameraSim}
                className="px-4 py-2 bg-slate-900/90 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
              >
                Close Camera
              </button>
            </div>
          </div>

          {/* Overlay to click-simulate a code detection */}
          <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
            <p className="text-white text-sm font-semibold mb-3">Select a Mock Target to Scan:</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {(scanType === 'CARD' ? mockStudents : mockVehicles).map((mock) => (
                <button
                  key={scanType === 'CARD' ? (mock as any).id : (mock as any).sticker}
                  type="button"
                  onClick={() => {
                    onScanSuccess(scanType, scanType === 'CARD' ? (mock as any).id : (mock as any).sticker);
                    setIsCameraActive(false);
                  }}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-[10px] p-2 rounded transition font-medium truncate"
                >
                  {(mock as any).name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-video rounded-xl bg-slate-900/40 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center p-6">
          <QrCode className="w-16 h-16 text-slate-500 mb-4 animate-pulse" />
          <p className="text-slate-300 font-semibold mb-1">Gate Camera QR Scanner</p>
          <p className="text-xs text-slate-500 max-w-xs mb-4">Scan card barcodes or vehicle stickers directly using the gate operator's device camera.</p>
          <button
            type="button"
            onClick={startCameraSim}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-glow transition-all"
          >
            <Play className="w-4 h-4 fill-white" /> Start Scanner
          </button>
        </div>
      )}

      {/* Manual lookup fallback */}
      <form onSubmit={handleManualSubmit} className="space-y-2">
        <label className="text-xs text-slate-400 font-medium">Manual Identification Fallback</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              placeholder={scanType === 'CARD' ? "Enter Card ID (e.g., ABES2026CS101)" : "Enter Sticker Number (e.g., STK2026A99)"}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !manualInput.trim()}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            Verify
          </button>
        </div>
      </form>

      {/* Quick Test Links for convenience */}
      {!isCameraActive && (
        <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Quick Simulators (Click to Scan)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(scanType === 'CARD' ? mockStudents : mockVehicles).map((mock) => (
              <button
                key={scanType === 'CARD' ? (mock as any).id : (mock as any).sticker}
                type="button"
                onClick={() => onScanSuccess(scanType, scanType === 'CARD' ? (mock as any).id : (mock as any).sticker)}
                disabled={isLoading}
                className="flex items-center justify-between text-left p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-brand-500/50 hover:bg-slate-800 text-xs text-slate-300 transition"
              >
                <span className="font-semibold truncate mr-2">{(mock as any).name}</span>
                <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded shrink-0 font-medium">Scan</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
