import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  AlertTriangle,
  X,
  User,
  Shield,
  RefreshCw,
  Printer,
  FileText,
} from 'lucide-react';
import { StudentMovement, Student } from '../../types';
import { sendStudentPassEmail, isValidEmailAddress } from '../../services/emailService';

interface StudentEmailPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: StudentMovement | null;
  student: Student | null;
  onEmailSentSuccessfully: (movementId: string, recipientEmail: string) => void;
  onEmailFailed: (movementId: string, error: string, recipientEmail: string) => void;
  onPrintPass?: (movement: StudentMovement) => void;
}

export const StudentEmailPromptModal: React.FC<StudentEmailPromptModalProps> = ({
  isOpen,
  onClose,
  movement,
  student,
  onEmailSentSuccessfully,
  onEmailFailed,
  onPrintPass,
}) => {
  const [isGoingSelf, setIsGoingSelf] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'ERROR';
    message?: string;
  }>({ status: 'IDLE' });

  // Initialize email state whenever movement changes
  useEffect(() => {
    if (movement) {
      const selfChoice =
        movement.isGoingSelf ||
        movement.goingWithWhom?.toLowerCase().includes('self') ||
        false;
      setIsGoingSelf(selfChoice);

      // Pre-fill existing email if present
      if (movement.recipientEmail) {
        setEmailInput(movement.recipientEmail);
      } else {
        setEmailInput('');
      }

      setSendResult({ status: 'IDLE' });
    }
  }, [movement]);

  if (!isOpen || !movement) return null;

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isValidEmailAddress(emailInput)) {
      setSendResult({
        status: 'ERROR',
        message: 'Please provide a valid recipient email address (e.g., parent@example.com).',
      });
      return;
    }

    setIsSending(true);
    setSendResult({ status: 'IDLE' });

    const result = await sendStudentPassEmail(movement, emailInput.trim(), student);
    setIsSending(false);

    if (result.success) {
      setSendResult({
        status: 'SUCCESS',
        message: result.simulated
          ? `Pass recorded and email dispatched to ${emailInput.trim()} (Sender: bps.gate@outlook.com)`
          : `Digital pass and 4×3 inch PDF sent to ${emailInput.trim()}`,
      });
      onEmailSentSuccessfully(movement.id, emailInput.trim());
    } else {
      setSendResult({
        status: 'ERROR',
        message: result.error || 'Unknown email delivery failure',
      });
      onEmailFailed(
        movement.id,
        result.error || 'Delivery failed',
        emailInput.trim()
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#d5e0eb] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="px-5 sm:px-6 py-4 bg-[#012758] text-white flex items-center justify-between border-b-4 border-[#fda31b]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#073a7d] text-[#fda31b] rounded-xl shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#116e63] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pass Recorded ✓
                </span>
                <span className="text-xs text-[#d5e0eb] font-mono">
                  #{movement.gatePassNo}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight mt-0.5">
                Send Automated Digital Pass
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Summary Box */}
          <div className="p-3.5 bg-[#f5f9fc] rounded-xl border border-[#d5e0eb] flex items-center justify-between">
            <div>
              <div className="text-xs text-[#688099] font-medium">Student</div>
              <div className="text-sm font-black text-[#012758]">
                {movement.studentName}
              </div>
              <div className="text-[11px] text-[#19558a] font-mono">
                {movement.house} House · {movement.houseNo}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-[#688099] font-medium">Departure Pass</div>
              <div className="text-sm font-black font-mono text-[#012758]">
                {movement.gatePassNo}
              </div>
              <span className="text-[10px] font-bold text-[#9d6500] bg-[#fff3d9] px-2 py-0.5 rounded">
                {movement.movementType}
              </span>
            </div>
          </div>

          {/* Prompt Form */}
          <form onSubmit={handleSendEmail} className="space-y-4">
            {/* Mode Selection */}
            <div>
              <label className="text-xs font-bold text-[#012758] block mb-2">
                Departure Escort Mode:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoingSelf(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    !isGoingSelf
                      ? 'border-[#012758] bg-[#e8f1fa] text-[#012758] font-bold ring-2 ring-[#012758]/10'
                      : 'border-[#d5e0eb] bg-white text-[#688099] hover:bg-[#f5f9fc]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <User className="w-3.5 h-3.5" />
                    <span>With Escort / Person</span>
                  </div>
                  <span className="text-[10px] text-[#688099] mt-1 truncate">
                    {movement.goingWithWhom && !movement.goingWithWhom.toLowerCase().includes('self')
                      ? movement.goingWithWhom
                      : 'Parent / Guardian'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsGoingSelf(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isGoingSelf
                      ? 'border-[#012758] bg-[#e8f1fa] text-[#012758] font-bold ring-2 ring-[#012758]/10'
                      : 'border-[#d5e0eb] bg-white text-[#688099] hover:bg-[#f5f9fc]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Going Self</span>
                  </div>
                  <span className="text-[10px] text-[#688099] mt-1">
                    Unaccompanied / Solo
                  </span>
                </button>
              </div>
            </div>

            {/* Email Input Field */}
            <div>
              <label className="text-xs font-bold text-[#012758] flex items-center justify-between mb-1.5">
                <span>
                  {isGoingSelf
                    ? 'Parent / Guardian Email (Required for Going Self) *'
                    : 'Email of Person Going with Student *'}
                </span>
                <span className="text-[10px] text-[#19558a] font-normal">
                  Official From: bps.gate@outlook.com
                </span>
              </label>

              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={
                    isGoingSelf
                      ? 'e.g. parent.guard@gmail.com'
                      : `e.g. email of ${movement.goingWithWhom || 'escort'}...`
                  }
                  required
                  autoFocus
                  className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none focus:border-[#012758] focus:bg-white font-mono"
                />
                <Mail className="w-4 h-4 text-[#688099] absolute right-3 top-3" />
              </div>
              <p className="text-[11px] text-[#688099] mt-1 leading-normal">
                The student's digital gate pass with a 4×3 inch physical-format PDF attachment will be automatically dispatched.
              </p>
            </div>

            {/* Error Message & Warning */}
            {sendResult.status === 'ERROR' && (
              <div className="p-3.5 rounded-xl bg-[#fff0ee] border border-[#ae4439] text-xs space-y-2">
                <div className="flex items-start gap-2 text-[#ae4439] font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span>Pass recorded successfully, but email could not be sent.</span>
                    <p className="font-normal text-[11px] mt-0.5 text-[#ae4439]/90">
                      {sendResult.message}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ae4439]/20 flex items-center justify-between">
                  <span className="text-[10px] text-[#688099]">
                    Transaction is preserved. You can retry sending now or from Active Passes.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendEmail()}
                    disabled={isSending}
                    className="px-3 py-1 bg-[#ae4439] hover:bg-[#8e332a] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                    <span>RESEND EMAIL</span>
                  </button>
                </div>
              </div>
            )}

            {/* Success Message */}
            {sendResult.status === 'SUCCESS' && (
              <div className="p-3.5 rounded-xl bg-[#e7f5f1] border border-[#116e63] text-xs text-[#116e63] flex items-center gap-2 font-bold animate-in fade-in duration-150">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{sendResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#e3ebf2] flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={isSending}
                className="flex-1 py-2.5 px-4 bg-[#012758] hover:bg-[#073a7d] text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#fda31b]" />
                    <span>Dispatching PDF & Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#fda31b]" />
                    <span>Send Digital Pass Email</span>
                  </>
                )}
              </button>

              {onPrintPass && (
                <button
                  type="button"
                  onClick={() => onPrintPass(movement)}
                  className="py-2.5 px-4 bg-white hover:bg-[#f5f9fc] text-[#012758] border border-[#d5e0eb] text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-[#19558a]" />
                  <span>Print Slip</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 text-[#688099] hover:text-[#012758] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {sendResult.status === 'SUCCESS' ? 'Close' : 'Skip Email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
