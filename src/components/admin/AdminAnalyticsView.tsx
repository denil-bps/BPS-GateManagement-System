import React from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  UserCheck,
  UserX,
  Compass,
  ArrowRight,
  Home,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileSpreadsheet,
  Download,
  Calendar,
} from 'lucide-react';
import {
  Student,
  StudentMovement,
  VisitorGroup,
  ALL_HOUSES,
  BPSHouse,
  resolveBPSHouse,
  BPS_HOUSES_MAP,
} from '../../types';

interface AdminAnalyticsViewProps {
  students: Student[];
  movements: StudentMovement[];
  visitors: VisitorGroup[];
  onOpenStudentQr?: (student: Student) => void;
  onNavigateToTab?: (tab: 'students' | 'excel' | 'movements' | 'visitors') => void;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  students,
  movements,
  visitors,
  onOpenStudentQr,
  onNavigateToTab,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  // 1. Core Student Metrics
  const totalStudents = students.length;
  const studentsOnCampus = students.filter((s) => s.status === 'ON_CAMPUS').length;
  const studentsOutside = students.filter((s) => s.status === 'OUTSIDE').length;
  const studentsBlocked = students.filter((s) => s.status === 'BLOCKED').length;

  const onCampusPercent = totalStudents > 0 ? Math.round((studentsOnCampus / totalStudents) * 100) : 0;
  const outsidePercent = totalStudents > 0 ? Math.round((studentsOutside / totalStudents) * 100) : 0;
  const blockedPercent = totalStudents > 0 ? Math.round((studentsBlocked / totalStudents) * 100) : 0;

  // 2. Today's Movements
  const todayMovements = movements.filter(
    (m) => m.dateTimeOut && m.dateTimeOut.startsWith(todayStr)
  );
  const todayStudentOut = todayMovements.length;
  const todayStudentIn = movements.filter(
    (m) => m.dateTimeIn && m.dateTimeIn.startsWith(todayStr)
  ).length;

  const returnRatePercent =
    todayStudentOut > 0 ? Math.min(100, Math.round((todayStudentIn / todayStudentOut) * 100)) : 100;

  // 3. Overdue Movements (> 12 hours outside)
  const overdueMovements = movements.filter((m) => {
    if (m.status !== 'OUTSIDE') return false;
    const diffHours = (nowMs - new Date(m.dateTimeOut).getTime()) / (1000 * 60 * 60);
    return diffHours > 12;
  });

  // 4. Visitors Analytics
  const activeVisitorGroups = visitors.filter((v) => v.status === 'ON_CAMPUS');
  const currentVisitorHeadcount = activeVisitorGroups.reduce(
    (acc, v) => acc + (v.totalVisitors || 1),
    0
  );
  const todayVisitorGroups = visitors.filter(
    (v) => v.dateTimeIn && v.dateTimeIn.startsWith(todayStr)
  );
  const todayTotalVisitorHeadcount = todayVisitorGroups.reduce(
    (acc, v) => acc + (v.totalVisitors || 1),
    0
  );
  const todayCheckedOutVisitors = visitors.filter(
    (v) => v.status === 'CHECKED_OUT' && v.dateTimeOut && v.dateTimeOut.startsWith(todayStr)
  ).length;

  // 5. House Breakdown across Senior, Middle, and Junior Sections
  const houseStats = ALL_HOUSES.map((house) => {
    const info = resolveBPSHouse(house);
    const houseStudents = students.filter((s) => s.house === house);
    const total = houseStudents.length;
    const onCampus = houseStudents.filter((s) => s.status === 'ON_CAMPUS').length;
    const outside = houseStudents.filter((s) => s.status === 'OUTSIDE').length;
    const overdue = houseStudents.filter((s) => {
      const activeMov = movements.find(
        (m) => (m.studentId === s.id || m.houseNo === s.houseNo) && m.status === 'OUTSIDE'
      );
      if (!activeMov) return false;
      const diffHours = (nowMs - new Date(activeMov.dateTimeOut).getTime()) / (1000 * 60 * 60);
      return diffHours > 12;
    }).length;
    const percent = total > 0 ? Math.round((onCampus / total) * 100) : 100;
    return {
      house,
      code: Object.values(BPS_HOUSES_MAP).find((m) => m.house === house)?.code || house.slice(0, 3).toUpperCase(),
      section: info.section,
      fullName: info.fullName,
      total,
      onCampus,
      outside,
      overdue,
      percent,
    };
  });

