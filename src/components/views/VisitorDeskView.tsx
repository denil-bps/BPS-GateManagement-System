import React, { useState } from 'react';
import {
  UserPlus,
  LogOut,
  Search,
  Printer,
  Clock,
  Car,
  Phone,
  Building,
  Mail,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { VisitorGroup } from '../../types';

interface VisitorDeskViewProps {
  visitors: VisitorGroup[];
  onOpenNewVisitor: () => void;
  onCheckoutVisitor: (visitorIdOrPass: string) => void;
  onPrintVisitorPass: (visitor: VisitorGroup) => void;
  onResendEmail?: (visitor: VisitorGroup) => void;
}

export const VisitorDeskView: React.FC<VisitorDeskViewProps> = ({
  visitors,
  onOpenNewVisitor,
  onCheckoutVisitor,
  onPrintVisitorPass,
  onResendEmail,
}) => {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ON_CAMPUS' | 'CHECKED_OUT' | 'ALL'>('ON_CAMPUS');

  const onCampusCount = visitors.filter((v) => v.status === 'ON_CAMPUS').length;

  const filtered = visitors.filter((v) => {
    const matchesSearch =
      v.headVisitorName.toLowerCase().includes(search.toLowerCase()) ||
      v.passNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.phone.includes(search) ||
      v.whomToMeet.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-[#012758] tracking-tight">
              Visitor Gate Management & Passes
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40">
              {onCampusCount} Active On Campus
            </span>
          </div>
          <p className="text-xs text-[#315172] mt-1">
            Golden Gate visitor groups with accompanying persons, vehicle records, and checkouts
          </p>
        </div>

        <button
          onClick={onOpenNewVisitor}
          className="px-5 py-2.5 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-[#fda31b]" />
          <span>REGISTER NEW VISITOR</span>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-[#d5e0eb] rounded-2xl justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#19558a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Visitor Name, Pass No (VP-...), Phone, Vehicle or Whom To Meet..."
            className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#012758] focus:bg-white font-mono"
          />
        </div>

        <div className="flex flex-wrap bg-[#f5f9fc] p-1 rounded-xl border border-[#d5e0eb] text-xs">
          <button
            onClick={() => setStatusFilter('ON_CAMPUS')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ON_CAMPUS'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            On Campus ({onCampusCount})
          </button>
          <button
            onClick={() => setStatusFilter('CHECKED_OUT')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'CHECKED_OUT'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            Checked Out
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            All Visitors
          </button>
        </div>
      </div>

      {/* Visitor Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#d5e0eb] rounded-2xl p-12 text-center text-xs text-[#688099] shadow-xs">
            {visitors.length === 0
              ? 'No visitors registered in database yet. Click "REGISTER NEW VISITOR" to issue the first pass.'
              : 'No visitors found matching your search.'}
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="bg-white border border-[#d5e0eb] hover:border-[#19558a] rounded-2xl p-4 transition-all shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left: Lead Visitor & Party */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-[#012758]">{v.headVisitorName}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb]">
                    {v.passNumber}
                  </span>
                  <span className="text-xs text-[#688099] font-medium">
                    Party of <strong className="text-[#012758]">{v.totalVisitors}</strong>
                  </span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      v.status === 'ON_CAMPUS'
                        ? 'bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {v.status === 'ON_CAMPUS' ? 'ON CAMPUS' : 'CHECKED OUT'}
                  </span>
                </div>

                {v.accompanyingNames && v.accompanyingNames.length > 0 && (
                  <div className="text-xs text-[#315172]">
                    Accompanying:{' '}
                    <span className="text-[#012758] font-medium">{v.accompanyingNames.join(', ')}</span>
                  </div>
                )}

                <div className="text-xs text-[#315172] flex items-center gap-3 flex-wrap pt-0.5">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-[#19558a]" />
                    <span>Meeting: <strong className="text-[#012758]">{v.whomToMeet}</strong></span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-[#19558a]" />
                    <span className="font-mono text-[#012758]">{v.vehicleNumber}</span>
                  </span>
                  {v.phone && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#19558a]" />
                        <span className="font-mono text-[#012758]">{v.phone}</span>
                      </span>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-[#688099] flex items-center gap-3 flex-wrap">
                  <span>Purpose: <span className="text-[#173a5f]">{v.purposeReason}</span></span>

                  {v.email && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.emailStatus === 'Sent'
                          ? 'bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/30'
                          : v.emailStatus === 'Failed'
                          ? 'bg-[#fff0ee] text-[#ae4439] border border-[#ae4439]/30'
                          : 'bg-[#fff3d9] text-[#9d6500] border border-[#fda31b]/40'
                      }`}
                      title={`Email: ${v.email} (${v.emailStatus || 'Pending'})`}
                    >
                      {v.emailStatus === 'Sent' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : v.emailStatus === 'Failed' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>
                        Email {v.emailStatus || 'Pending'} ({v.email.split('@')[0]}@...)
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Timestamp & Check Out Action */}
              <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-[#e3ebf2]">
                <div className="text-left md:text-right text-xs">
                  <div className="font-mono text-[#173a5f] font-medium flex items-center gap-1 md:justify-end">
                    <Clock className="w-3.5 h-3.5 text-[#19558a]" />
                    <span>IN: {new Date(v.dateTimeIn).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  </div>

                  {v.dateTimeOut ? (
                    <div className="text-[11px] font-mono text-[#116e63] font-bold mt-0.5">
                      OUT: {new Date(v.dateTimeOut).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#116e63] font-bold mt-0.5">
                      Present On School Grounds
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {v.email && onResendEmail && (
                    <button
                      onClick={() => onResendEmail(v)}
                      title={
                        v.emailStatus === 'Failed'
                          ? 'Retry sending failed visitor pass email'
                          : 'Resend digital pass & PDF to visitor email'
                      }
                      className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                        v.emailStatus === 'Failed'
                          ? 'bg-[#fff0ee] hover:bg-[#fde2e0] text-[#ae4439] border-[#ae4439]/40'
                          : 'bg-white hover:bg-[#e8f1fa] text-[#012758] border-[#d5e0eb]'
                      }`}
                    >
                      <Mail className="w-4 h-4 text-[#19558a]" />
                      <span className="hidden sm:inline">
                        {v.emailStatus === 'Failed' ? 'Retry Email' : 'Resend'}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => onPrintVisitorPass(v)}
                    title="Print Visitor Pass Slip"
                    className="p-2 rounded-xl bg-white hover:bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb] transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {v.status === 'ON_CAMPUS' && (
                    <button
                      onClick={() => onCheckoutVisitor(v.id)}
                      className="px-4 py-2 bg-[#19558a] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#fda31b]" />
                      <span>Check Out (OUT)</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
