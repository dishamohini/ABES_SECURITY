import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, ShieldCheck, Inbox, CheckCircle2, XCircle, 
  Clock, Eye, User, FileText, Check, X, RefreshCw 
} from 'lucide-react';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { API_BASE_URL } from '../../config';

export const ApproverDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decoded image view modal state
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  
  // Deciding State
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/approvals/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    // Poll every 8 seconds for new visitor requests
    const interval = setInterval(fetchPendingRequests, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleDecisionSubmit = async (requestId: string) => {
    if (!decision) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/approvals/${requestId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          decision,
          message: decisionNote
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        // Clear decision panel
        setDecidingId(null);
        setDecision(null);
        setDecisionNote('');
        
        // Refresh list
        fetchPendingRequests();
      } else {
        alert(data.error || 'Failed to record decision.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-200">
      
      {/* Navbar */}
      <nav className="glass-panel border-b border-white/5 py-4 px-8 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">ABES Security Console</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{user?.name} ({user?.role})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-xs font-semibold rounded-lg transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Inbox Heading */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Inbox className="w-5 h-5 text-brand-400" /> Pending Approval Inbox
            </h2>
            <p className="text-xs text-slate-400">Review real-time visitor requests assigned to your office. View secure photos before authorization.</p>
          </div>

          <button
            onClick={fetchPendingRequests}
            disabled={isLoading}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-md font-bold text-white">Your inbox is clear!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">No pending gate entry authorization requests at this time. Incoming requests will auto-refresh.</p>
            </div>
          ) : (
            requests.map((req) => (
              <div 
                key={req.id} 
                className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-brand-500/20 transition-all flex flex-col md:flex-row gap-6 justify-between items-start"
              >
                
                {/* Visitor Details */}
                <div className="flex gap-4">
                  
                  {/* Photo Thumbnail */}
                  <div className="relative w-20 h-20 bg-slate-950 rounded-xl border border-white/5 overflow-hidden group">
                    <img 
                      src={`${API_BASE_URL}/api/visitors/face/${req.visitor.id}?token=${token}`} 
                      alt="Biometric face" 
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                      onError={(e) => {
                        // fallback if server image fails or not yet loaded
                        (e.target as any).src = 'https://via.placeholder.com/150';
                      }}
                    />
                    <button
                      onClick={() => setSelectedVisitorId(req.visitor.id)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white font-bold"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Inspect
                    </button>
                  </div>

                  {/* Details text */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">GATE REQUEST</p>
                    <h3 className="text-md font-bold text-white">{req.visitor.name}</h3>
                    <p className="text-xs text-slate-400">Phone: {req.visitor.phone} • ID: {req.visitor.aadhaarNumberMasked}</p>
                    
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700/50 uppercase">
                        Category: {req.purposeCategory}
                      </span>
                      {req.purposeDetails && (
                        <span className="bg-slate-800/40 text-slate-400 px-2 py-0.5 rounded text-[10px] italic">
                          "{req.purposeDetails}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Approver Action Panel */}
                <div className="w-full md:w-auto flex flex-col items-end gap-2.5">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Received: {new Date(req.createdAt).toLocaleTimeString()}
                  </span>

                  {decidingId === req.id ? (
                    /* Active Decision Drawer */
                    <div className="w-full bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 animate-fadeIn">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDecision('APPROVED')}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition ${
                            decision === 'APPROVED' ? 'bg-emerald-500 text-slate-950 shadow-glow' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Approve Entry
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecision('REJECTED')}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition ${
                            decision === 'REJECTED' ? 'bg-red-500 text-white shadow-glow' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Reject Entry
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold">
                          {decision === 'APPROVED' ? 'Optional Instructions (e.g. Room 204)' : 'Rejection Reason'}
                        </label>
                        <input
                          type="text"
                          placeholder={decision === 'APPROVED' ? "send to Admin Block Room 102" : "Host unavailable"}
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          className="w-full p-2 rounded glass-input text-xs"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setDecidingId(null); setDecision(null); }}
                          className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDecisionSubmit(req.id)}
                          disabled={!decision}
                          className="px-3 py-1 bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 rounded text-xs font-bold shadow-glow"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Initial Action Buttons */
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setDecidingId(req.id); setDecision('APPROVED'); }}
                        className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/35 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-inner"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => { setDecidingId(req.id); setDecision('REJECTED'); }}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/35 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </main>

      {/* Lightbox photo viewer */}
      {selectedVisitorId && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedVisitorId(null)}
        >
          <div className="max-w-md w-full glass-panel border border-white/10 rounded-2xl overflow-hidden p-3 bg-slate-900 relative">
            <h4 className="text-xs text-brand-400 font-bold uppercase mb-2">Secure Biometric Photo (Audit Logged)</h4>
            <img 
              src={`${API_BASE_URL}/api/visitors/face/${selectedVisitorId}?token=${token}`} 
              alt="Biometric Zoom" 
              className="w-full aspect-square object-cover rounded-xl border border-white/5" 
            />
            <p className="text-[10px] text-slate-500 text-center mt-2.5">All viewings of biometric images are tracked and logged in the system audit trail.</p>
          </div>
        </div>
      )}

    </div>
  );
};
