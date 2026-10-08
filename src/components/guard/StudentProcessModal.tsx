import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { Student, StudentMovement, MovementType, MOVEMENT_TYPES } from '../../types';
import { StorageService } from '../../services/storage';

interface StudentProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  activeMovement?: StudentMovement | null;
  onConfirmOut: (data: {
    gatePassNo: string;
    student: Student;
    vehicleNo: string;
    goingWithWhom: string;
    movementType: MovementType;
    purposeReason: string;
  }) => void;
  onConfirmIn: (data: {
    movementId: string;
    studentId: string;
    whoDropped: string;
  }) => void;
  onPrintPass?: (movement: StudentMovement) => void;
  isAdmin?: boolean;
}

export const StudentProcessModal: React.FC<StudentProcessModalProps> = ({
  isOpen,
  onClose,
  student,
  activeMovement,
  onConfirmOut,
  onConfirmIn,
  isAdmin = false,
}) => {
  // OUT Form States
  const [gatePassNo, setGatePassNo] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [goingWithWhom, setGoingWithWhom] = useState<string>('');
  const [movementType, setMovementType] = useState<MovementType>('Personal Leave');
  const [purposeReason, setPurposeReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // IN Form State
  const [whoDropped, setWhoDropped] = useState<string>('');

  // Admin Override
  const [allowOverride, setAllowOverride] = useState<boolean>(false);

  // Time display
  const [currentAutoTime, setCurrentAutoTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentAutoTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) +
          ' · ' +
          new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset fields when student changes
  useEffect(() => {
    if (student) {
      setGatePassNo('');
      setVehicleNo('');
      setGoingWithWhom('');
      setMovementType('Personal Leave');
      setPurposeReason('');
      setWhoDropped('');
      setFormError(null);
      setAllowOverride(false);
    }
  }, [student]);

  // Synchronize with Public Display Monitor 2
  useEffect(() => {
    if (isOpen && student) {
      StorageService.broadcastPublicDisplay({
        mode: student.status === 'OUTSIDE' ? 'STUDENT_SCANNED' : 'STUDENT_PROCESS_WAIT',
        timestamp: Date.now(),
        student: {
          name: student.name,
          house: student.house,
          class: student.class,
          section: student.section,
          houseNo: student.houseNo,
          photo: student.photo,
          gatePassNo: activeMovement?.gatePassNo,
          movementType: activeMovement?.movementType,
        },
        activeActionLabel: `Duty Guard verifying ${student.status === 'OUTSIDE' ? 'Return IN' : 'Gate Pass OUT'} for ${student.name}`,
      });
    }
  }, [isOpen, student, activeMovement]);

  if (!isOpen || !student) return null;

  const isCurrentlyOutside = student.status === 'OUTSIDE';
  const isBlocked = student.status === 'BLOCKED';

  // Handle OUT Submission
  const handleOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isCurrentlyOutside && !allowOverride) {
      setFormError('Duplicate OUT prevented: Student is already marked as OUTSIDE campus. Use Admin override if needed.');
      return;
    }

    if (!gatePassNo.trim()) {
      setFormError('Physical Gate Pass Number is required from the physical house pass.');
      return;
    }

    if (!goingWithWhom.trim()) {
      setFormError('Please enter who the student is going with (parent/guardian/self).');
      return;
    }

    if (!purposeReason.trim()) {
      setFormError('Please enter the purpose or reason for gate pass.');
      return;
    }

    onConfirmOut({
      gatePassNo: gatePassNo.trim().toUpperCase(),
      student,
      vehicleNo: vehicleNo.trim().toUpperCase() || 'N/A',
      goingWithWhom: goingWithWhom.trim(),
      movementType,
      purposeReason: purposeReason.trim(),
    });
  };

  // Handle IN Submission
  const handleInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isCurrentlyOutside && !allowOverride) {
      setFormError('Duplicate IN prevented: Student is already recorded as ON CAMPUS.');
      return;
    }

    if (!whoDropped.trim()) {
      setFormError('Please enter who accompanied / dropped the student back.');
      return;
    }

    onConfirmIn({
      movementId: activeMovement?.id || `MOV-RET-${Date.now()}`,
      studentId: student.id,
      whoDropped: whoDropped.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#d5e0eb] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#012758] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#073a7d] rounded-lg">
              {isCurrentlyOutside ? (
                <ArrowRight className="w-5 h-5 text-[#fda31b] rotate-180" />
              ) : (
                <ArrowRight className="w-5 h-5 text-[#fda31b]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                {isCurrentlyOutside ? 'Process Student Return (IN)' : 'Authorize Student Exit (OUT)'}
              </h3>
              <p className="text-xs text-[#d5e0eb]">
                Golden Gate Verification · Birla Public School, Pilani
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Student Profile Identity Card */}
          <div className="p-4 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg bg-white overflow-hidden border border-[#d5e0eb] shrink-0 shadow-2xs flex items-center justify-center">
              <span className="font-bold text-sm text-[#012758]">BPS</span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#012758] tracking-tight">
                  {student.name}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    student.status === 'OUTSIDE'
                      ? 'bg-[#fff3d9] text-[#9d6500] border-[#fda31b]/60'
                      : student.status === 'BLOCKED'
                      ? 'bg-[#fff0ee] text-[#ae4439] border-[#ae4439]/60'
                      : 'bg-[#e7f5f1] text-[#116e63] border-[#116e63]/40'
                  }`}
                >
                  {student.status === 'OUTSIDE' ? 'CURRENTLY OUTSIDE' : student.status === 'BLOCKED' ? 'QR BLOCKED' : 'ON CAMPUS'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[#688099] block font-medium">Class & Sec</span>
                  <span className="font-semibold text-[#173a5f]">
                    {student.class} - {student.section}
                  </span>
                </div>

                <div>
                  <span className="text-[#688099] block font-medium">House</span>
                  <span className="font-bold text-[#012758]">
                    {student.house}
                  </span>
                </div>

                <div>
                  <span className="text-[#688099] block font-medium">House No.</span>
                  <span className="font-mono-numbers text-[#173a5f] font-semibold">
                    {student.houseNo}
                  </span>
                </div>

                <div>
                  <span className="text-[#688099] block font-medium">Admission No.</span>
                  <span className="font-mono-numbers text-[#173a5f] font-semibold">
                    {student.admissionNo}
                  </span>
                </div>
              </div>

              {student.fatherName && (
                <div className="text-[11px] text-[#688099] pt-1">
                  Parent / Guardian: <span className="text-[#173a5f] font-medium">{student.fatherName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Blocked QR Warning */}
          {isBlocked && (
            <div className="p-4 bg-[#fff0ee] border border-[#ae4439]/60 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#ae4439] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#ae4439]">
                  Student QR ID is Currently Blocked
                </h4>
                <p className="text-xs text-[#315172] mt-0.5">
                  This student's physical pass card is flagged for administrative review. Security guard cannot authorize gate movement without administrative unblock.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {formError && (
            <div className="p-3 bg-[#fff0ee] border border-[#ae4439] rounded-lg text-xs text-[#ae4439] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form: STUDENT IN (Return) */}
          {isCurrentlyOutside && !isBlocked && (
            <form onSubmit={handleInSubmit} className="space-y-4">
              <div className="p-4 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#19558a]">
                    Active Movement Details
                  </span>
                  <span className="text-xs text-[#012758] font-mono-numbers font-bold">
                    Pass: {activeMovement?.gatePassNo || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#688099] block font-medium">Departure Time OUT:</span>
                    <span className="font-mono-numbers text-[#173a5f] font-medium">
                      {activeMovement?.dateTimeOut
                        ? new Date(activeMovement.dateTimeOut).toLocaleString('en-IN')
                        : 'Recorded'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#688099] block font-medium">Movement Type:</span>
                    <span className="font-semibold text-[#173a5f]">
                      {activeMovement?.movementType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#688099] block font-medium">Went With:</span>
                    <span className="text-[#173a5f] font-medium">
                      {activeMovement?.goingWithWhom}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#688099] block font-medium">Outbound Vehicle:</span>
                    <span className="font-mono-numbers text-[#173a5f] font-medium">
                      {activeMovement?.vehicleNo}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[#688099] block font-medium">Purpose of Outing:</span>
                    <span className="text-[#173a5f]">
                      {activeMovement?.purposeReason}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guard Return Inputs */}
              <div>
                <label className="block text-xs font-bold text-[#012758] mb-1">
                  Who Dropped / Accompanied Student Back? *
                </label>
                <input
                  type="text"
                  required
                  value={whoDropped}
                  onChange={(e) => setWhoDropped(e.target.value)}
                  placeholder="e.g. Father, School Bus No. 3, Self"
                  className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#012758] shadow-xs"
                  autoFocus
                />
              </div>

              {/* Automatic Timestamp */}
              <div className="flex items-center justify-between p-3 bg-[#e8f1fa] border border-[#d5e0eb] rounded-lg text-xs">
                <span className="text-[#19558a] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#19558a]" />
                  Official Timestamp IN (Auto-Recorded):
                </span>
                <span className="font-mono-numbers text-[#012758] font-bold">
                  {currentAutoTime}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#f5f9fc] hover:bg-[#e8f1fa] text-[#173a5f] text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-[#d5e0eb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#116e63] hover:bg-[#0c534a] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>MARK IN (COMPLETE RETURN)</span>
                </button>
              </div>
            </form>
          )}

          {/* Form: STUDENT OUT (Departure) */}
          {!isCurrentlyOutside && !isBlocked && (
            <form onSubmit={handleOutSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Physical Gate Pass No. */}
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Physical Gate Pass Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={gatePassNo}
                    onChange={(e) => setGatePassNo(e.target.value.toUpperCase())}
                    placeholder="e.g. GP-PAN-1204"
                    className="w-full bg-white border border-[#d5e0eb] text-[#012758] font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] uppercase tracking-wider font-bold shadow-xs"
                    autoFocus
                  />
                  <span className="text-[10px] text-[#688099] mt-1 block">
                    From physical House pass issued by Housemaster
                  </span>
                </div>

                {/* Movement Type */}
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Movement Type *
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as MovementType)}
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] cursor-pointer shadow-xs"
                  >
                    {MOVEMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#688099] mt-1 block">
                    "On Duty" covers school competitions, trips & events
                  </span>
                </div>

                {/* Going With Whom */}
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Going With Whom *
                  </label>
                  <input
                    type="text"
                    required
                    value={goingWithWhom}
                    onChange={(e) => setGoingWithWhom(e.target.value)}
                    placeholder="e.g. Parent (Father), Escort Staff, Self"
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] shadow-xs"
                  />
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    placeholder="e.g. RJ-18-B-9988 or Foot"
                    className="w-full bg-white border border-[#d5e0eb] text-[#012758] font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] uppercase shadow-xs"
                  />
                </div>

              </div>

              {/* Purpose / Reason */}
              <div>
                <label className="block text-xs font-bold text-[#012758] mb-1">
                  Purpose / Reason for Departure *
                </label>
                <textarea
                  required
                  rows={2}
                  value={purposeReason}
                  onChange={(e) => setPurposeReason(e.target.value)}
                  placeholder="Specify reason as endorsed on physical pass (e.g. Medical consultation, Inter-school tournament, Home leave)"
                  className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] resize-none shadow-xs"
                />
              </div>

              {/* Automatic Timestamp */}
              <div className="flex items-center justify-between p-3 bg-[#e8f1fa] border border-[#d5e0eb] rounded-lg text-xs">
                <span className="text-[#19558a] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#19558a]" />
                  Official Timestamp OUT (Auto-Recorded):
                </span>
                <span className="font-mono-numbers text-[#012758] font-bold">
                  {currentAutoTime}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#f5f9fc] hover:bg-[#e8f1fa] text-[#173a5f] text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-[#d5e0eb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 text-[#fda31b]" />
                  <span>CONFIRM OUT (AUTHORIZE EXIT)</span>
                </button>
              </div>
            </form>
          )}

          {/* Admin Override Section */}
          {isAdmin && (
            <div className="border-t border-[#e3ebf2] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#688099] flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#19558a]" />
                  Administrator Emergency Override
                </span>
                <button
                  type="button"
                  onClick={() => setAllowOverride(!allowOverride)}
                  className="text-xs text-[#19558a] hover:underline cursor-pointer font-bold"
                >
                  {allowOverride ? 'Hide Override Controls' : 'Show Override Controls'}
                </button>
              </div>

              {allowOverride && (
                <div className="mt-3 p-3 bg-[#e8f1fa] border border-[#d5e0eb] rounded-lg text-xs space-y-2">
                  <p className="text-[#173a5f]">
                    Use this only if a student returned unrecorded or needs manual state realignment.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        student.status = student.status === 'OUTSIDE' ? 'ON_CAMPUS' : 'OUTSIDE';
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-[#012758] hover:bg-[#073a7d] text-white font-bold rounded text-xs cursor-pointer shadow-xs"
                    >
                      Force Toggle Status to {student.status === 'OUTSIDE' ? 'ON CAMPUS' : 'OUTSIDE'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
