import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { QRScanner } from '../../components/QRScanner';
import { 
  LogOut, ShieldAlert, CheckCircle2, CloudLightning, Wifi, WifiOff, 
  MapPin, UserPlus, LogIn, FileSpreadsheet, RefreshCw, AlertTriangle 
} from 'lucide-react';

interface ScanResult {
  success: boolean;
  blocked?: boolean;
  offline?: boolean;
  name?: string;
  direction?: 'IN' | 'OUT';
  message: string;
  timestamp: string;
  overstayAlert?: boolean;
  plateMismatchAlert?: boolean;
  cardholder?: any;
  vehicle?: any;
}

export const GuardDashboard: React.FC<{ 
  onNavigate: (page: string) => void;
}> = ({ onNavigate }) => {
  const { user, logout, token } = useAuth();
  const { isOnline, queuedLogs, queueLog, syncLogs, isSyncing } = useOffline();
  
  const [gates, setGates] = useState<any[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [pendingVisits, setPendingVisits] = useState<any[]>([]);

  // Fetch Gates
  useEffect(() => {
    const fetchGates = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/gates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setGates(data);
          if (data.length > 0) {
            setSelectedGateId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchGates();
  }, [token]);

  // Periodically fetch pending visitor requests to display real-time status alerts
  useEffect(() => {
    const fetchPendingVisits = async () => {
      if (!isOnline || !token) return;
      try {
        const res = await fetch('http://localhost:5000/api/approvals/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          // If the logged in user is guard, we show all pending/approved visits that are not checked in
          setPendingVisits(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPendingVisits();
    const interval = setInterval(fetchPendingVisits, 5000);
    return () => clearInterval(interval);
  }, [isOnline, token]);

  const handleScanSuccess = async (type: 'CARD' | 'STICKER', value: string) => {
    if (!selectedGateId) {
      alert('Please select a gate first.');
      return;
    }
    
    setIsLoading(true);
    setScanResult(null);

    const payload = type === 'CARD' 
      ? { idCardNumber: value, gateId: selectedGateId }
      : { stickerNumber: value, gateId: selectedGateId };

    try {
      const data = await queueLog(type, payload);
      setScanResult(data);
      
      // Add to local guard scan history log
      setScanHistory(prev => [
        {
          id: data.timestamp || Date.now().toString(),
          type: type === 'CARD' ? 'Cardholder ID' : 'Vehicle Sticker',
          identifier: value,
          name: data.cardholder?.name || data.vehicle?.plateNumber || value,
          direction: data.direction,
          status: data.blocked ? 'BLOCKED' : 'SUCCESS',
          timestamp: new Date().toLocaleTimeString(),
          message: data.message
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'Validation error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGateName = () => {
    const g = gates.find(gate => gate.id === selectedGateId);
    return g ? g.name : 'Unknown Gate';
  };

  return (
    <div className="min-h-screen bg-[#070b13] pb-24 text-slate-200">
      
      {/* Header bar */}
      <header className="glass-panel sticky top-0 z-40 border-b border-white/5 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md font-bold text-white tracking-tight">ABES Gate Control</h1>
            <p className="text-[10px] text-slate-400 font-semibold">{user?.name} (Guard)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Offline Sync Status Indicator */}
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
              <Wifi className="w-3.5 h-3.5" /> Online
            </div>
          ) : (
            <button
              onClick={() => alert(`Offline Mode: ${queuedLogs.length} logs waiting to sync.`)}
              className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse"
            >
              <WifiOff className="w-3.5 h-3.5" /> Offline ({queuedLogs.length})
            </button>
          )}

          {queuedLogs.length > 0 && isOnline && (
            <button
              onClick={syncLogs}
              disabled={isSyncing}
              className="p-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 rounded-lg transition"
              title="Sync offline logs"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={logout}
            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-xl transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Offline Warning Banner */}
        {queuedLogs.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 text-amber-200">
            <div className="flex items-center gap-2">
              <CloudLightning className="w-5 h-5 text-amber-400 animate-bounce" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Unsynced offline scans</p>
                <p className="text-[10px] text-amber-300/80 mt-0.5">There are {queuedLogs.length} cardholder entry logs saved locally.</p>
              </div>
            </div>
            {isOnline && (
              <button
                onClick={syncLogs}
                disabled={isSyncing}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded uppercase transition"
              >
                Sync Now
              </button>
            )}
          </div>
        )}

        {/* Gate Selection Widget */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-400" /> Active Gate Assignment
          </label>
          <select
            value={selectedGateId}
            onChange={(e) => setSelectedGateId(e.target.value)}
            className="w-full py-2.5 px-3 rounded-lg glass-input text-sm"
          >
            {gates.map((g) => (
              <option key={g.id} value={g.id} className="bg-slate-950">
                {g.name} ({g.location || 'No Location'})
              </option>
            ))}
          </select>
        </div>

        {/* Quick navigation to visitor flows */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('visitor-form')}
            className="glass-panel hover:bg-slate-800/80 p-4 rounded-2xl border border-white/5 hover:border-brand-500/40 text-center space-y-2 group transition"
          >
            <div className="inline-flex p-3 bg-brand-500/10 text-brand-400 group-hover:scale-110 transition rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-white">Register Visitor</p>
            <p className="text-[9px] text-slate-500">New visitor check-in flow</p>
          </button>

          <button
            onClick={() => onNavigate('exit-scan')}
            className="glass-panel hover:bg-slate-800/80 p-4 rounded-2xl border border-white/5 hover:border-brand-500/40 text-center space-y-2 group transition"
          >
            <div className="inline-flex p-3 bg-brand-500/10 text-brand-400 group-hover:scale-110 transition rounded-xl">
              <LogIn className="w-5 h-5 rotate-180" />
            </div>
            <p className="text-xs font-semibold text-white">Visitor Exit Scan</p>
            <p className="text-[9px] text-slate-500">Biometric checkout match</p>
          </button>
        </div>

        {/* Scan Results View */}
        {scanResult && (
          <div className={`p-4 rounded-2xl border transition-all duration-300 animate-fadeIn ${
            scanResult.blocked 
              ? 'bg-red-500/10 border-red-500/30 text-red-200' 
              : !scanResult.success 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            <div className="flex gap-3">
              {scanResult.blocked ? (
                <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" />
              ) : !scanResult.success ? (
                <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              )}
              
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold tracking-wider">
                  {scanResult.blocked ? 'ENTRY BLOCKED' : scanResult.offline ? 'LOGGED OFFLINE' : 'SCAN SUCCESS'}
                </p>
                <p className="text-sm font-semibold">{scanResult.message}</p>
                
                {scanResult.success && scanResult.cardholder && (
                  <div className="text-xs text-emerald-300/80 mt-1.5 space-y-0.5">
                    <p>Name: <span className="font-bold text-white">{scanResult.cardholder.name}</span></p>
                    <p>Department: {scanResult.cardholder.department}</p>
                    <p>Direction: <span className="font-bold text-white uppercase">{scanResult.direction}</span></p>
                  </div>
                )}

                {scanResult.success && scanResult.vehicle && (
                  <div className="text-xs text-emerald-300/80 mt-1.5 space-y-0.5">
                    <p>Plate: <span className="font-bold text-white">{scanResult.vehicle.plateNumber}</span></p>
                    <p>Owner: {scanResult.vehicle.owner?.name || 'Visitor/Vendor'}</p>
                    <p>Direction: <span className="font-bold text-white uppercase">{scanResult.direction}</span></p>
                  </div>
                )}

                {scanResult.overstayAlert && (
                  <div className="mt-2 bg-red-500/20 text-red-200 border border-red-500/40 p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    OVERSTAY ALERT: Exceeded max allowed inside duration!
                  </div>
                )}

                {scanResult.plateMismatchAlert && (
                  <div className="mt-2 bg-amber-500/20 text-amber-200 border border-amber-500/40 p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    MISMATCH ALERT: Plate scanned does not match sticker plate!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scan Camera QR/Barcode */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <LogIn className="w-4 h-4 text-brand-400" /> Gate QR & Sticker Scanner
          </h3>
          <QRScanner onScanSuccess={handleScanSuccess} isLoading={isLoading} />
        </div>

        {/* Pending Visitor Requests Inbox for Gate */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-400" /> Live Visitor Approvals
            </h3>
            <span className="text-[10px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full font-bold">
              {pendingVisits.length} Requests
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pendingVisits.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">No pending visitors at this moment.</p>
            ) : (
              pendingVisits.map((req) => (
                <div 
                  key={req.id} 
                  className="p-3 bg-slate-950 border border-white/5 rounded-xl flex justify-between items-center text-xs hover:border-brand-500/30 transition"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-200">{req.visitor.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Purpose: <span className="font-semibold text-brand-400">{req.purposeCategory}</span>
                    </p>
                    {req.approver && (
                      <p className="text-[9px] text-slate-500">Approver: {req.approver.name}</p>
                    )}
                  </div>
                  
                  {/* Visual indication if they can proceed (i.e. if already APPROVED, show Check In button!) */}
                  {req.status === 'APPROVED' ? (
                    <button
                      onClick={() => {
                        // Navigate directly to check-in or run a quick check-in API
                        onNavigate(`visitor-checkin:${req.id}`);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg uppercase tracking-wider text-[9px] shadow-glow"
                    >
                      Check In
                    </button>
                  ) : (
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold uppercase tracking-wider">
                      Pending HOD
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scan Log History */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Recent Logs at {getGateName()}</h3>
          <div className="space-y-2.5">
            {scanHistory.length === 0 ? (
              <p className="text-center text-xs text-slate-600 py-2">No scans recorded in this session.</p>
            ) : (
              scanHistory.map((h) => (
                <div key={h.id} className="flex justify-between items-start text-xs border-b border-slate-800/60 pb-2">
                  <div>
                    <p className="font-semibold text-slate-300">{h.name}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{h.type} • {h.timestamp}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      h.direction === 'IN' 
                        ? 'bg-emerald-500/15 text-emerald-400' 
                        : h.direction === 'OUT' 
                          ? 'bg-amber-500/15 text-amber-400' 
                          : 'bg-red-500/15 text-red-400'
                    }`}>
                      {h.direction || h.status}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5">{h.direction ? 'Success' : 'Access Denied'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