  // 6. Movement Purpose Categorization
  const purposeMap: Record<string, number> = {
    'Market / Town Visit': 0,
    'Medical / Infirmary': 0,
    'Weekend / Home Leave': 0,
    'Official Duty / Sports': 0,
    'Other / Urgent Duty': 0,
  };
  movements.forEach((m) => {
    const reason = (m.purposeReason || '').toLowerCase();
    if (reason.includes('market') || reason.includes('town') || reason.includes('shopping')) {
      purposeMap['Market / Town Visit']++;
    } else if (
      reason.includes('medical') ||
      reason.includes('doctor') ||
      reason.includes('infirmary') ||
      reason.includes('hospital')
    ) {
      purposeMap['Medical / Infirmary']++;
    } else if (
      reason.includes('leave') ||
      reason.includes('home') ||
      reason.includes('weekend') ||
      reason.includes('vacation')
    ) {
      purposeMap['Weekend / Home Leave']++;
    } else if (
      reason.includes('sport') ||
      reason.includes('competition') ||
      reason.includes('match') ||
      reason.includes('official')
    ) {
      purposeMap['Official Duty / Sports']++;
    } else {
      purposeMap['Other / Urgent Duty']++;
    }
  });

  const totalPurposes = Object.values(purposeMap).reduce((a, b) => a + b, 0);

  // 7. Visitor Purpose Categorization
  const visitorPurposeMap: Record<string, number> = {
    'Parent / Ward Visit': 0,
    'Admission Enquiry': 0,
    'Vendor / Contractor': 0,
    'Official Guest / Inspector': 0,
  };
  visitors.forEach((v) => {
    const p = (v.purposeReason || '').toLowerCase();
    if (
      p.includes('parent') ||
      p.includes('ward') ||
      p.includes('meet') ||
      p.includes('child') ||
      p.includes('son') ||
      p.includes('daughter')
    ) {
      visitorPurposeMap['Parent / Ward Visit']++;
    } else if (
      p.includes('admission') ||
      p.includes('enquiry') ||
      p.includes('form') ||
      p.includes('test') ||
      p.includes('interview')
    ) {
      visitorPurposeMap['Admission Enquiry']++;
    } else if (
      p.includes('vendor') ||
      p.includes('contractor') ||
      p.includes('delivery') ||
      p.includes('repair') ||
      p.includes('supply')
    ) {
      visitorPurposeMap['Vendor / Contractor']++;
    } else {
      visitorPurposeMap['Official Guest / Inspector']++;
    }
  });
  const totalVisitorPurposes = Object.values(visitorPurposeMap).reduce((a, b) => a + b, 0);

