import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Home,
  Phone,
  User,
  QrCode,
} from 'lucide-react';
import { Student } from '../../types';
import { generateQrDataUrl } from '../../services/qrHelper';

interface StudentQrModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus?: (studentId: string) => void;
}

export const StudentQrModal: React.FC<StudentQrModalProps> = ({
  student,
  isOpen,
  onClose,
  onToggleStatus,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  // Generate QR code whenever selected student changes
  useEffect(() => {
    if (!student || !isOpen) {
      setQrDataUrl('');
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    // Standardized payload used by Golden Gate scanner
    const qrPayload = student.qrId || `BPS:STU:${student.admissionNo}:${student.houseNo}`;

    generateQrDataUrl(qrPayload, 360)
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate student QR:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const qrPayload = student.qrId || `BPS:STU:${student.admissionNo}:${student.houseNo}`;

  // Copy payload string
  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR code PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `BPS_QR_${student.admissionNo}_${student.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Student Gate Card
  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border border-[#d5e0eb] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[#012758] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#073a7d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#fda31b]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide font-crest uppercase">
                System-Generated Student QR Code
              </h3>
              <p className="text-[11px] text-white/70">
                Birla Public School, Pilani · Golden Gate Access Pass
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Printable Official Student QR Card */}
          <div
            id="student-qr-card-print"
            className="border-2 border-[#012758] rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#f5f9fc] to-white relative shadow-sm"
          >
            {/* School Header Inside Card */}
            <div className="flex items-center justify-between border-b border-[#d5e0eb] pb-3 mb-4">
              <div>
                <div className="text-[10px] font-bold text-[#012758] uppercase tracking-wider font-crest">
                  Vidya Niketan
                </div>
                <div className="text-xs font-black text-[#012758] leading-tight font-crest uppercase">
                  Birla Public School, Pilani
                </div>
                <div className="text-[9px] font-mono text-[#fda31b] font-bold tracking-widest uppercase">
                  Golden Gate Access Pass
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  student.status === 'BLOCKED'
                    ? 'bg-[#fff0ee] text-[#ae4439] border border-[#ae4439]/30'
                    : student.status === 'OUTSIDE'
                    ? 'bg-[#fff3d9] text-[#9d6500] border border-[#fda31b]/40'
                    : 'bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/30'
                }`}
              >
                {student.status === 'BLOCKED' ? (
                  <>
                    <ShieldAlert className="w-3 h-3 text-[#ae4439]" />
                    <span>BLOCKED</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-[#116e63]" />
                    <span>{student.status === 'OUTSIDE' ? 'OUTSIDE' : 'ACTIVE'}</span>
                  </>
                )}
              </div>
            </div>

            {/* QR Code + Essential Identity Side-by-Side */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* QR Code Container */}
              <div className="flex flex-col items-center shrink-0">
                <div className="p-2.5 bg-white border-2 border-[#012758] rounded-xl shadow-xs relative">
                  {isGenerating ? (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 flex flex-col items-center justify-center text-[#19558a]">
                      <div className="w-8 h-8 border-3 border-[#012758] border-t-[#fda31b] rounded-full animate-spin mb-2" />
                      <span className="text-[11px] font-bold">Generating QR...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${student.name}`}
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-red-500">
                      Failed to render QR
                    </div>
                  )}

                  {/* Corner Accent Points */}
                  <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-[#fda31b]" />
                  <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-[#fda31b]" />
                  <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-[#fda31b]" />
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-[#fda31b]" />
                </div>

                <div className="mt-1.5 text-center">
                  <span className="text-[10px] font-mono font-bold text-[#688099] tracking-wider">
                    {student.admissionNo}
                  </span>
                </div>
              </div>

              {/* Student Database Details Details */}
              <div className="flex-1 w-full space-y-2.5 text-left">
                <div>
                  <span className="text-[10px] font-bold text-[#688099] uppercase tracking-wider">
                    Student Full Name
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-[#012758] leading-tight font-crest">
                    {student.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-[#d5e0eb]">
                    <span className="text-[10px] text-[#688099] block font-medium">Admission No</span>
                    <span className="font-mono font-bold text-[#012758] text-sm">
                      {student.admissionNo}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#d5e0eb]">
                    <span className="text-[10px] text-[#688099] block font-medium">Class & Sec</span>
                    <span className="font-bold text-[#173a5f] flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#19558a]" />
                      Class {student.class}-{student.section}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#d5e0eb]">
                    <span className="text-[10px] text-[#688099] block font-medium">Boarding House</span>
                    <span className="font-bold text-[#012758] flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-[#fda31b]" />
                      {student.house}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#d5e0eb]">
                    <span className="text-[10px] text-[#688099] block font-medium">System House No</span>
                    <span className="font-mono font-bold text-[#19558a] text-[11px] truncate block" title={student.houseNo}>
                      {student.houseNo}
                    </span>
                  </div>
                </div>

                {(student.fatherName || student.contactNo) && (
                  <div className="bg-white p-2 rounded-lg border border-[#d5e0eb] text-xs space-y-1">
                    {student.fatherName && (
                      <div className="flex items-center gap-1.5 text-[#315172]">
                        <User className="w-3 h-3 text-[#688099]" />
                        <span>Father: <strong className="text-[#173a5f]">{student.fatherName}</strong></span>
                      </div>
                    )}
                    {student.contactNo && (
                      <div className="flex items-center gap-1.5 text-[#315172]">
                        <Phone className="w-3 h-3 text-[#688099]" />
                        <span>Emergency: <strong className="font-mono text-[#173a5f]">{student.contactNo}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* QR Payload String Bar */}
            <div className="mt-4 pt-3 border-t border-[#d5e0eb] flex items-center justify-between bg-white px-3 py-2 rounded-xl border">
              <div className="flex-1 truncate mr-2">
                <span className="text-[9px] font-bold text-[#688099] uppercase block tracking-wider">
                  Scannable System QR ID:
                </span>
                <span className="font-mono text-xs font-bold text-[#012758] select-all truncate block">
                  {qrPayload}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="px-2.5 py-1 text-[11px] font-bold bg-[#f5f9fc] hover:bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#116e63]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl || isGenerating}
                className="w-full py-2.5 px-4 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-[#fda31b]" />
                <span>Download QR Image (PNG)</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCard}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#f5f9fc] text-[#012758] border border-[#d5e0eb] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#19558a]" />
                <span>Print Student Card</span>
              </button>
            </div>

            {/* Optional Status Toggle (Block/Unblock) */}
            {onToggleStatus && (
              <div className="p-3 rounded-xl bg-[#f5f9fc] border border-[#d5e0eb] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#173a5f] block">
                    Gate Access Status: {student.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE'}
                  </span>
                  <span className="text-[11px] text-[#688099]">
                    {student.status === 'BLOCKED'
                      ? 'This student is barred from scanning OUT at the Golden Gate.'
                      : 'QR scans normally at the guard desk for authorized departures.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleStatus(student.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    student.status === 'BLOCKED'
                      ? 'bg-[#e7f5f1] border-[#116e63] text-[#116e63] hover:bg-[#d5ede7]'
                      : 'bg-[#fff0ee] border-[#ae4439] text-[#ae4439] hover:bg-[#fde2e0]'
                  }`}
                >
                  {student.status === 'BLOCKED' ? 'Unblock Access' : 'Block Access'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#f5f9fc] px-5 py-3 border-t border-[#d5e0eb] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-[#e8f1fa] text-[#173a5f] border border-[#d5e0eb] font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
