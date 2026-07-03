import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CameraCapture } from '../../components/CameraCapture';
import { VisitorPass } from '../../components/VisitorPass';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, UserCheck, Eye, Search, 
  HelpCircle, Clock, AlertTriangle, XCircle, Printer 
} from 'lucide-react';

export const VisitorForm: React.FC<{ 
  onBack: () => void;
  overrideRequestId?: string;
}> = ({ onBack, overrideRequestId }) => {
  const { token } = useAuth();
  
  // Step State: 1 = Consent, 2 = Face, 3 = Aadhaar/OCR, 4 = Details/Purpose, 5 = Polling/Complete
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [facePhoto, setFacePhoto] = useState('');
  const [aadhaarPhoto, setAadhaarPhoto] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  
  const [purposeCategory, setPurposeCategory] = useState('MEETING');
  const [purposeDetails, setPurposeDetails] = useState('');
  
  // Faculty Search Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [selectedHostName, setSelectedHostName] = useState<string>('');

  // Active visit request & polling state
  const [visitRequest, setVisitRequest] = useState<any | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'>('PENDING');
  const [pollingIntervalId, setPollingIntervalId] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  
  // Active gate
  const [gates, setGates] = useState<any[]>([]);
  const [activeGateId, setActiveGateId] = useState('');

  // Fetch gates
  useEffect(() => {
    const fetchGates = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/gates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.length > 0) {
          setGates(data);
          setActiveGateId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchGates();
  }, [token]);

  // Load request directly if overriding (e.g. check-in from dashboard list)
  useEffect(() => {
    if (overrideRequestId) {
      loadExistingRequest(overrideRequestId);
    }
  }, [overrideRequestId]);

  const loadExistingRequest = async (reqId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/visitors/request/${reqId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setVisitRequest(data);
        setPollingStatus(data.status);
        setStep(5);
        startPolling(reqId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search Host Directory
  useEffect(() => {
    const searchHosts = async () => {
      if (searchQuery.trim().length < 2) {
        setDirectoryUsers([]);
        return;
      }
      try {
        const res = await fetch(`http://localhost:5000/api/auth/directory?query=${searchQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setDirectoryUsers(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    const debounce = setTimeout(searchHosts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, token]);

  const handleConsentSubmit = () => {
    if (!consentAccepted) return;
    setStep(2);
  };

  const handleFaceCaptured = (base64: string) => {
    setFacePhoto(base64);
  };

  const handleAadhaarCaptured = async (base64: string) => {
    setAadhaarPhoto(base64);
    if (!base64) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Call OCR endpoint
      const res = await fetch('http://localhost:5000/api/visitors/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OCR Extraction failed');
      }

      // Populate details
      setName(data.name || '');
      setAadhaarNumber(data.aadhaarNumber || '');
      setStep(4); // Automatically transition to form entry step
    } catch (err: any) {
      setError('OCR extraction failed. Please enter details manually.');
      setStep(4); // Advance anyway to allow manual typing
    } finally {
      setIsLoading(false);
    }
  };

  const selectHostUser = (host: any) => {
    setSelectedHostId(host.id);
    setSelectedHostName(`${host.name} (${host.department})`);
    setDirectoryUsers([]);
    setSearchQuery('');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !aadhaarNumber || !facePhoto || !activeGateId) {
      setError('Please fill in all details and capture biometrics.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      name,
      phone,
      consentAccepted,
      purposeCategory,
      purposeDetails,
      hostUserId: purposeCategory === 'MEETING' ? selectedHostId : undefined,
      facePhotoBase64: facePhoto,
      aadhaarNumber,
      gateId: activeGateId
    };

    try {
      const res = await fetch('http://localhost:5000/api/visitors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setVisitRequest(data.request);
      setPollingStatus('PENDING');
      setStep(5);
      
      // Start polling status
      startPolling(data.request.id);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (requestId: string) => {
    // Clear previous polling if any
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    const id = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/visitors/request/${requestId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setPollingStatus(data.status);
          setVisitRequest(data); // update request with messages (approvalMessage)
          
          if (data.status !== 'PENDING') {
            clearInterval(id);
          }
        }
      } catch (err) {
        console.error('Error polling request status:', err);
      }
    }, 4000);

    setPollingIntervalId(id);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
    };
  }, [pollingIntervalId]);

  const handleGuardOverride = async () => {
    if (!visitRequest) return;
    const hostName = visitRequest.approver?.name || 'Concerned Person';
    const note = window.prompt(
      `Enter verbal approval notes (e.g. "Approved verbally on call by ${hostName}"):`,
      `Approved verbally on call by ${hostName}`
    );
    if (note === null) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/approvals/${visitRequest.id}/guard-override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: note })
      });
      const data = await res.json();
      if (res.ok) {
        setPollingStatus('APPROVED');
        loadExistingRequest(visitRequest.id);
      } else {
        setError(data.error || 'Failed to log guard override.');
      }
    } catch (err) {
      setError('Connection error logging override.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!visitRequest || !activeGateId) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/visitors/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: visitRequest.id, gateId: activeGateId })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onBack();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] pb-24 text-slate-200">
      
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-white/5 py-4 px-6 flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-md font-bold text-white tracking-tight">
          {overrideRequestId ? 'Visitor Approval Status' : 'New Visitor Registration'}
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Progress Indicator */}
        {!overrideRequestId && step < 5 && (
          <div className="flex justify-between items-center bg-slate-900/40 p-3.5 rounded-xl border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span className={step >= 1 ? 'text-brand-400' : ''}>1. Consent</span>
            <span>•</span>
            <span className={step >= 2 ? 'text-brand-400' : ''}>2. Face</span>
            <span>•</span>
            <span className={step >= 3 ? 'text-brand-400' : ''}>3. ID Scan</span>
            <span>•</span>
            <span className={step >= 4 ? 'text-brand-400' : ''}>4. Details</span>
          </div>
        )}

        {/* STEP 1: CONSENT */}
        {step === 1 && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 animate-fadeIn">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Visitor Consent Acknowledgment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                To maintain college gate security and comply with data privacy directives, we require visitor consent to collect biometric face capture and national identification number.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest">Compliance Notice</h4>
              <ul className="text-[10px] text-slate-400 space-y-2 list-disc pl-4">
                <li>Biometric face signatures and ID images are encrypted (AES-256) at rest.</li>
                <li>Your details will only be used to authorize entry/exit at the campus gates.</li>
                <li>Biometric records are automatically scrubbed from database servers after 90 days.</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-brand-500/30 transition cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-brand-500 accent-brand-500 bg-slate-950 border-white/10"
              />
              <span className="text-xs text-slate-300 leading-relaxed font-semibold">
                I accept consent for security face capture and ID verification.
              </span>
            </label>

            <button
              onClick={handleConsentSubmit}
              disabled={!consentAccepted}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-glow transition uppercase tracking-wider text-xs"
            >
              Continue to Face Capture
            </button>
          </div>
        )}

        {/* STEP 2: FACE CAPTURE */}
        {step === 2 && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Biometric Face Capture</h3>
              <p className="text-xs text-slate-400">Capture a live face photo of the visitor. Album/gallery uploads are disabled to block spoofing.</p>
            </div>

            <CameraCapture onCapture={handleFaceCaptured} title="Visitor Face Photo" type="face" />

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs uppercase"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!facePhoto}
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-glow text-xs uppercase"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ID PROOF CAPTURE & OCR */}
        {step === 3 && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">ID Proof Scanner (OCR / Image)</h3>
              <p className="text-xs text-slate-400">Capture a photo of the visitor's ID card (Aadhaar, PAN, DL, or any college/company ID) to proceed.</p>
            </div>

            <CameraCapture onCapture={handleAadhaarCaptured} title="ID Proof Document" type="aadhaar" />

            {isLoading && (
              <div className="text-center py-2 text-xs text-brand-400 animate-pulse font-semibold">
                Processing OCR Extraction... Please wait
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs uppercase"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!aadhaarPhoto && !name}
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-glow text-xs uppercase"
              >
                Verify Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: VISITOR DETAILS & PURPOSE */}
        {step === 4 && (
          <form onSubmit={handleRegisterSubmit} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 animate-fadeIn">
            <h3 className="text-md font-bold text-white border-b border-slate-850 pb-2">Verify and Route Visitor</h3>
            
            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">ID Card/Proof Number</label>
                  <input
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                    placeholder="Aadhaar / PAN / DL / ID number"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-brand-400 uppercase font-bold flex items-center gap-1.5">
                  Mobile Phone <span className="text-red-400 font-normal">(Ask Visitor)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs border border-brand-500/30 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="+91 XXXXX XXXXX"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Gate Select</label>
                <select
                  value={activeGateId}
                  onChange={(e) => setActiveGateId(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                >
                  {gates.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-950">{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Purpose of Visit</label>
                <select
                  value={purposeCategory}
                  onChange={(e) => setPurposeCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                >
                  <option value="MEETING" className="bg-slate-950">Meeting Faculty / HOD</option>
                  <option value="ADMISSION" className="bg-slate-950">Admission Inquiry (Auto-routes to Admissions Office)</option>
                  <option value="DELIVERY" className="bg-slate-950">Delivery / Vendor (Auto-routes to Procurement)</option>
                  <option value="EVENT" className="bg-slate-950">Event / Other (Auto-routes to Security Admin)</option>
                </select>
              </div>

              {purposeCategory === 'MEETING' && (
                <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-white/5">
                  <label className="text-[10px] text-brand-400 uppercase font-bold">Search Faculty Directory</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Type name (e.g. Sunita, Verma)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-md glass-input text-xs"
                    />
                  </div>

                  {selectedHostName && (
                    <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded">
                      <UserCheck className="w-4 h-4 shrink-0" /> Assigned: {selectedHostName}
                    </div>
                  )}

                  {directoryUsers.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1 bg-slate-900 border border-slate-800 rounded p-1.5">
                      {directoryUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectHostUser(u)}
                          className="w-full text-left p-1.5 hover:bg-slate-800 text-[10px] rounded text-slate-300 font-medium"
                        >
                          {u.name} • <span className="text-slate-500">{u.department}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Purpose Details (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Courier drop-off, Project discussion"
                  value={purposeDetails}
                  onChange={(e) => setPurposeDetails(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs uppercase"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || (purposeCategory === 'MEETING' && !selectedHostId)}
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-glow text-xs uppercase"
              >
                Send Request
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: POLLING STATUS / DIGITAL PASS PRINT */}
        {step === 5 && visitRequest && (
          <div className="space-y-6">
            
            {/* Status indicator card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center space-y-4">
              
              {pollingStatus === 'PENDING' && (
                <>
                  <div className="inline-flex p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl animate-pulse">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Visit Status: PENDING</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Approval request sent to <span className="font-bold text-brand-400">{visitRequest.approver?.name || 'Assigned Approver'}</span>. Please wait for real-time status update.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Polling approver inbox...
                                     {/* Guard Phone Call Override Action */}
                  <div className="mt-6 border-t border-slate-800/80 pt-5 space-y-4">
                    {visitRequest.approver && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2.5 text-left text-xs">
                        <p className="text-[10px] text-brand-400 uppercase font-bold tracking-wider">Host Contact Details</p>
                        
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">{visitRequest.approver.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {visitRequest.approver.post || 'No Designation'} • {visitRequest.approver.department || 'No Department'}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-850 pt-2 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider font-sans">Mobile Phone</span>
                            <span className="text-slate-200">{visitRequest.approver.phone || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider font-sans">Extension No.</span>
                            <span className="text-slate-200">{visitRequest.approver.extensionNumber || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                      Faculty / staff busy or not responding? Call the host on phone. If they approve verbally, you can manually authorize the entry:
                    </p>
                    <button
                      type="button"
                      onClick={handleGuardOverride}
                      disabled={isLoading}
                      className="w-full py-2.5 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-slate-950 border border-brand-500/20 hover:border-brand-500 font-bold text-xs rounded-xl uppercase transition tracking-wider flex items-center justify-center gap-1.5"
                    >
                      Confirm Phone Call & Allow Entry
                    </button>
                    {error && <p className="text-[10px] text-red-400 font-semibold mt-1">{error}</p>}
                  </div>  </div>
                </>
              )}

              {pollingStatus === 'APPROVED' && (
                <>
                  <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-400">VISIT REQUEST APPROVED</h3>
                  <p className="text-xs text-slate-400">
                    Host decided: <span className="font-bold text-white">APPROVE</span>. You can now issue the digital entry pass and mark check-in.
                  </p>
                  
                  {visitRequest.approvalMessage && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg text-left text-xs italic text-emerald-300 font-medium max-w-xs mx-auto">
                      Host note: "{visitRequest.approvalMessage}"
                    </div>
                  )}

                  {!showPass && (
                    <div className="flex gap-2 justify-center pt-2">
                      <button
                        onClick={() => setShowPass(true)}
                        className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5" /> View/Print Pass
                      </button>
                      
                      <button
                        onClick={handleCheckIn}
                        disabled={isLoading}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-glow uppercase transition"
                      >
                        Log Gate Entry
                      </button>
                    </div>
                  )}
                </>
              )}

              {pollingStatus === 'REJECTED' && (
                <>
                  <div className="inline-flex p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-red-400">VISIT REQUEST DENIED</h3>
                  <p className="text-xs text-slate-400">
                    Host decided: <span className="font-bold text-white">REJECT</span>. Visitor entry is denied.
                  </p>
                  {visitRequest.rejectionReason && (
                    <p className="text-xs text-red-300 bg-red-500/5 p-2 rounded max-w-xs mx-auto italic">
                      Reason: "{visitRequest.rejectionReason}"
                    </p>
                  )}
                  <button
                    onClick={onBack}
                    className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                  >
                    Return to Dashboard
                  </button>
                </>
              )}
            </div>

            {/* Render Digital Pass on approval if clicked */}
            {showPass && (
              <VisitorPass 
                passData={{
                  id: visitRequest.id,
                  name: name || visitRequest.visitor.name,
                  phone: phone || visitRequest.visitor.phone,
                  maskedAadhaar: visitRequest.visitor.aadhaarNumberMasked,
                  purposeCategory: visitRequest.purposeCategory,
                  purposeDetails: visitRequest.purposeDetails,
                  status: visitRequest.status,
                  approvalMessage: visitRequest.approvalMessage,
                  approver: visitRequest.approver,
                  createdAt: visitRequest.createdAt
                }}
                onClose={() => setShowPass(false)}
              />
            )}

          </div>
        )}

      </main>
    </div>
  );
};
