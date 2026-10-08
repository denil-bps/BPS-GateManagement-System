import React, { useState } from 'react';
import {
  QrCode,
  UserPlus,
  Users,
  LogOut,
  ArrowRight,
  Printer,
  Search,
  Monitor,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Student, StudentMovement, VisitorGroup } from '../../types';
import { PublicDisplay } from '../public/PublicDisplay';

interface GuardDeskProps {
  students: Student[];
  movements: StudentMovement[];
  visitors: VisitorGroup[];
  onOpenScanner: () => void;
  onOpenNewVisitor: () => void;
  onOpenVisitorOut: (visitor?: VisitorGroup) => void;
  onProcessStudentQr: (qrOrAdmission: string) => void;
  onPrintMovementPass: (movement: StudentMovement) => void;
  onPrintVisitorPass: (visitor: VisitorGroup) => void;
  onOpenPublicDisplay: () => void;
  onSelectTab: (tab: 'guard' | 'movements' | 'visitors' | 'admin' | 'public_preview') => void;
}

export const GuardDesk: React.FC<GuardDeskProps> = ({
  students,
  movements,
  visitors,
  onOpenScanner,
  onOpenNewVisitor,
  onOpenVisitorOut,
  onProcessStudentQr,
  onPrintMovementPass,
  onPrintVisitorPass,
  onOpenPublicDisplay,
  onSelectTab,
}) => {
  const [quickInput, setQuickInput] = useState<string>('');
  const [showPublicMirror, setShowPublicMirror] = useState<boolean>(true);

  const outsideStudents = students.filter((s) => s.status === 'OUTSIDE');
  const onCampusStudents = students.filter((s) => s.status === 'ON_CAMPUS');
  const onCampusVisitors = visitors.filter((v) => v.status === 'ON_CAMPUS');

  // Filter today's movements
  const today = new Date().toISOString().slice(0, 10);
  const todayMovements = movements.filter((m) => m.dateTimeOut && m.dateTimeOut.startsWith(today));
  const todayVisitors = visitors.filter((v) => v.dateTimeIn && v.dateTimeIn.startsWith(today));

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      onProcessStudentQr(quickInput.trim());
      setQuickInput('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Bar */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#e8f1fa] text-[#012758] border border-[#d5e0eb] rounded-xl shrink-0">
            <Shield className="w-6 h-6 text-[#012758]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[#012758] tracking-tight">
                Golden Gate Guard Terminal
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40">
                ACTIVE GATE STATION
              </span>
            </div>
            <p className="text-xs text-[#315172] mt-0.5">
              Dual-Monitor Hardware: Guard Operations on Monitor 1 · Public Display synced to Monitor 2
            </p>
          </div>
        </div>

        {/* Large Hardware Monitor 2 Button */}
        <button
          onClick={onOpenPublicDisplay}
          className="w-full md:w-auto px-5 py-3 bg-[#fda31b] hover:bg-[#e59214] text-[#012758] font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
        >
          <Monitor className="w-4 h-4" />
          <span>OPEN PUBLIC DISPLAY (MONITOR 2)</span>
        </button>
      </div>

      {/* Real-time Monitor 2 Mirror Preview on Desk */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#012758] font-crest flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#fda31b]" />
              <span>Monitor 2 Live Mirror (Public Screen Feed)</span>
            </h3>
            <span className="text-[10px] bg-[#e8f1fa] text-[#19558a] px-2 py-0.5 rounded-full font-mono font-bold hidden sm:inline-block">
              Live Synced
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPublicMirror(!showPublicMirror)}
              className="text-xs text-[#19558a] hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              {showPublicMirror ? (
                <>
                  <span>Hide Mirror</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Show Mirror</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenPublicDisplay}
              className="text-xs text-[#9d6500] hover:underline font-bold cursor-pointer hidden sm:flex items-center gap-1"
            >
              <span>Full Screen Window ↗</span>
            </button>
          </div>
        </div>

        {showPublicMirror && (
          <div className="mt-3 border-2 border-[#012758] rounded-xl overflow-hidden shadow-xs bg-white">
            <PublicDisplay isMirror />
          </div>
        )}
      </div>

      {/* Primary 4 Operational Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* ACTION 1: SCAN STUDENT QR */}
        <button
          onClick={onOpenScanner}
          className="p-5 bg-white hover:bg-[#f5f9fc] border-2 border-[#012758] rounded-2xl text-left shadow-xs transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#012758] text-white rounded-xl transition-colors shadow-xs group-hover:bg-[#073a7d]">
              <QrCode className="w-6 h-6 text-[#fda31b]" />
            </div>
            <span className="text-[11px] font-mono font-bold text-[#19558a] group-hover:underline flex items-center gap-1">
              Webcam Scanner →
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-[#012758] tracking-tight">
              SCAN STUDENT QR
            </h3>
            <p className="text-xs text-[#688099] mt-1">
              Process OUT departure or IN return via webcam
            </p>
          </div>
        </button>

        {/* ACTION 2: NEW VISITOR */}
        <button
          onClick={onOpenNewVisitor}
          className="p-5 bg-white hover:bg-[#f5f9fc] border-2 border-[#19558a] rounded-2xl text-left shadow-xs transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#19558a] text-white rounded-xl transition-colors shadow-xs group-hover:bg-[#073a7d]">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-mono font-bold text-[#19558a] group-hover:underline flex items-center gap-1">
              Issue Pass →
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-[#012758] tracking-tight">
              NEW VISITOR
            </h3>
            <p className="text-xs text-[#688099] mt-1">
              Register head visitor & accompanying party
            </p>
          </div>
        </button>

        {/* ACTION 3: PROCESS VISITOR OUT */}
        <button
          onClick={() => onOpenVisitorOut()}
          className="p-5 bg-white hover:bg-[#f5f9fc] border-2 border-[#d5e0eb] hover:border-[#19558a] rounded-2xl text-left shadow-xs transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#e8f1fa] text-[#19558a] rounded-xl transition-colors shadow-xs">
              <LogOut className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-[#116e63] bg-[#e7f5f1] px-2 py-0.5 rounded-full">
              {onCampusVisitors.length} On Campus
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-[#012758] tracking-tight">
              PROCESS VISITOR OUT
            </h3>
            <p className="text-xs text-[#688099] mt-1">
              Check out departing visitor group
            </p>
          </div>
        </button>

        {/* ACTION 4: ACTIVE MOVEMENTS */}
        <button
          onClick={() => onSelectTab('movements')}
          className="p-5 bg-white hover:bg-[#f5f9fc] border-2 border-[#d5e0eb] hover:border-[#012758] rounded-2xl text-left shadow-xs transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[145px]"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-[#fff3d9] text-[#9d6500] rounded-xl transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-[#9d6500] bg-[#fff3d9] px-2 py-0.5 rounded-full">
              {outsideStudents.length} Outside
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-[#012758] tracking-tight">
              ACTIVE MOVEMENTS
            </h3>
            <p className="text-xs text-[#688099] mt-1">
              View currently outside students & passes
            </p>
          </div>
        </button>

      </div>

      {/* Quick Barcode Scanner Gun / Admission No. Input Bar */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#19558a]" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Barcode scanner gun input, Student ID, or Admission No. (e.g. 12455, BPSST5012455)..."
              className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#012758] focus:bg-white font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
          >
            Fetch Student Record
          </button>
        </form>

        {/* Database Search hint */}
        <div className="mt-3 pt-3 border-t border-[#e3ebf2] text-xs text-[#688099] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            {students.length > 0 ? (
              <span>Total <strong className="text-[#012758]">{students.length}</strong> students registered. Scan ID card or type admission number.</span>
            ) : (
              <span className="text-[#9d6500]">
                Database is currently empty. Go to <strong>Admin Dashboard &gt; Bulk Import</strong> to add students via Excel/CSV.
              </span>
            )}
          </span>
          {students.length === 0 && (
            <button
              onClick={() => onSelectTab('admin')}
              className="text-xs font-bold text-[#19558a] hover:underline flex items-center gap-1"
            >
              <span>Add Students in Admin</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Live Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#d5e0eb] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#688099] block font-semibold">Students On Campus</span>
          <div className="text-2xl font-black font-mono-numbers text-[#116e63] mt-1">
            {onCampusStudents.length}
          </div>
          <span className="text-[10px] text-[#688099]">Present in houses</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#688099] block font-semibold">Students Outside</span>
          <div className="text-2xl font-black font-mono-numbers text-[#9d6500] mt-1">
            {outsideStudents.length}
          </div>
          <span className="text-[10px] text-[#688099]">Active gate passes</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#688099] block font-semibold">Visitors On Campus</span>
          <div className="text-2xl font-black font-mono-numbers text-[#19558a] mt-1">
            {onCampusVisitors.length}
          </div>
          <span className="text-[10px] text-[#688099]">Active visitor passes</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#688099] block font-semibold">Today's Gate Moves</span>
          <div className="text-2xl font-black font-mono-numbers text-[#012758] mt-1">
            {todayMovements.length + todayVisitors.length}
          </div>
          <span className="text-[10px] text-[#688099]">Logged today</span>
        </div>
      </div>

      {/* Today's Activity & Active Gate Movements Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Active Outside Students */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-[#d5e0eb] flex items-center justify-between bg-[#f5f9fc]">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-[#9d6500]" />
              <h3 className="text-sm font-bold text-[#012758]">
                Currently Outside Students ({outsideStudents.length})
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('movements')}
              className="text-xs text-[#19558a] font-bold hover:underline cursor-pointer"
            >
              View Full Log →
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[380px] space-y-2.5">
            {outsideStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#688099] border border-dashed border-[#d5e0eb] rounded-xl bg-[#f5f9fc]">
                All students currently accounted for on school campus. No active gate departures.
              </div>
            ) : (
              outsideStudents.map((st) => {
                const activeMov = movements.find(
                  (m) => m.studentId === st.id && m.status === 'OUTSIDE'
                );
                return (
                  <div
                    key={st.id}
                    className="p-3 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl flex items-center justify-between gap-3 hover:border-[#19558a] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 rounded bg-white overflow-hidden border border-[#d5e0eb] shrink-0 flex items-center justify-center font-bold text-xs text-[#012758]">
                        BPS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#012758]">{st.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#fff3d9] text-[#9d6500] border border-[#fda31b]/60 font-bold">
                            {st.house}
                          </span>
                        </div>
                        <p className="text-xs text-[#315172]">
                          Pass: <span className="font-mono text-[#012758] font-bold">{activeMov?.gatePassNo || 'N/A'}</span> · {activeMov?.movementType}
                        </p>
                        <p className="text-[10px] text-[#688099]">
                          OUT: {activeMov?.dateTimeOut ? new Date(activeMov.dateTimeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeMov && (
                        <button
                          onClick={() => onPrintMovementPass(activeMov)}
                          title="Print Pass Slip"
                          className="p-2 rounded-lg bg-white hover:bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb] transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onProcessStudentQr(st.qrId)}
                        className="px-3 py-1.5 rounded-lg bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Mark Return (IN)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Visitors On Campus */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-[#d5e0eb] flex items-center justify-between bg-[#f5f9fc]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#116e63]" />
              <h3 className="text-sm font-bold text-[#012758]">
                Active Visitors On Campus ({onCampusVisitors.length})
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('visitors')}
              className="text-xs text-[#19558a] font-bold hover:underline cursor-pointer"
            >
              View Full Log →
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[380px] space-y-2.5">
            {onCampusVisitors.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#688099] border border-dashed border-[#d5e0eb] rounded-xl bg-[#f5f9fc]">
                No active visitor groups currently registered on campus.
              </div>
            ) : (
              onCampusVisitors.map((v) => (
                <div
                  key={v.id}
                  className="p-3 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl flex items-center justify-between gap-3 hover:border-[#19558a] transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#012758]">{v.headVisitorName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40 font-bold">
                        {v.passNumber}
                      </span>
                      <span className="text-xs text-[#688099]">
                        ({v.totalVisitors} {v.totalVisitors > 1 ? 'persons' : 'person'})
                      </span>
                    </div>
                    <p className="text-xs text-[#315172] mt-0.5">
                      Visiting: <span className="text-[#012758] font-semibold">{v.whomToMeet}</span>
                    </p>
                    <p className="text-[10px] text-[#688099] font-mono">
                      Vehicle: {v.vehicleNumber} · IN: {new Date(v.dateTimeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onPrintVisitorPass(v)}
                      title="Print Pass Slip"
                      className="p-2 rounded-lg bg-white hover:bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb] transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenVisitorOut(v)}
                      className="px-3 py-1.5 rounded-lg bg-[#19558a] hover:bg-[#073a7d] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Process Exit (OUT)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