  // 8. Hourly Traffic Breakdown for Today
  const hourlyTraffic = {
    morning: { out: 0, in: 0, label: '06:00 - 11:59 (Morning)' },
    afternoon: { out: 0, in: 0, label: '12:00 - 16:59 (Afternoon)' },
    evening: { out: 0, in: 0, label: '17:00 - 20:59 (Evening)' },
    night: { out: 0, in: 0, label: '21:00 - 05:59 (Night)' },
  };
  movements.forEach((m) => {
    if (m.dateTimeOut && m.dateTimeOut.startsWith(todayStr)) {
      const h = new Date(m.dateTimeOut).getHours();
      if (h >= 6 && h < 12) hourlyTraffic.morning.out++;
      else if (h >= 12 && h < 17) hourlyTraffic.afternoon.out++;
      else if (h >= 17 && h < 21) hourlyTraffic.evening.out++;
      else hourlyTraffic.night.out++;
    }
    if (m.dateTimeIn && m.dateTimeIn.startsWith(todayStr)) {
      const h = new Date(m.dateTimeIn).getHours();
      if (h >= 6 && h < 12) hourlyTraffic.morning.in++;
      else if (h >= 12 && h < 17) hourlyTraffic.afternoon.in++;
      else if (h >= 17 && h < 21) hourlyTraffic.evening.in++;
      else hourlyTraffic.night.in++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Command Intelligence Header */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-[#012758] tracking-tight font-crest uppercase">
              Executive Analytics & Command
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40">
              LIVE FIRESTORE SYNC
            </span>
          </div>
          <p className="text-xs text-[#315172] mt-0.5">
            Real-time headcount intelligence, student movement ratios, house occupancy, and visitor flow tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('excel')}
              className="flex-1 md:flex-none px-3.5 py-2 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#fda31b]" />
              <span>Bulk Import Roster</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Executive Primary Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Total Enrolled */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#688099]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-[#19558a]" />
          </div>
          <div className="text-2xl font-black font-mono-numbers text-[#012758] mt-1.5">
            {totalStudents}
          </div>
          <span className="text-[10px] text-[#688099]">Enrolled in 8 Houses</span>
        </div>

        {/* Metric 2: Currently On Campus (IN) */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#116e63]">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Campus</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono-numbers text-[#116e63] mt-1.5">
            {studentsOnCampus}
          </div>
          <span className="text-[10px] text-[#116e63] font-bold font-mono">
            {onCampusPercent}% campus presence
          </span>
        </div>

        {/* Metric 3: Currently Outside (OUT) */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#9d6500]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Currently Outside</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono-numbers text-[#9d6500] mt-1.5">
            {studentsOutside}
          </div>
          <span className="text-[10px] text-[#9d6500] font-bold font-mono">
            {outsidePercent}% on active pass
          </span>
        </div>

        {/* Metric 4: Overdue Alert */}
        <div
          className={`border rounded-2xl p-4 shadow-xs ${
            overdueMovements.length > 0
              ? 'bg-[#fff0ee] border-[#ae4439]/40'
              : 'bg-white border-[#d5e0eb]'
          }`}
        >
          <div className="flex items-center justify-between text-[#ae4439]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue Returns</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono-numbers text-[#ae4439] mt-1.5">
            {overdueMovements.length}
          </div>
          <span className="text-[10px] text-[#ae4439] font-medium">
            {overdueMovements.length > 0 ? '> 12 hours outside' : 'Zero overdue'}
          </span>
        </div>

        {/* Metric 5: Today's Movement Flow */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#012758]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Moves</span>
            <TrendingUp className="w-4 h-4 text-[#19558a]" />
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-xl font-black font-mono-numbers text-[#012758]">
              {todayStudentOut} <span className="text-[10px] text-[#688099] font-normal">OUT</span>
            </span>
            <span className="text-xs text-[#d5e0eb]">/</span>
            <span className="text-xl font-black font-mono-numbers text-[#116e63]">
              {todayStudentIn} <span className="text-[10px] text-[#688099] font-normal">IN</span>
            </span>
          </div>
          <span className="text-[10px] text-[#688099]">Return rate: {returnRatePercent}%</span>
        </div>

        {/* Metric 6: Visitors On Premises */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#19558a]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Visitors Active</span>
            <Compass className="w-4 h-4 text-[#fda31b]" />
          </div>
          <div className="text-2xl font-black font-mono-numbers text-[#19558a] mt-1.5">
            {currentVisitorHeadcount}{' '}
            <span className="text-xs font-normal text-[#688099]">people</span>
          </div>
          <span className="text-[10px] text-[#688099]">
            {activeVisitorGroups.length} visitor groups
          </span>
        </div>
      </div>

      {/* Visual Live Campus Occupancy Meter */}
      <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#012758] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#fda31b]" />
              <span>Campus Population Distribution Ratio</span>
            </h3>
            <span className="text-xs text-[#688099]">
              Live proportional split across on-campus residency, active gate passes, and overdue alerts
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold font-mono">
            <span className="flex items-center gap-1.5 text-[#116e63]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#116e63]" />
              On Campus ({onCampusPercent}%)
            </span>
            <span className="flex items-center gap-1.5 text-[#9d6500]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fda31b]" />
              Outside ({outsidePercent}%)
            </span>
            {overdueMovements.length > 0 && (
              <span className="flex items-center gap-1.5 text-[#ae4439]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ae4439]" />
                Overdue ({overdueMovements.length})
              </span>
            )}
          </div>
        </div>

        {/* Multi-segment Bar */}
        <div className="w-full h-4 bg-[#e8f1fa] rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${onCampusPercent}%` }}
            title={`On Campus: ${studentsOnCampus} (${onCampusPercent}%)`}
            className="bg-[#116e63] h-full transition-all duration-500"
          />
          <div
            style={{ width: `${outsidePercent}%` }}
            title={`Outside Campus: ${studentsOutside} (${outsidePercent}%)`}
            className="bg-[#fda31b] h-full transition-all duration-500"
          />
          {blockedPercent > 0 && (
            <div
              style={{ width: `${blockedPercent}%` }}
              title={`Blocked: ${studentsBlocked} (${blockedPercent}%)`}
              className="bg-[#ae4439] h-full transition-all duration-500"
            />
          )}
        </div>
      </div>

      {/* Two Column Grid: House Analytics & Hourly Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: House-by-House Occupancy Breakdown */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#012758] flex items-center gap-2">
                <Home className="w-4 h-4 text-[#fda31b]" />
                <span>House-by-House Residence Analytics</span>
              </h3>
              <p className="text-xs text-[#688099] mt-0.5">
                On-campus safety ratio and pending returns across Senior, Middle, and Junior Houses
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#19558a] bg-[#f5f9fc] px-2 py-0.5 rounded border border-[#d5e0eb]">
              {ALL_HOUSES.length} Houses · 3 Sections
            </span>
          </div>

          <div className="space-y-3">
            {houseStats.map((h) => (
              <div key={h.house} className="p-3 bg-[#f5f9fc] rounded-xl border border-[#e3ebf2] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#012758] bg-white border border-[#d5e0eb] px-1.5 py-0.5 rounded shadow-2xs">
                      {h.code}
                    </span>
                    <span className="font-bold text-[#012758] font-crest">{h.fullName}</span>
                    <span className="text-[10px] text-[#688099]">({h.section} · {h.total})</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[#116e63] font-bold">{h.onCampus} IN</span>
                    <span className="text-[#688099]">•</span>
                    <span className="text-[#9d6500] font-bold">{h.outside} OUT</span>
                    {h.overdue > 0 && (
                      <span className="text-[#ae4439] font-bold bg-[#fff0ee] px-1.5 py-0.2 rounded">
                        {h.overdue} OVERDUE
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#d5e0eb] flex">
                  <div
                    style={{ width: `${h.percent}%` }}
                    className="bg-[#116e63] h-full rounded-full transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 2: Hourly Movement Traffic Distribution */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#012758] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#19558a]" />
                <span>Golden Gate Hourly Rush Traffic</span>
              </h3>
              <p className="text-xs text-[#688099] mt-0.5">
                Today's departure vs arrival volume by operational time window
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#116e63] bg-[#e7f5f1] px-2 py-0.5 rounded border border-[#116e63]/30">
              Today's Flow
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(hourlyTraffic).map(([key, data]) => {
              const maxVol = Math.max(1, data.out + data.in);
              return (
                <div key={key} className="p-3 bg-[#f5f9fc] rounded-xl border border-[#e3ebf2] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#173a5f]">{data.label}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[#012758] font-bold">{data.out} OUT</span>
                      <span className="text-[#688099]">•</span>
                      <span className="text-[#116e63] font-bold">{data.in} IN</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-[#688099] block mb-0.5">Exits (OUT)</span>
                      <div className="w-full h-2 bg-white rounded-full border border-[#d5e0eb] overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (data.out / maxVol) * 100)}%` }}
                          className="bg-[#012758] h-full"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[#688099] block mb-0.5">Returns (IN)</span>
                      <div className="w-full h-2 bg-white rounded-full border border-[#d5e0eb] overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (data.in / maxVol) * 100)}%` }}
                          className="bg-[#116e63] h-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Grid: Purpose Breakdowns (Student Movement vs Visitors) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 3: Movement Purpose Categorization */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#012758] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#fda31b]" />
                <span>Student Movement Reason Breakdown</span>
              </h3>
              <p className="text-xs text-[#688099] mt-0.5">
                All-time categorization of issued physical gate passes
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#688099]">
              {totalPurposes} records
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(purposeMap).map(([reason, count]) => {
              const pct = totalPurposes > 0 ? Math.round((count / totalPurposes) * 100) : 0;
              return (
                <div key={reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#173a5f]">{reason}</span>
                    <span className="font-mono text-[#688099] font-bold">
                      {count} <span className="text-[10px] font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f5f9fc] rounded-full border border-[#d5e0eb] overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-[#012758] h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 4: Visitor Purpose Categorization */}
        <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#012758] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#19558a]" />
                <span>Visitor Inflow & Purpose Intelligence</span>
              </h3>
              <p className="text-xs text-[#688099] mt-0.5">
                Classification of campus visitor groups and meetings
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#116e63] bg-[#e7f5f1] px-2 py-0.5 rounded border border-[#116e63]/30">
              {todayTotalVisitorHeadcount} Visitors Today
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(visitorPurposeMap).map(([purpose, count]) => {
              const pct =
                totalVisitorPurposes > 0 ? Math.round((count / totalVisitorPurposes) * 100) : 0;
              return (
                <div key={purpose} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#173a5f]">{purpose}</span>
                    <span className="font-mono text-[#688099] font-bold">
                      {count} <span className="text-[10px] font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f5f9fc] rounded-full border border-[#d5e0eb] overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-[#19558a] h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#e8f1fa] rounded-xl border border-[#d5e0eb] flex items-center justify-between text-xs mt-4">
            <div>
              <span className="font-bold text-[#012758] block">Today's Completed Visits:</span>
              <span className="text-[11px] text-[#688099]">Groups checked out and departed gate</span>
            </div>
            <span className="text-lg font-black font-mono text-[#116e63]">
              {todayCheckedOutVisitors}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 5: Overdue Student Returns Attention Table */}
      {overdueMovements.length > 0 && (
        <div className="bg-[#fff0ee] border-2 border-[#ae4439]/40 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#ae4439]/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#ae4439] text-white rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#ae4439] uppercase tracking-wide">
                  Urgent Attention: Overdue Student Departures ({overdueMovements.length})
                </h3>
                <p className="text-xs text-[#315172]">
                  These students have exceeded 12 hours outside campus without checking back in at the Golden Gate.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {overdueMovements.map((m) => {
              const diffHours = Math.floor(
                (nowMs - new Date(m.dateTimeOut).getTime()) / (1000 * 60 * 60)
              );
              const matchedStudent = students.find(
                (s) => s.id === m.studentId || s.houseNo === m.houseNo
              );
              return (
                <div
                  key={m.id}
                  className="bg-white border border-[#ae4439]/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#012758] text-sm font-crest">
                        {m.studentName}
                      </span>
                      <span className="font-semibold text-[#012758] bg-[#f5f9fc] px-2 py-0.5 rounded border border-[#d5e0eb]">
                        {m.house} House ({m.houseNo})
                      </span>
                    </div>
                    <div className="text-[11px] text-[#ae4439] font-medium mt-1">
                      Departed: {new Date(m.dateTimeOut).toLocaleString('en-IN')} · Pass: {m.gatePassNo} ·{' '}
                      <strong>{diffHours} hours outside</strong>
                    </div>
                    <div className="text-[11px] text-[#688099] mt-0.5">
                      Going with: {m.goingWithWhom} · Vehicle: {m.vehicleNo} · Reason: {m.purposeReason}
                    </div>
                  </div>

                  {matchedStudent && onOpenStudentQr && (
                    <button
                      type="button"
                      onClick={() => onOpenStudentQr(matchedStudent)}
                      className="px-3 py-1.5 bg-[#f5f9fc] hover:bg-[#e8f1fa] text-[#012758] border border-[#d5e0eb] font-bold text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#19558a]" />
                      <span>View QR Badge</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
