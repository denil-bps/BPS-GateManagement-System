import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  QrCode,
  UserCheck,
  CheckCircle,
  FileCheck,
  Sparkles,
  Car,
  User,
  Calendar,
} from 'lucide-react';
import { PublicDisplayPayload } from '../../types';
import { StorageService } from '../../services/storage';

interface PublicDisplayProps {
  isStandaloneWindow?: boolean;
  isMirror?: boolean;
}

export const PublicDisplay: React.FC<PublicDisplayProps> = ({ isMirror = false }) => {
  const [displayState, setDisplayState] = useState<PublicDisplayPayload>(() =>
    StorageService.getPublicDisplayState()
  );

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const lastTimestampRef = useRef<number>(displayState.timestamp || 0);
  const lastModeRef = useRef<string>(displayState.mode || 'IDLE');

  // Safely apply state change with strict monotonic timestamp ordering
  const applyUpdate = useCallback((newPayload: PublicDisplayPayload) => {
    if (!newPayload || !newPayload.mode) return;
    // Strictly monotonic: accept if timestamp is newer, or equal timestamp with different mode
    if (newPayload.timestamp > lastTimestampRef.current) {
      lastTimestampRef.current = newPayload.timestamp;
      lastModeRef.current = newPayload.mode;
      setDisplayState(newPayload);
    } else if (newPayload.timestamp === lastTimestampRef.current && newPayload.mode !== lastModeRef.current) {
      lastModeRef.current = newPayload.mode;
      setDisplayState(newPayload);
    }
  }, []);

  // Clock updates every second
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Universal multi-channel synchronization:
  // 1. Server-Sent Events (SSE) across windows/tabs/iframes/devices
  // 2. BroadcastChannel + window storage events
  // 3. Monotonic safety poll
  useEffect(() => {
    // 1. Initial check on mount
    const current = StorageService.getPublicDisplayState();
    if (current && current.timestamp >= lastTimestampRef.current) {
      applyUpdate(current);
    }

    // 2. Real-Time Server-Sent Events stream from Express backend
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/public-display/stream');
      sse.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.mode) {
            applyUpdate(parsed as PublicDisplayPayload);
          }
        } catch {
          // ignore
        }
      };
      sse.onerror = () => {
        // SSE will automatically attempt reconnection
      };
    } catch {
      // ignore
    }

    // 3. Instant local event-driven synchronization across same-origin tabs/windows
    const unsubscribe = StorageService.subscribeToSync((event) => {
      if (event.type === 'PUBLIC_DISPLAY_UPDATE' && event.payload) {
        applyUpdate(event.payload as PublicDisplayPayload);
      }
    });

    // 4. Fallback polling (500ms) with monotonic check for cross-window reliability
    const pollInterval = setInterval(async () => {
      // Check local storage
      const localLatest = StorageService.getPublicDisplayState();
      if (localLatest && localLatest.timestamp > lastTimestampRef.current) {
        applyUpdate(localLatest);
      }

      // Check server API state
      try {
        const res = await fetch('/api/public-display');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.payload && json.payload.timestamp > lastTimestampRef.current) {
            applyUpdate(json.payload as PublicDisplayPayload);
          }
        }
      } catch {
        // ignore network hiccups
      }
    }, 500);

    return () => {
      if (sse) {
        try {
          sse.close();
        } catch {
          // ignore
        }
      }
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [applyUpdate]);

  // Auto-reset to IDLE after 8 seconds for completed transactions
  useEffect(() => {
    const transientSuccessModes = [
      'STUDENT_OUT_SUCCESS',
      'STUDENT_IN_SUCCESS',
      'VISITOR_IN_SUCCESS',
      'VISITOR_OUT_SUCCESS',
    ];

    if (transientSuccessModes.includes(displayState.mode)) {
      const timeout = setTimeout(() => {
        StorageService.resetPublicDisplayToIdle();
      }, 8500);
      return () => clearTimeout(timeout);
    }
  }, [displayState.mode, displayState.timestamp]);

  const mode = displayState.mode;

  return (
    <div className={`${isMirror ? 'py-5 px-4 bg-white' : 'min-h-screen bg-white'} text-[#173a5f] flex flex-col justify-between selection:bg-[#fda31b]/20 select-none overflow-hidden relative font-sans`}>
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(#012758_0.75px,transparent_0.75px)] [background-size:28px_28px] opacity-[0.03] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#fda31b]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#012758]/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP HEADER BAR (Hidden in compact desk mirror mode) */}
      {!isMirror && (
        <header className="relative z-10 border-b border-[#e3ebf2] bg-white/95 backdrop-blur-md px-6 sm:px-12 py-4 flex items-center justify-between shadow-xs">
          {/* School Crest & Identification */}
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#012758] to-[#0b3875] flex items-center justify-center shadow-md border-2 border-[#fda31b]">
              <span className="font-serif font-black text-xl text-[#fda31b] tracking-wider">
                BPS
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest text-[#9d6500] uppercase">
                  Vidya Niketan · Estd. 1944
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#fda31b]" />
                <span className="text-[11px] font-bold text-[#688099] uppercase tracking-wider">
                  Golden Gate
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-[#012758] tracking-wide font-crest">
                BIRLA PUBLIC SCHOOL, PILANI
              </h1>
            </div>
          </div>

          {/* Live Clock & Date */}
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#012758] tracking-wider flex items-center justify-end gap-1.5">
              <Clock className="w-5 h-5 text-[#fda31b]" />
              <span>{currentTime || '00:00:00 AM'}</span>
            </div>
            <div className="text-xs text-[#688099] font-medium mt-0.5">
              {currentDate || 'Loading date...'}
            </div>
          </div>
        </header>
      )}

      {/* 2. MAIN CENTER CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-12 py-8 max-w-4xl w-full mx-auto">
        
        {/* ============================================================ */}
        {/* STATE 1: GUARD CLICKED 'SCAN STUDENT QR' (AWAITING SCAN)    */}
        {/* ============================================================ */}
        {(mode === 'SCANNER_ACTIVE' || mode === 'STUDENT_SCAN_WAIT') && (
          <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
            <div className="bg-[#f5f9fc] border-2 border-[#fda31b] rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-5 py-1.5 bg-[#fda31b] text-[#012758] font-black text-[11px] uppercase tracking-widest rounded-bl-2xl flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#012758] animate-ping" />
                <span>Scanner Active</span>
              </div>

              <div className="w-20 h-20 rounded-3xl bg-white border-2 border-[#fda31b]/60 shadow-md flex items-center justify-center mx-auto text-[#012758]">
                <QrCode className="w-10 h-10 text-[#fda31b] animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#9d6500]">
                  Student Verification Desk
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                  Scan Your QR Code
                </h2>
                <p className="text-base sm:text-lg text-[#315172] max-w-lg mx-auto pt-1 font-medium">
                  Please present your Gate Pass or hold your Student ID QR code facing the security scanner.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#d5e0eb] text-xs font-bold text-[#012758] shadow-2xs">
                <FileCheck className="w-4 h-4 text-[#116e63]" />
                <span>Station 1 Ready · Hold Pass Steady in Front of Reader</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 2: STUDENT SCANNED / DETAILS BEING AUTHORIZED AT GATE */}
        {/* ============================================================ */}
        {(mode === 'STUDENT_SCANNED' || mode === 'STUDENT_PROCESS_WAIT' || mode === 'SCANNER_DETECTED') && displayState.student && (
          <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
            <div className="bg-white border-2 border-[#012758] rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-5 py-1.5 bg-[#012758] text-[#fda31b] font-black text-[11px] uppercase tracking-widest rounded-bl-2xl flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#fda31b]" />
                <span>Student Identified</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#e3ebf2]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#012758] to-[#0b3875] border-2 border-[#fda31b] flex items-center justify-center text-white font-serif font-black text-2xl sm:text-3xl shrink-0 shadow-md">
                  {displayState.student.name.charAt(0)}
                </div>

                <div className="text-center sm:text-left">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#f5f9fc] text-[#012758] text-xs font-bold uppercase tracking-wider mb-1.5 border border-[#d5e0eb]">
                    Golden Gate Student Pass Verification
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[#012758] font-crest tracking-tight">
                    {displayState.student.name}
                  </h2>
                  <p className="text-base text-[#315172] font-semibold mt-1">
                    <span className="text-[#012758] font-bold">{displayState.student.house} House</span>
                    {displayState.student.class ? ` · Class ${displayState.student.class}-${displayState.student.section}` : ''}
                    <span className="text-[#688099] font-mono text-sm ml-2">({displayState.student.houseNo})</span>
                  </p>
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-[#688099]">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Duty Guard reviewing pass permissions at Station 1...</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-[#f5f9fc] border border-[#d5e0eb] text-xs font-bold text-[#012758]">
                  <span>Awaiting Guard Confirmation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 3: STUDENT EXIT CONFIRMED (DEPARTURE PERMITTED)        */}
        {/* ============================================================ */}
        {mode === 'STUDENT_OUT_SUCCESS' && displayState.student && (
          <div className="animate-in fade-in zoom-in-95 duration-400 w-full">
            <div className="bg-white border-2 border-[#fda31b] rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-6 py-2 bg-[#fda31b] text-[#012758] font-black text-xs uppercase tracking-widest rounded-bl-2xl flex items-center gap-2 shadow-xs">
                <ArrowRight className="w-4 h-4" />
                <span>Departure Permitted</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#e3ebf2]">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff3d9] text-[#9d6500] text-xs font-bold uppercase tracking-wider mb-2 border border-[#ffe099]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Student Gate Pass Departure
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                    {displayState.student.name}
                  </h2>
                  <p className="text-base sm:text-lg text-[#315172] mt-1.5 font-medium">
                    <span className="text-[#012758] font-bold">{displayState.student.house} House</span>
                    {displayState.student.class ? ` · Class ${displayState.student.class}-${displayState.student.section}` : ''}
                    <span className="text-[#688099] font-mono text-sm ml-2">({displayState.student.houseNo})</span>
                  </p>
                </div>

                <div className="bg-[#f5f9fc] border border-[#d5e0eb] rounded-2xl p-4 text-center min-w-[190px]">
                  <span className="text-[11px] uppercase tracking-wider text-[#688099] block font-bold">Pass Number</span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-[#012758] mt-0.5">
                    {displayState.student.gatePassNo || 'GP-ACTIVE'}
                  </div>
                  <span className="text-[10px] text-[#116e63] font-bold mt-1 block">LOGGED AT GATE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-sm">
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Movement Type</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 block">{displayState.student.movementType || 'Outing'}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Going With / Escort</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 block">{displayState.student.goingWithWhom || 'Self'}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Vehicle Number</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 font-mono block">{displayState.student.vehicleNo || 'N/A'}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Expected Return</span>
                  <span className="text-base font-bold text-[#9d6500] mt-0.5 block">{displayState.student.expectedReturn || 'Same Day'}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-[#688099] pt-4 border-t border-[#e3ebf2]">
                <span className="flex items-center gap-1.5 text-[#116e63] font-bold">
                  <CheckCircle className="w-4 h-4" />
                  Verified by Golden Gate Security Desk
                </span>
                <span className="font-mono">
                  Time OUT: {displayState.student.dateTimeOut ? new Date(displayState.student.dateTimeOut).toLocaleTimeString('en-IN') : currentTime}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 4: STUDENT RETURN CONFIRMED (CAMPUS IN)               */}
        {/* ============================================================ */}
        {mode === 'STUDENT_IN_SUCCESS' && displayState.student && (
          <div className="animate-in fade-in zoom-in-95 duration-400 w-full">
            <div className="bg-white border-2 border-emerald-500 rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-6 py-2 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-bl-2xl flex items-center gap-2 shadow-xs">
                <ArrowLeft className="w-4 h-4" />
                <span>Return Logged</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#e3ebf2]">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Welcome Back to Campus
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                    {displayState.student.name}
                  </h2>
                  <p className="text-base sm:text-lg text-[#315172] mt-1.5 font-medium">
                    <span className="text-[#012758] font-bold">{displayState.student.house} House</span>
                    <span className="text-[#688099] font-mono text-sm ml-2">({displayState.student.houseNo})</span>
                  </p>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 text-center min-w-[190px]">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-800 block font-bold">Status</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-0.5">
                    ON CAMPUS
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono mt-1 block">Pass Closed</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-sm">
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Dropped by / Arrived With</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 block">{displayState.student.whoDropped || 'Direct Walk-in'}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Gate Pass Ref</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 font-mono block">{displayState.student.gatePassNo || 'GP-COMPLETED'}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Arrival Time</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 font-mono block">
                    {displayState.student.dateTimeIn ? new Date(displayState.student.dateTimeIn).toLocaleTimeString('en-IN') : currentTime}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-[#688099] pt-4 border-t border-[#e3ebf2]">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Student safely recorded on campus
                </span>
                <span>Safe in House Quarters</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 5: GUARD CLICKED 'NEW VISITOR' (AWAITING DETAILS)      */}
        {/* ============================================================ */}
        {mode === 'VISITOR_REGISTER' && (
          <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
            <div className="bg-[#f5f9fc] border-2 border-[#012758] rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-5 py-1.5 bg-[#012758] text-[#fda31b] font-black text-[11px] uppercase tracking-widest rounded-bl-2xl flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#fda31b] animate-ping" />
                <span>Registration Active</span>
              </div>

              <div className="w-20 h-20 rounded-3xl bg-white border-2 border-[#012758]/30 shadow-md flex items-center justify-center mx-auto text-[#012758]">
                <UserCheck className="w-10 h-10 text-[#012758]" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#012758]">
                  Guest Access Control
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                  Give Your Details for Entry
                </h2>
                <p className="text-base sm:text-lg text-[#315172] max-w-lg mx-auto pt-1 font-medium">
                  Please provide your details to the security officer on duty for pass issuance:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left text-xs font-bold text-[#012758]">
                <div className="bg-white border border-[#d5e0eb] rounded-xl p-3 shadow-2xs">
                  <span className="text-[#688099] text-[10px] block font-semibold">Requirement 1</span>
                  <span>Full Name & Phone Number</span>
                </div>
                <div className="bg-white border border-[#d5e0eb] rounded-xl p-3 shadow-2xs">
                  <span className="text-[#688099] text-[10px] block font-semibold">Requirement 2</span>
                  <span>Vehicle Number (if any)</span>
                </div>
                <div className="bg-white border border-[#d5e0eb] rounded-xl p-3 shadow-2xs">
                  <span className="text-[#688099] text-[10px] block font-semibold">Requirement 3</span>
                  <span>Whom to Meet & Purpose</span>
                </div>
              </div>

              {displayState.visitor?.headVisitorName && displayState.visitor.headVisitorName !== 'New Visitor' && displayState.visitor.headVisitorName !== 'Prospective Visitor' && (
                <div className="pt-2 text-xs font-mono text-[#012758] font-bold">
                  Currently Registering: {displayState.visitor.headVisitorName}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 6: VISITOR PASS ISSUED (ENTRY AUTHORIZED)             */}
        {/* ============================================================ */}
        {mode === 'VISITOR_IN_SUCCESS' && displayState.visitor && (
          <div className="animate-in fade-in zoom-in-95 duration-400 w-full">
            <div className="bg-white border-2 border-[#012758] rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-6 py-2 bg-[#012758] text-[#fda31b] font-black text-xs uppercase tracking-widest rounded-bl-2xl flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Visitor Pass Issued</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#e3ebf2]">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f9fc] text-[#012758] text-xs font-bold uppercase tracking-wider mb-2 border border-[#d5e0eb]">
                    <Sparkles className="w-3.5 h-3.5 text-[#fda31b]" />
                    Welcome Guest to Birla Public School
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                    {displayState.visitor.headVisitorName}
                  </h2>
                  <p className="text-base sm:text-lg text-[#315172] mt-1.5 font-medium">
                    Total Visitors: <strong className="text-[#012758]">{displayState.visitor.totalVisitors} Person(s)</strong>
                  </p>
                </div>

                <div className="bg-[#f5f9fc] border border-[#d5e0eb] rounded-2xl p-4 text-center min-w-[190px]">
                  <span className="text-[11px] uppercase tracking-wider text-[#688099] block font-bold">Visitor Pass</span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-[#012758] mt-0.5">
                    {displayState.visitor.passNumber}
                  </div>
                  <span className="text-[10px] text-[#116e63] font-bold mt-1 block">AUTHORIZED ENTRY</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-sm">
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Whom to Meet</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 block">{displayState.visitor.whomToMeet}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Purpose of Visit</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 block">{displayState.visitor.purposeReason}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Vehicle Number</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 font-mono block">{displayState.visitor.vehicleNumber || 'Walk-in'}</span>
                </div>
                <div className="bg-[#f5f9fc] border border-[#e3ebf2] rounded-xl p-3.5">
                  <span className="text-xs text-[#688099] block font-medium">Check-in Time</span>
                  <span className="text-base font-bold text-[#012758] mt-0.5 font-mono block">
                    {displayState.visitor.dateTimeIn ? new Date(displayState.visitor.dateTimeIn).toLocaleTimeString('en-IN') : currentTime}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-[#688099] pt-4 border-t border-[#e3ebf2]">
                <span className="text-[#116e63] font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Security Cleared for Campus Entry
                </span>
                <span>Please return visitor badge at the gate upon departure</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 7: GUARD CLICKED 'PROCESS VISITOR OUT'                 */}
        {/* ============================================================ */}
        {mode === 'VISITOR_OUT_WAIT' && (
          <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
            <div className="bg-[#f5f9fc] border-2 border-[#d5e0eb] rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-white border border-[#d5e0eb] shadow-md flex items-center justify-center mx-auto text-[#012758]">
                <Building2 className="w-10 h-10 text-[#19558a]" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#688099]">
                  Visitor Departure Desk
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                  Visitor Check-Out
                </h2>
                <p className="text-base text-[#315172] max-w-lg mx-auto font-medium">
                  Please return your visitor badge to the security officer on duty to complete check-out.
                </p>
                {displayState.visitor?.headVisitorName && (
                  <p className="text-sm font-bold text-[#012758] pt-1">
                    Pass: {displayState.visitor.passNumber} · {displayState.visitor.headVisitorName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 8: VISITOR CHECK-OUT COMPLETED                        */}
        {/* ============================================================ */}
        {mode === 'VISITOR_OUT_SUCCESS' && displayState.visitor && (
          <div className="animate-in fade-in zoom-in-95 duration-400 w-full">
            <div className="bg-white border-2 border-[#d5e0eb] rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-6 py-2 bg-[#012758] text-white font-black text-xs uppercase tracking-widest rounded-bl-2xl flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                <span>Check-out Completed</span>
              </div>

              <div className="pb-6 border-b border-[#e3ebf2]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f9fc] text-[#688099] text-xs font-bold uppercase tracking-wider mb-2 border border-[#e3ebf2]">
                  Thank You for Visiting BPS Pilani
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#012758] font-crest tracking-tight">
                  {displayState.visitor.headVisitorName}
                </h2>
                <p className="text-[#315172] mt-1.5 font-mono text-sm">
                  Pass Number: <strong className="text-[#012758]">{displayState.visitor.passNumber}</strong> · Visit Concluded
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-[#688099]">
                <span className="text-[#116e63] font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Departure recorded by Golden Gate Security Desk
                </span>
                <span className="font-mono">
                  Time OUT: {displayState.visitor.dateTimeOut ? new Date(displayState.visitor.dateTimeOut).toLocaleTimeString('en-IN') : currentTime}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DEFAULT STATE: CLEAN, PURE, MINIMAL STATIC WELCOME SCREEN   */}
        {/* ============================================================ */}
        {mode === 'IDLE' && (
          <div className="text-center space-y-6 animate-in fade-in duration-600">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#012758] to-[#0b3875] border-2 border-[#fda31b] shadow-xl flex items-center justify-center mx-auto text-[#fda31b]">
              <span className="font-serif font-black text-2xl tracking-wider">
                BPS
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl sm:text-6xl font-black text-[#012758] tracking-tight font-crest leading-tight">
                Welcome to Vidya Niketan
              </h2>

              <p className="text-2xl sm:text-4xl font-serif text-[#9d6500] font-bold tracking-wide">
                Birla Public School, Pilani
              </p>

              <div className="pt-2">
                <span className="inline-block px-5 py-2 rounded-full bg-[#f5f9fc] border border-[#d5e0eb] text-sm sm:text-base text-[#688099] font-medium tracking-wide">
                  विद्या निकेतन — तमसो मा ज्योतिर्गमय · Estd. 1944
                </span>
              </div>
            </div>

            <div className="pt-6">
              <p className="text-xs text-[#688099] font-medium uppercase tracking-widest">
                Golden Gate Security Desk · Monitor 2
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 3. MINIMAL FOOTER (Hidden in compact desk mirror mode) */}
      {!isMirror && (
        <footer className="relative z-10 border-t border-[#e3ebf2] bg-white px-6 sm:px-12 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#688099] gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#116e63]" />
            <span className="font-medium">Golden Gate Security Management System · Birla Public School, Pilani</span>
          </div>
          <div className="text-[11px] font-mono text-[#688099]">
            <span>Vidya Niketan · Public Screen 2</span>
          </div>
        </footer>
      )}
    </div>
  );
};
