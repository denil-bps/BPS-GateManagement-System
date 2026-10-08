import React, { useState } from 'react';
import {
  Search,
  Filter,
  Printer,
  Clock,
  ArrowRight,
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  StudentMovement,
  Student,
  ALL_HOUSES,
  SENIOR_HOUSES,
  MIDDLE_HOUSES,
  JUNIOR_HOUSES,
  EmailStatus,
} from '../../types';

interface ActiveMovementsViewProps {
  movements: StudentMovement[];
  students: Student[];
  onProcessStudentIn: (studentQrOrId: string) => void;
  onPrintMovementPass: (movement: StudentMovement) => void;
  onResendEmail?: (movement: StudentMovement) => void;
}

export const ActiveMovementsView: React.FC<ActiveMovementsViewProps> = ({
  movements,
  students,
  onProcessStudentIn,
  onPrintMovementPass,
  onResendEmail,
}) => {
  const [search, setSearch] = useState<string>('');
  const [houseFilter, setHouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'OUTSIDE' | 'ALL' | 'COMPLETED'>('OUTSIDE');

  const filtered = movements.filter((m) => {
    const matchesSearch =
      m.studentName.toLowerCase().includes(search.toLowerCase()) ||
      m.gatePassNo.toLowerCase().includes(search.toLowerCase()) ||
      m.houseNo.toLowerCase().includes(search.toLowerCase()) ||
      m.goingWithWhom.toLowerCase().includes(search.toLowerCase());
    let matchesHouse = true;
    if (houseFilter === 'ALL') {
      matchesHouse = true;
    } else if (houseFilter === 'SEC_SENIOR') {
      matchesHouse = SENIOR_HOUSES.includes(m.house);
    } else if (houseFilter === 'SEC_MIDDLE') {
      matchesHouse = MIDDLE_HOUSES.includes(m.house);
    } else if (houseFilter === 'SEC_JUNIOR') {
      matchesHouse = JUNIOR_HOUSES.includes(m.house);
    } else {
      matchesHouse = m.house === houseFilter;
    }

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'OUTSIDE' && m.status === 'OUTSIDE') ||
      (statusFilter === 'COMPLETED' && m.status === 'COMPLETED');
    return matchesSearch && matchesHouse && matchesStatus;
  });

  const outsideCount = movements.filter((m) => m.status === 'OUTSIDE').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-[#012758] tracking-tight">
              Active Student Movements Register
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#fff3d9] text-[#9d6500] border border-[#fda31b]/60">
              {outsideCount} Currently Outside
            </span>
          </div>
          <p className="text-xs text-[#315172] mt-1">
            Golden Gate physical gate pass tracking with departure and arrival timestamps
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex flex-wrap bg-[#f5f9fc] p-1 rounded-xl border border-[#d5e0eb] text-xs">
          <button
            onClick={() => setStatusFilter('OUTSIDE')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'OUTSIDE'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            Outside ({outsideCount})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            Returned Today
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            All Passes
          </button>
        </div>
      </div>

      {/* Search & House Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-[#d5e0eb] rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#19558a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, Gate Pass No, House No, or Escort..."
            className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#012758] focus:bg-white font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#19558a]" />
          <select
            value={houseFilter}
            onChange={(e) => setHouseFilter(e.target.value)}
            className="bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#012758] cursor-pointer font-medium"
          >
            <option value="ALL">All Houses & Sections</option>
            
            <optgroup label="Section Filters">
              <option value="SEC_SENIOR">All Senior Section (PAN, PAT, KAN, KAT, VYAS)</option>
              <option value="SEC_MIDDLE">All Middle Section (GH, MH, DH, BH, VH)</option>
              <option value="SEC_JUNIOR">All Junior Section (KUMAR, SG1, BAL, KISHO)</option>
            </optgroup>

            <optgroup label="Senior Section">
              <option value="Panini">PAN — Panini House</option>
              <option value="Patanjali">PAT — Patanjali House</option>
              <option value="Kanad">KAN — Kanad House</option>
              <option value="Katyayan">KAT — Katyayan House</option>
              <option value="Vyas">VYAS — Vyas House</option>
            </optgroup>

            <optgroup label="Middle Section (Pre-Hyphen Active)">
              <option value="Gurunanak">GH — Gurunanak House</option>
              <option value="Mahavir">MH — Mahavir House</option>
              <option value="Dayanand">DH — Dayanand House</option>
              <option value="Buddha">BH — Buddha House</option>
              <option value="Vivekananda">VH — Vivekananda House</option>
            </optgroup>

            <optgroup label="Junior Section">
              <option value="Kumar">KUMAR — Kumar House</option>
              <option value="Shishu Griha 1">SG1 — Shishu Griha 1</option>
              <option value="Bal">BAL — Bal House</option>
              <option value="Kishore">KISHO — Kishore House</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Movements Grid / Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#d5e0eb] rounded-2xl p-12 text-center text-xs text-[#688099] shadow-xs">
            {movements.length === 0
              ? 'No student gate movements recorded in database yet.'
              : 'No gate movements found matching your filters.'}
          </div>
        ) : (
          filtered.map((m) => {
            const student = students.find((s) => s.id === m.studentId);
            return (
              <div
                key={m.id}
                className="bg-white border border-[#d5e0eb] hover:border-[#19558a] rounded-2xl p-4 transition-all shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Student & Pass Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-14 rounded-xl bg-[#f5f9fc] overflow-hidden border border-[#d5e0eb] shrink-0 shadow-2xs flex items-center justify-center font-bold text-xs text-[#012758]">
                    BPS
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-[#012758]">{m.studentName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f5f9fc] text-[#012758] border border-[#d5e0eb]">
                        {m.house} House
                      </span>
                      <span className="text-[11px] font-mono text-[#688099]">
                        {m.houseNo}
                      </span>
                    </div>

                    <div className="text-xs text-[#315172] flex items-center gap-2 flex-wrap">
                      <span>Pass: <strong className="font-mono text-[#012758] font-bold">{m.gatePassNo}</strong></span>
                      <span>·</span>
                      <span className="font-bold text-[#19558a]">{m.movementType}</span>
                      <span>·</span>
                      <span className="text-[#688099]">With: {m.goingWithWhom}</span>
                    </div>

                    <div className="text-[11px] text-[#688099] flex items-center gap-3 flex-wrap">
                      <span>Reason: <span className="text-[#173a5f]">{m.purposeReason}</span></span>

                      {/* Email Status Indicator */}
                      {m.emailStatus && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.emailStatus === 'Sent'
                              ? 'bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/30'
                              : m.emailStatus === 'Failed'
                              ? 'bg-[#fff0ee] text-[#ae4439] border border-[#ae4439]/30'
                              : 'bg-[#fff3d9] text-[#9d6500] border border-[#fda31b]/40'
                          }`}
                          title={
                            m.recipientEmail
                              ? `Email: ${m.recipientEmail} (${m.emailStatus})`
                              : `Status: ${m.emailStatus}`
                          }
                        >
                          {m.emailStatus === 'Sent' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : m.emailStatus === 'Failed' ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>
                            Email {m.emailStatus}
                            {m.recipientEmail ? ` (${m.recipientEmail.split('@')[0]}@...)` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Timestamps & Actions */}
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-[#e3ebf2]">
                  <div className="text-left md:text-right text-xs">
                    <div className="font-mono text-[#173a5f] font-medium flex items-center gap-1 md:justify-end">
                      <Clock className="w-3.5 h-3.5 text-[#19558a]" />
                      <span>OUT: {new Date(m.dateTimeOut).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</span>
                    </div>

                    {m.dateTimeIn ? (
                      <div className="text-[11px] font-mono text-[#116e63] font-bold mt-0.5">
                        IN: {new Date(m.dateTimeIn).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })} ({m.whoDropped})
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#9d6500] font-bold mt-0.5">
                        Currently Off Campus
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Resend Email Button */}
                    {onResendEmail && (
                      <button
                        onClick={() => onResendEmail(m)}
                        title={
                          m.emailStatus === 'Failed'
                            ? 'Retry sending failed digital pass email'
                            : 'Send / Resend digital pass & PDF via email'
                        }
                        className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                          m.emailStatus === 'Failed'
                            ? 'bg-[#fff0ee] hover:bg-[#fde2e0] text-[#ae4439] border-[#ae4439]/40'
                            : 'bg-white hover:bg-[#e8f1fa] text-[#012758] border-[#d5e0eb]'
                        }`}
                      >
                        <Mail className="w-4 h-4 text-[#19558a]" />
                        <span className="hidden sm:inline">
                          {m.emailStatus === 'Failed' ? 'Retry Email' : 'Resend'}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => onPrintMovementPass(m)}
                      title="Reprint 4x3 in Pass Slip"
                      className="p-2 rounded-xl bg-white hover:bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb] transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {m.status === 'OUTSIDE' && (
                      <button
                        onClick={() => onProcessStudentIn(m.studentId)}
                        className="px-4 py-2 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        Process Return (IN)
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
