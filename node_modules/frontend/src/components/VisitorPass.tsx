import React from 'react';
import { QrCode, Printer, CheckCircle, ShieldAlert } from 'lucide-react';

interface VisitorPassProps {
  passData: {
    id: string;
    name: string;
    phone: string;
    maskedAadhaar: string;
    purposeCategory: string;
    purposeDetails?: string;
    status: string;
    approvalMessage?: string;
    approver?: {
      name: string;
      department?: string;
    };
    createdAt: string;
  };
  onClose: () => void;
}

export const VisitorPass: React.FC<VisitorPassProps> = ({ passData, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(passData.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-slate-900/90 border border-slate-700 p-6 rounded-2xl max-w-md w-full mx-auto space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="text-center pb-4 border-b border-slate-800">
        <h3 className="text-xl font-bold text-white tracking-wide">ABES EC SECURITY</h3>
        <p className="text-xs text-brand-400 font-semibold uppercase tracking-wider">Visitor Digital Entry Pass</p>
      </div>

      {/* Printable Area */}
      <div id="printable-visitor-pass" className="space-y-6 bg-slate-950 p-6 rounded-xl border border-white/5 relative">
        {/* Pass Status Banner */}
        <div className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
          APPROVED
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center p-3 bg-white w-32 h-32 mx-auto rounded-lg shadow-inner">
          <QrCode className="w-full h-full text-slate-950" />
        </div>
        
        <p className="text-center text-[10px] text-slate-500 font-mono select-all">PASS-ID: {passData.id.slice(0, 8).toUpperCase()}</p>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500">Visitor Name</p>
            <p className="font-semibold text-slate-200 text-sm mt-0.5">{passData.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Phone Number</p>
            <p className="font-semibold text-slate-200 text-sm mt-0.5">{passData.phone}</p>
          </div>
          <div>
            <p className="text-slate-500">Aadhaar (Masked)</p>
            <p className="font-semibold text-slate-200 mt-0.5">{passData.maskedAadhaar}</p>
          </div>
          <div>
            <p className="text-slate-500">Entry Date & Time</p>
            <p className="font-semibold text-slate-200 mt-0.5">{formattedDate}</p>
          </div>
          <div className="col-span-2 border-t border-slate-800/60 pt-3">
            <p className="text-slate-500">Purpose of Visit</p>
            <p className="font-semibold text-slate-200 mt-0.5">
              {passData.purposeCategory} {passData.purposeDetails ? `(${passData.purposeDetails})` : ''}
            </p>
          </div>
          
          {passData.approver && (
            <div className="col-span-2 border-t border-slate-800/60 pt-3">
              <p className="text-slate-500">Host / Approver</p>
              <p className="font-semibold text-slate-200 mt-0.5">
                {passData.approver.name} {passData.approver.department ? `(${passData.approver.department})` : ''}
              </p>
            </div>
          )}

          {passData.approvalMessage && (
            <div className="col-span-2 bg-brand-500/5 border border-brand-500/20 p-2.5 rounded-lg">
              <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">Host Instructions</p>
              <p className="font-medium text-brand-200 mt-0.5 text-xs italic">"{passData.approvalMessage}"</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-900 text-[9px] text-slate-500">
          This pass is valid for today only. Please scan out at exit gate before leaving.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-glow transition"
        >
          <Printer className="w-4 h-4" /> Print Pass
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
        >
          Close
        </button>
      </div>

      {/* Inject custom print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-visitor-pass, #printable-visitor-pass * {
            visibility: visible;
          }
          #printable-visitor-pass {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            padding: 20px !important;
          }
          #printable-visitor-pass * {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
};
