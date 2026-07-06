import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Send, Check, X } from 'lucide-react';
import abesLogo from '../assets/abes_logo.png';
import { API_BASE_URL } from '../config';

interface PublicApprovalPageProps {
  requestId: string;
}

export const PublicApprovalPage: React.FC<PublicApprovalPageProps> = ({ requestId }) => {
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decision State
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [message, setMessage] = useState('');
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const fetchRequestDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/visitors/request/${requestId}/public`);
      const data = await res.json();
      if (res.ok) {
        setRequest(data);
      } else {
        throw new Error(data.error || 'Failed to load request details.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/visitors/request/${requestId}/public-decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, message })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessStatus(decision);
      } else {
        throw new Error(data.error || 'Failed to submit decision.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-400 p-4">
        <RefreshCw className="w-10 h-10 animate-spin text-brand-500 mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">Fetching request parameters...</p>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-red-500/20 text-center space-y-4">
          <div className="inline-flex p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">Verification Link Expired</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This visitor authorization request link is invalid, expired, or has already been deleted by the gate agent.
          </p>
        </div>
      </div>
    );
  }

  if (successStatus) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-4">
          {successStatus === 'APPROVED' ? (
            <>
              <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-emerald-400">ENTRY AUTHORIZED</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The visitor's check-in has been successfully approved. The security guard at the gate has been notified in real time.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-red-400">ENTRY REJECTED</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                You have denied entry for this visitor. The gate security officer has been notified.
              </p>
            </>
          )}
          <div className="pt-2">
            <span className="text-[10px] text-slate-500 font-mono">You can close this tab/window now.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden text-slate-200">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Branded Header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <img src={abesLogo} alt="ABES Logo" className="h-12 w-auto object-contain" />
        </div>
        <div>
          <h1 className="text-md font-bold text-white tracking-wide uppercase">ABES Security Console</h1>
          <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Gate Quick Approval Portal</p>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md glass-panel p-6 rounded-2xl shadow-glass border border-white/10 relative space-y-6">
        
        {/* Verification banner */}
        <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg text-center space-y-1">
          <p className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> ACTION REQUIRED: PENDING VISITOR
          </p>
        </div>

        {/* Visitor Card */}
        <div className="flex gap-4 p-4 bg-slate-950/70 border border-white/5 rounded-xl">
          {/* Biometric Photo */}
          <div className="w-20 h-20 bg-slate-900 rounded-lg overflow-hidden border border-white/5 shrink-0">
            <img 
              src={`${API_BASE_URL}/api/visitors/face/${request.visitor.id}`} 
              alt="Visitor Face" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                (e.target as any).src = 'https://via.placeholder.com/150';
              }}
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="text-[9px] text-brand-400 font-bold uppercase tracking-wider">Visitor Profile</p>
            <h3 className="font-bold text-white text-md truncate">{request.visitor.name}</h3>
            <p className="text-xs text-slate-400 truncate">Phone: {request.visitor.phone}</p>
            
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-slate-700/50 uppercase">
                {request.purposeCategory}
              </span>
              {request.purposeDetails && (
                <span className="bg-slate-800/40 text-slate-450 px-1.5 py-0.5 rounded text-[9px] italic max-w-[120px] truncate">
                  "{request.purposeDetails}"
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Host Details */}
        <div className="text-xs space-y-1 border-t border-slate-850 pt-4">
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Assigned Host (You)</p>
          <p className="font-bold text-slate-200">{request.approver?.name}</p>
          <p className="text-slate-450 text-[10px]">
            {request.approver?.post || 'Faculty Member'} • {request.approver?.department || 'ABES Engineering College'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {/* Decision Form */}
        <form onSubmit={handleDecisionSubmit} className="space-y-4 border-t border-slate-850 pt-4">
          {!decision ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className="flex-1 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" /> Reject Entry
              </button>
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-glow"
              >
                <Check className="w-4 h-4" /> Approve Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {decision === 'APPROVED' ? 'Optional Instructions (e.g. Room No.)' : 'Reason for rejection'}
                </span>
                <button
                  type="button"
                  onClick={() => setDecision(null)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold"
                >
                  Change Decision
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={decision === 'APPROVED' ? "e.g., Room 104, admin block" : "e.g., Host busy / unavailable"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-lg glass-input text-xs pr-10"
                  required={decision === 'REJECTED'}
                  disabled={submitting}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={submitting || (decision === 'REJECTED' && !message)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-md transition"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};
