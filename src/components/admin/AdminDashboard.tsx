import React, { useState, useRef } from 'react';
import {
  Users,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  Printer,
  History,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Trash2,
  Database,
  ArrowRight,
  Settings,
  ShieldAlert,
  FileCheck,
  RefreshCw,
  Check,
  Eye,
  Info,
  X,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import {
  Student,
  StudentMovement,
  VisitorGroup,
  AuditLog,
  BPSHouse,
  BPSSection,
  resolveBPSHouse,
  ALL_HOUSES,
  SENIOR_HOUSES,
  MIDDLE_HOUSES,
  JUNIOR_HOUSES,
  BPS_HOUSES_MAP,
  MOVEMENT_TYPES,
} from '../../types';
import { StorageService } from '../../services/storage';
import { ExcelService, ParsedStudentRow } from '../../services/excelService';
import { StudentQrModal } from './StudentQrModal';
import { DeleteStudentModal } from './DeleteStudentModal';
import { AdminAnalyticsView } from './AdminAnalyticsView';

interface AdminDashboardProps {
  students: Student[];
  movements: StudentMovement[];
  visitors: VisitorGroup[];
  auditLogs: AuditLog[];
  onRefreshData: () => void;
  onPrintMovementPass: (movement: StudentMovement) => void;
  onPrintVisitorPass: (visitor: VisitorGroup) => void;
  onBatchPrintQrCards: (students: Student[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  movements,
  visitors,
  auditLogs,
  onRefreshData,
  onPrintMovementPass,
  onPrintVisitorPass,
  onBatchPrintQrCards,
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'overview' | 'students' | 'movements' | 'visitors' | 'excel' | 'audit' | 'settings'
  >('overview');

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [houseFilter, setHouseFilter] = useState<string>('ALL');
  const [movementSearch, setMovementSearch] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');
  const [visitorSearch, setVisitorSearch] = useState<string>('');

  // Student QR Modal State (System-generated QR code display)
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<Student | null>(null);

  // Student Delete Confirmation Modal State (Reliable in-app deletion, no window.confirm)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Purge Database In-App Confirmation Modal State
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState<boolean>(false);

  // In-App Toast Notification
  const [toastNotification, setToastNotification] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Add Single Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
  const [newAdmissionNo, setNewAdmissionNo] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newClass, setNewClass] = useState<string>('11');
  const [newSection, setNewSection] = useState<string>('A');
  const [newHouse, setNewHouse] = useState<BPSHouse>('Panini');
  const [newContact, setNewContact] = useState<string>('');
  const [newFather, setNewFather] = useState<string>('');

  // Excel / Spreadsheet Import State
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [importStatusMessage, setImportStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metrics Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const studentsOnCampus = students.filter((s) => s.status === 'ON_CAMPUS').length;
  const studentsOutside = students.filter((s) => s.status === 'OUTSIDE').length;
  const todayStudentOut = movements.filter(
    (m) => m.dateTimeOut && m.dateTimeOut.startsWith(todayStr)
  ).length;
  const todayStudentIn = movements.filter(
    (m) => m.dateTimeIn && m.dateTimeIn.startsWith(todayStr)
  ).length;

  const currentVisitors = visitors.filter((v) => v.status === 'ON_CAMPUS').length;
  const todayVisitorIn = visitors.filter(
    (v) => v.dateTimeIn && v.dateTimeIn.startsWith(todayStr)
  ).length;

  // Overdue movements (> 12 hours outside)
  const nowMs = Date.now();
  const overdueMovements = movements.filter((m) => {
    if (m.status !== 'OUTSIDE') return false;
    const diffHours = (nowMs - new Date(m.dateTimeOut).getTime()) / (1000 * 60 * 60);
    return diffHours > 12;
  });

  // Handler for adding a student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmissionNo.trim() || !newName.trim()) return;

    const adm = newAdmissionNo.trim().replace(/\D/g, '');
    const paddedAdm = adm.padStart(5, '0');
    const houseNo = `BPSST50${paddedAdm}`;
    const qrId = `QR-BPS-${paddedAdm}`;
    const resolvedHouse = resolveBPSHouse(newHouse);

    const newStudent: Student = {
      id: `STU-${paddedAdm}`,
      admissionNo: adm,
      name: newName.trim(),
      class: newClass,
      section: newSection,
      house: resolvedHouse.house,
      schoolSection: resolvedHouse.section,
      houseFullName: resolvedHouse.fullName,
      houseNo,
      qrId,
      status: 'ON_CAMPUS',
      contactNo: newContact.trim(),
      fatherName: newFather.trim(),
    };

    StorageService.addStudent(newStudent);
    setIsAddStudentOpen(false);
    setNewAdmissionNo('');
    setNewName('');
    setNewContact('');
    setNewFather('');
    onRefreshData();

    // Automatically display the generated QR code modal right after entering database details
    setSelectedStudentForQr(newStudent);
    setToastNotification({
      type: 'success',
      text: `Student "${newStudent.name}" registered! Generated Golden Gate QR code is ready.`,
    });
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Handler for initiating student deletion via in-app confirmation modal
  const handleDeleteStudentClick = (student: Student) => {
    setStudentToDelete(student);
  };

  // Handler for confirming student deletion (zero dependency on window.confirm)
  const handleConfirmDeleteStudent = (student: Student) => {
    StorageService.deleteStudent(student.id);
    setStudentToDelete(null);
    onRefreshData();
    setToastNotification({
      type: 'success',
      text: `Student "${student.name}" (Adm: ${student.admissionNo}) deleted from database.`,
    });
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Handler for toggle QR block (can be triggered from QR modal or status)
  const handleToggleQrStatus = (studentId: string) => {
    StorageService.toggleStudentQrBlock(studentId);
    onRefreshData();
    // Update active modal student if open
    if (selectedStudentForQr && selectedStudentForQr.id === studentId) {
      const updated = StorageService.getStudentById(studentId);
      if (updated) setSelectedStudentForQr(updated);
    }
  };

  // Handler for confirming complete wipe / clear database
  const handleConfirmClearDatabase = async () => {
    await StorageService.clearDatabase();
    setIsPurgeConfirmOpen(false);
    onRefreshData();
    setToastNotification({
      type: 'success',
      text: 'All student, gate, and visitor records purged successfully. The database is now 100% clean.',
    });
    setTimeout(() => setToastNotification(null), 5000);
  };

  // Export Movements to CSV
  const exportMovementsCsv = () => {
    let csv = 'SNo,GatePassNo,StudentName,House,HouseNo,MovementType,TimeOUT,TimeIN,Vehicle,GoingWith,DroppedBy,Purpose,Status\n';
    movements.forEach((m) => {
      csv += `"${m.sNo}","${m.gatePassNo}","${m.studentName}","${m.house}","${m.houseNo}","${m.movementType}","${m.dateTimeOut}","${m.dateTimeIn || ''}","${m.vehicleNo}","${m.goingWithWhom}","${m.whoDropped || ''}","${m.purposeReason}","${m.status}"\n`;
    });
    const encoded = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `BPS_GoldenGate_Movements_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Excel File Selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatusMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadedFileName(file.name);

    try {
      const parsed = await ExcelService.parseSpreadsheetFile(file);
      setParsedRows(parsed);
      if (parsed.length === 0) {
        setImportStatusMessage({
          type: 'error',
          text: 'No student data rows found in this spreadsheet.',
        });
      } else {
        const validCount = parsed.filter((r) => r.isValid).length;
        setImportStatusMessage({
          type: 'success',
          text: `Parsed ${parsed.length} rows (${validCount} valid). Review the table below and click "Import Students".`,
        });
      }
    } catch {
      setImportStatusMessage({
        type: 'error',
        text: 'Failed to read spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.',
      });
    }
  };

  // Confirm Import parsed rows into database
  const handleCommitExcelImport = () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    try {
      const studentEntities = ExcelService.convertToStudentEntities(parsedRows);
      const currentStudents = StorageService.getStudents();

      // Merge by admission number or ID
      studentEntities.forEach((newSt) => {
        const idx = currentStudents.findIndex(
          (s) => s.id === newSt.id || s.admissionNo === newSt.admissionNo
        );
        if (idx >= 0) {
          currentStudents[idx] = newSt;
        } else {
          currentStudents.push(newSt);
        }
      });

      StorageService.saveStudents(currentStudents);
      StorageService.addAuditLog(
        'EXCEL_IMPORT',
        `Imported ${studentEntities.length} students from spreadsheet "${uploadedFileName}".`
      );

      setImportStatusMessage({
        type: 'success',
        text: `Successfully imported ${studentEntities.length} students to live school database!`,
      });
      setParsedRows([]);
      setUploadedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefreshData();
    } catch {
      setImportStatusMessage({
        type: 'error',
        text: 'An error occurred while saving imported students to database.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.houseNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNo.includes(studentSearch) ||
      s.qrId.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.houseFullName && s.houseFullName.toLowerCase().includes(studentSearch.toLowerCase()));

    let matchesHouse = true;
    if (houseFilter === 'ALL') {
      matchesHouse = true;
    } else if (houseFilter === 'SEC_SENIOR') {
      matchesHouse = SENIOR_HOUSES.includes(s.house);
    } else if (houseFilter === 'SEC_MIDDLE') {
      matchesHouse = MIDDLE_HOUSES.includes(s.house);
    } else if (houseFilter === 'SEC_JUNIOR') {
      matchesHouse = JUNIOR_HOUSES.includes(s.house);
    } else {
      matchesHouse = s.house === houseFilter;
    }

    return matchesSearch && matchesHouse;
  });

  return (
    <div className="space-y-6">
      
      {/* Metric Tiles in New Palette */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#d5e0eb] rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-[#688099] block font-semibold">On Campus</span>
          <div className="text-xl font-black font-mono-numbers text-[#116e63] mt-1">
            {studentsOnCampus}
          </div>
          <span className="text-[10px] text-[#688099]">Safe in houses</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-[#688099] block font-semibold">Currently Outside</span>
          <div className="text-xl font-black font-mono-numbers text-[#9d6500] mt-1">
            {studentsOutside}
          </div>
          <span className="text-[10px] text-[#688099]">Active gate passes</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-[#688099] block font-semibold">Today's Moves (OUT)</span>
          <div className="text-xl font-black font-mono-numbers text-[#012758] mt-1">
            {todayStudentOut}
          </div>
          <span className="text-[10px] text-[#688099]">Exits recorded</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-[#688099] block font-semibold">Today's Moves (IN)</span>
          <div className="text-xl font-black font-mono-numbers text-[#116e63] mt-1">
            {todayStudentIn}
          </div>
          <span className="text-[10px] text-[#688099]">Returns logged</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-[#688099] block font-semibold">Current Visitors</span>
          <div className="text-xl font-black font-mono-numbers text-[#19558a] mt-1">
            {currentVisitors}
          </div>
          <span className="text-[10px] text-[#688099]">On premises</span>
        </div>

        <div className="bg-white border border-[#d5e0eb] rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-[#688099] block font-semibold">Overdue Returns</span>
          <div className="text-xl font-black font-mono-numbers text-[#ae4439] mt-1">
            {overdueMovements.length}
          </div>
          <span className="text-[10px] text-[#ae4439]">&gt; 12 hours out</span>
        </div>
      </div>

      {/* Admin Sub-Tabs Navigation (Fully responsive horizontal scroll on mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d5e0eb] pb-3">
        <div className="flex overflow-x-auto no-scrollbar gap-1 bg-[#f5f9fc] p-1 rounded-xl border border-[#d5e0eb] max-w-full">
          <button
            onClick={() => setActiveAdminSubTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeAdminSubTab === 'overview'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#fda31b]" />
            <span>Analytics & Command</span>
          </button>

          <button
            onClick={() => setActiveAdminSubTab('students')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeAdminSubTab === 'students'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            Students ({students.length})
          </button>

          <button
            onClick={() => setActiveAdminSubTab('excel')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeAdminSubTab === 'excel'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#fda31b]" />
            <span>Excel / Bulk Import</span>
          </button>

          <button
            onClick={() => setActiveAdminSubTab('movements')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeAdminSubTab === 'movements'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            Gate Records ({movements.length})
          </button>

          <button
            onClick={() => setActiveAdminSubTab('visitors')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeAdminSubTab === 'visitors'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            Visitor Logs ({visitors.length})
          </button>

          <button
            onClick={() => setActiveAdminSubTab('audit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeAdminSubTab === 'audit'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveAdminSubTab('settings')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeAdminSubTab === 'settings'
                ? 'bg-[#012758] text-white shadow-xs'
                : 'text-[#173a5f] hover:bg-[#e8f1fa]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Global Action: Add Student & Batch Print */}
        {activeAdminSubTab === 'students' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3.5 py-1.5 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#fda31b]" />
              <span>Add Student</span>
            </button>
            {students.length > 0 && (
              <button
                onClick={() => onBatchPrintQrCards(filteredStudents)}
                className="px-3 py-1.5 bg-white hover:bg-[#f5f9fc] text-[#012758] font-bold text-xs rounded-xl border border-[#d5e0eb] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-[#19558a]" />
                <span className="hidden sm:inline">Print All Filtered QR Cards</span>
                <span className="sm:hidden">Print Cards</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 1. COMMAND ANALYTICS & INTELLIGENCE TAB */}
      {activeAdminSubTab === 'overview' && (
        <AdminAnalyticsView
          students={students}
          movements={movements}
          visitors={visitors}
          onOpenStudentQr={(st) => setSelectedStudentForQr(st)}
          onNavigateToTab={(tab) => setActiveAdminSubTab(tab)}
        />
      )}

      {/* 2. EXCEL & BULK IMPORT TAB (Requested Feature) */}
      {activeAdminSubTab === 'excel' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e3ebf2] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#012758] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#fda31b]" />
                  <span>Bulk Student Import via Excel / CSV</span>
                </h3>
                <p className="text-xs text-[#315172] mt-1">
                  Upload your school's Excel spreadsheet (.xlsx, .xls) or CSV file. House numbers (BPSST50...) and QR IDs will be automatically generated.
                </p>
              </div>

              {/* Template Download Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => ExcelService.downloadExcelTemplate()}
                  className="px-3.5 py-2 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#fda31b]" />
                  <span>Download Excel (.xlsx) Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => ExcelService.downloadCsvTemplate()}
                  className="px-3.5 py-2 bg-white hover:bg-[#f5f9fc] text-[#012758] border border-[#d5e0eb] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#19558a]" />
                  <span>Download CSV Template</span>
                </button>
              </div>
            </div>

            {/* Official House Code & Section Mapping Guide */}
            <div className="bg-[#f5f9fc] border border-[#d5e0eb] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#012758] flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-[#19558a]" />
                  <span>Configured House Codes & Section Mapping (584 Students Ready)</span>
                </span>
                <span className="text-[11px] font-bold text-[#116e63] bg-[#e7f5f1] px-2 py-0.5 rounded-md">
                  Auto-Detect Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Senior Section */}
                <div className="bg-white border border-[#d5e0eb] rounded-xl p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-1">
                    <span className="font-bold text-[#012758]">Senior Section</span>
                    <span className="text-[10px] font-mono text-[#688099] font-bold bg-[#f5f9fc] px-1.5 py-0.5 rounded">5 Houses</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[#315172]">
                    <li><strong className="font-mono text-[#012758]">PAN</strong> — Panini House</li>
                    <li><strong className="font-mono text-[#012758]">PAT</strong> — Patanjali House</li>
                    <li><strong className="font-mono text-[#012758]">KAN</strong> — Kanad House</li>
                    <li><strong className="font-mono text-[#012758]">KAT</strong> — Katyayan House</li>
                    <li><strong className="font-mono text-[#012758]">VYAS</strong> — Vyas House</li>
                  </ul>
                </div>

                {/* Middle Section */}
                <div className="bg-white border border-[#d5e0eb] rounded-xl p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-1">
                    <span className="font-bold text-[#012758]">Middle Section</span>
                    <span className="text-[10px] font-mono text-[#19558a] font-bold bg-[#e3ebf2] px-1.5 py-0.5 rounded">Before Hyphen</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[#315172]">
                    <li><strong className="font-mono text-[#012758]">GH</strong> — Gurunanak House</li>
                    <li><strong className="font-mono text-[#012758]">MH</strong> — Mahavir House</li>
                    <li><strong className="font-mono text-[#012758]">DH</strong> — Dayanand House</li>
                    <li><strong className="font-mono text-[#012758]">BH</strong> — Buddha House</li>
                    <li><strong className="font-mono text-[#012758]">VH</strong> — Vivekananda House</li>
                  </ul>
                  <p className="text-[10px] text-[#9d6500] bg-[#fff3d9] px-2 py-1 rounded border border-[#ffe099]">
                    *For transition entries like <strong>GH-PAN</strong>, the code before hyphen (<strong>GH</strong>) is used.
                  </p>
                </div>

                {/* Junior Section */}
                <div className="bg-white border border-[#d5e0eb] rounded-xl p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-1">
                    <span className="font-bold text-[#012758]">Junior Section</span>
                    <span className="text-[10px] font-mono text-[#688099] font-bold bg-[#f5f9fc] px-1.5 py-0.5 rounded">4 Houses</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[#315172]">
                    <li><strong className="font-mono text-[#012758]">KUMAR</strong> — Kumar House</li>
                    <li><strong className="font-mono text-[#012758]">SG1</strong> — Shishu Griha 1</li>
                    <li><strong className="font-mono text-[#012758]">BAL</strong> — Bal House</li>
                    <li><strong className="font-mono text-[#012758]">KISHO</strong> — Kishore House</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-[#d5e0eb] hover:border-[#012758] rounded-2xl p-6 sm:p-8 text-center bg-[#f5f9fc] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="excelUploadInput"
              />
              <label
                htmlFor="excelUploadInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#d5e0eb] text-[#012758] flex items-center justify-center shadow-2xs">
                  <Upload className="w-6 h-6 text-[#19558a]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#012758]">
                    Click to upload or drag & drop Excel / CSV file
                  </span>
                  <p className="text-xs text-[#688099] mt-0.5">
                    Upload your complete roster (584 students). The system auto-identifies House codes, hyphenated middle transitions, and sections.
                  </p>
                </div>
              </label>

              {uploadedFileName && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#d5e0eb] text-xs text-[#012758] font-bold">
                  <FileCheck className="w-4 h-4 text-[#116e63]" />
                  <span>Selected: {uploadedFileName}</span>
                </div>
              )}
            </div>

            {/* Status Message */}
            {importStatusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  importStatusMessage.type === 'success'
                    ? 'bg-[#e7f5f1] border-[#116e63] text-[#116e63]'
                    : 'bg-[#fff0ee] border-[#ae4439] text-[#ae4439]'
                }`}
              >
                {importStatusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{importStatusMessage.text}</span>
              </div>
            )}

            {/* Parsed Rows Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#012758]">
                    Parsed Preview ({parsedRows.length} students):
                  </span>
                  <button
                    onClick={handleCommitExcelImport}
                    disabled={isImporting}
                    className="px-5 py-2 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 text-[#fda31b]" />
                    <span>
                      {isImporting ? 'Importing...' : `Import ${parsedRows.filter((r) => r.isValid).length} Valid Students to Live Database`}
                    </span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-[#d5e0eb] rounded-xl max-h-[350px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f5f9fc] border-b border-[#d5e0eb] text-[#688099] font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Admission No</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Class/Sec</th>
                        <th className="p-2.5">House</th>
                        <th className="p-2.5">Section</th>
                        <th className="p-2.5">Raw Cell Value</th>
                        <th className="p-2.5">House No Formula</th>
                        <th className="p-2.5">Parent / Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e3ebf2]">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className={r.isValid ? 'hover:bg-[#f5f9fc]' : 'bg-[#fff0ee]/40'}>
                          <td className="p-2.5">
                            {r.isValid ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e7f5f1] text-[#116e63]">
                                VALID
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fff0ee] text-[#ae4439]">
                                {r.error}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#012758]">{r.admissionNo}</td>
                          <td className="p-2.5 font-semibold text-[#173a5f]">{r.name}</td>
                          <td className="p-2.5">{r.class}-{r.section}</td>
                          <td className="p-2.5 font-bold text-[#012758]">
                            <span>{r.houseFullName}</span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.schoolSection === 'Senior'
                                  ? 'bg-[#012758]/10 text-[#012758]'
                                  : r.schoolSection === 'Middle'
                                  ? 'bg-[#19558a]/10 text-[#19558a]'
                                  : 'bg-[#116e63]/10 text-[#116e63]'
                              }`}
                            >
                              {r.schoolSection}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-[#688099]">
                            {r.rawHouseInput ? String(r.rawHouseInput) : '—'}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-[#688099]">
                            BPSST50{r.admissionNo.padStart(5, '0')}
                          </td>
                          <td className="p-2.5 text-[#688099]">
                            {r.fatherName || '—'} {r.contactNo ? `(${r.contactNo})` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. STUDENT DATABASE TAB */}
      {activeAdminSubTab === 'students' && (
        <div className="space-y-4">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 sm:p-4 border border-[#d5e0eb] rounded-2xl shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#19558a]" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by Name, House No, Admission No, or QR ID..."
                className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#012758] font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#19558a] shrink-0" />
              <select
                value={houseFilter}
                onChange={(e) => setHouseFilter(e.target.value)}
                className="bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#012758] cursor-pointer flex-1 sm:flex-none font-medium"
              >
                <option value="ALL">All Houses & Sections ({students.length})</option>
                
                <optgroup label="Section Filters">
                  <option value="SEC_SENIOR">All Senior Section (PAN, PAT, KAN, KAT, VYAS)</option>
                  <option value="SEC_MIDDLE">All Middle Section (GH, MH, DH, BH, VH)</option>
                  <option value="SEC_JUNIOR">All Junior Section (KUMAR, SG1, BAL, KISHO)</option>
                </optgroup>

                <optgroup label="Senior Section Houses">
                  <option value="Panini">PAN — Panini House</option>
                  <option value="Patanjali">PAT — Patanjali House</option>
                  <option value="Kanad">KAN — Kanad House</option>
                  <option value="Katyayan">KAT — Katyayan House</option>
                  <option value="Vyas">VYAS — Vyas House</option>
                </optgroup>

                <optgroup label="Middle Section Houses">
                  <option value="Gurunanak">GH — Gurunanak House</option>
                  <option value="Mahavir">MH — Mahavir House</option>
                  <option value="Dayanand">DH — Dayanand House</option>
                  <option value="Buddha">BH — Buddha House</option>
                  <option value="Vivekananda">VH — Vivekananda House</option>
                </optgroup>

                <optgroup label="Junior Section Houses">
                  <option value="Kumar">KUMAR — Kumar House</option>
                  <option value="Shishu Griha 1">SG1 — Shishu Griha 1</option>
                  <option value="Bal">BAL — Bal House</option>
                  <option value="Kishore">KISHO — Kishore House</option>
                </optgroup>
              </select>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="bg-white border border-dashed border-[#d5e0eb] rounded-2xl p-8 sm:p-12 text-center text-xs text-[#688099] shadow-xs space-y-3">
              {students.length === 0 ? (
                <div>
                  <p className="font-bold text-[#012758] text-sm mb-1">Student database is currently empty.</p>
                  <p className="mb-4 text-[#315172]">Click "Bulk Import Students (Excel)" to import your school's official student roster, or "Add Single Student".</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setActiveAdminSubTab('excel')}
                      className="px-4 py-2 bg-[#012758] text-white font-bold rounded-xl text-xs hover:bg-[#073a7d] transition-colors cursor-pointer"
                    >
                      Open Excel Bulk Import →
                    </button>
                    <button
                      onClick={() => setIsAddStudentOpen(true)}
                      className="px-4 py-2 bg-white text-[#012758] border border-[#d5e0eb] font-bold rounded-xl text-xs hover:bg-[#f5f9fc] transition-colors cursor-pointer"
                    >
                      + Add Single Student
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-[#012758]">No students found matching "{studentSearch}".</p>
                  <button
                    onClick={() => {
                      setStudentSearch('');
                      setHouseFilter('ALL');
                    }}
                    className="mt-2 text-[#19558a] font-bold hover:underline"
                  >
                    Clear Search Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* MOBILE CARDS VIEW (Clean responsive UI for phones and small tabs) */}
              <div className="md:hidden space-y-3">
                {filteredStudents.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white border border-[#d5e0eb] rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-[#688099] bg-[#f5f9fc] px-2 py-0.5 rounded border border-[#d5e0eb]">
                          Adm: {st.admissionNo}
                        </span>
                        <h4 className="text-base font-bold text-[#012758] mt-1 font-crest">
                          {st.name}
                        </h4>
                        <div className="text-xs text-[#315172] flex items-center gap-2 mt-0.5">
                          <span>Class {st.class}-{st.section}</span>
                          <span>•</span>
                          <span className="font-semibold text-[#012758]">{st.house}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          st.status === 'OUTSIDE'
                            ? 'bg-[#fff3d9] text-[#9d6500]'
                            : st.status === 'BLOCKED'
                            ? 'bg-[#fff0ee] text-[#ae4439]'
                            : 'bg-[#e7f5f1] text-[#116e63]'
                        }`}
                      >
                        {st.status === 'OUTSIDE' ? 'OUTSIDE' : st.status === 'BLOCKED' ? 'BLOCKED' : 'ON CAMPUS'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-[#688099] bg-[#f5f9fc] px-2.5 py-1.5 rounded-lg border border-[#e3ebf2] flex items-center justify-between">
                      <span>House No: {st.houseNo}</span>
                      <span>QR ID: {st.qrId}</span>
                    </div>

                    {/* Action Buttons for Mobile */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#e3ebf2]">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForQr(st)}
                        className="flex-1 py-2 px-3 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#fda31b]" />
                        <span>View QR Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStudentClick(st)}
                        title="Delete Student from Database"
                        className="py-2 px-3 bg-[#fff0ee] hover:bg-[#fde2e0] text-[#ae4439] border border-[#ae4439]/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (For tablets, laptops & desktops) */}
              <div className="hidden md:block bg-white border border-[#d5e0eb] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f5f9fc] border-b border-[#d5e0eb] text-[#688099] font-bold">
                      <tr>
                        <th className="p-3">Admission No</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Class/Sec</th>
                        <th className="p-3">House & House No</th>
                        <th className="p-3">QR ID</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e3ebf2]">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-[#f5f9fc]">
                          <td className="p-3 font-mono font-bold text-[#012758]">{st.admissionNo}</td>
                          <td className="p-3 font-bold text-[#173a5f]">{st.name}</td>
                          <td className="p-3">{st.class}-{st.section}</td>
                          <td className="p-3">
                            <span className="font-semibold text-[#012758]">{st.house}</span>
                            <span className="font-mono text-[11px] text-[#688099] ml-1.5">({st.houseNo})</span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-[#688099]">{st.qrId}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.status === 'OUTSIDE'
                                  ? 'bg-[#fff3d9] text-[#9d6500]'
                                  : st.status === 'BLOCKED'
                                  ? 'bg-[#fff0ee] text-[#ae4439]'
                                  : 'bg-[#e7f5f1] text-[#116e63]'
                              }`}
                            >
                              {st.status === 'OUTSIDE' ? 'OUTSIDE' : st.status === 'BLOCKED' ? 'BLOCKED' : 'ON CAMPUS'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            {/* Requested feature: Button opens the student's system-generated QR code */}
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForQr(st)}
                              title="View & Download Generated QR Code"
                              className="px-2.5 py-1.5 rounded-lg border border-[#012758] bg-[#f5f9fc] hover:bg-[#e8f1fa] text-[#012758] font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#19558a]" />
                              <span>QR Code</span>
                            </button>

                            {/* Requested feature: Reliable delete button that opens confirmation modal */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStudentClick(st)}
                              title="Delete Student from Database"
                              className="p-1.5 rounded-lg border border-[#ae4439]/30 hover:bg-[#fff0ee] text-[#ae4439] inline-flex items-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. GATE RECORDS TAB */}
      {activeAdminSubTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-[#d5e0eb] rounded-2xl shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#19558a]" />
              <input
                type="text"
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                placeholder="Search gate movements by Pass No, Student Name, House..."
                className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-xl pl-9 pr-3 py-2 font-mono"
              />
            </div>
            <button
              onClick={exportMovementsCsv}
              className="px-4 py-2 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#fda31b]" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-white border border-[#d5e0eb] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f9fc] border-b border-[#d5e0eb] text-[#688099] font-bold">
                  <tr>
                    <th className="p-3">S.No</th>
                    <th className="p-3">Gate Pass No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">House</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Time OUT</th>
                    <th className="p-3">Time IN</th>
                    <th className="p-3">Email Status</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Pass</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3ebf2]">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#688099]">
                        No gate movements logged yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-[#f5f9fc]">
                        <td className="p-3 font-mono font-bold">{m.sNo}</td>
                        <td className="p-3 font-mono font-bold text-[#012758]">{m.gatePassNo}</td>
                        <td className="p-3 font-bold text-[#173a5f]">{m.studentName}</td>
                        <td className="p-3">{m.house}</td>
                        <td className="p-3 font-semibold text-[#19558a]">{m.movementType}</td>
                        <td className="p-3 font-mono text-[11px] text-[#688099]">
                          {new Date(m.dateTimeOut).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#688099]">
                          {m.dateTimeIn ? new Date(m.dateTimeIn).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-3">
                          {m.emailStatus ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                m.emailStatus === 'Sent'
                                  ? 'bg-[#e7f5f1] text-[#116e63]'
                                  : m.emailStatus === 'Failed'
                                  ? 'bg-[#fff0ee] text-[#ae4439]'
                                  : 'bg-[#fff3d9] text-[#9d6500]'
                              }`}
                              title={
                                m.recipientEmail
                                  ? `Recipient: ${m.recipientEmail}`
                                  : 'Email Status'
                              }
                            >
                              <span>{m.emailStatus}</span>
                            </span>
                          ) : (
                            <span className="text-[#688099]">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'OUTSIDE'
                                ? 'bg-[#fff3d9] text-[#9d6500]'
                                : 'bg-[#e7f5f1] text-[#116e63]'
                            }`}
                          >
                            {m.status === 'OUTSIDE' ? 'OUTSIDE' : 'RETURNED'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onPrintMovementPass(m)}
                            className="p-1.5 rounded-lg border border-[#d5e0eb] hover:bg-[#e8f1fa] text-[#19558a]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. VISITOR LOGS TAB */}
      {activeAdminSubTab === 'visitors' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#d5e0eb] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f9fc] border-b border-[#d5e0eb] text-[#688099] font-bold">
                  <tr>
                    <th className="p-3">Pass ID</th>
                    <th className="p-3">Head Visitor</th>
                    <th className="p-3">Total Guests</th>
                    <th className="p-3">Whom to Meet</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Time IN</th>
                    <th className="p-3">Time OUT</th>
                    <th className="p-3">Email Status</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3ebf2]">
                  {visitors.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[#688099]">
                        No visitor records logged yet.
                      </td>
                    </tr>
                  ) : (
                    visitors.map((v) => (
                      <tr key={v.id} className="hover:bg-[#f5f9fc]">
                        <td className="p-3 font-mono font-bold text-[#012758]">{v.passNumber}</td>
                        <td className="p-3 font-bold text-[#173a5f]">{v.headVisitorName}</td>
                        <td className="p-3">{v.totalVisitors} person(s)</td>
                        <td className="p-3 font-semibold text-[#19558a]">{v.whomToMeet}</td>
                        <td className="p-3 font-mono">{v.vehicleNumber}</td>
                        <td className="p-3 font-mono text-[11px] text-[#688099]">
                          {new Date(v.dateTimeIn).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#688099]">
                          {v.dateTimeOut ? new Date(v.dateTimeOut).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-3">
                          {v.email ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                v.emailStatus === 'Sent'
                                  ? 'bg-[#e7f5f1] text-[#116e63]'
                                  : v.emailStatus === 'Failed'
                                  ? 'bg-[#fff0ee] text-[#ae4439]'
                                  : 'bg-[#fff3d9] text-[#9d6500]'
                              }`}
                              title={`Recipient: ${v.email}`}
                            >
                              <span>{v.emailStatus || 'Pending'}</span>
                            </span>
                          ) : (
                            <span className="text-[#688099]">No Email</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.status === 'ON_CAMPUS'
                                ? 'bg-[#e7f5f1] text-[#116e63]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {v.status === 'ON_CAMPUS' ? 'ON CAMPUS' : 'CHECKED OUT'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT TRAIL TAB */}
      {activeAdminSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#d5e0eb] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f9fc] border-b border-[#d5e0eb] text-[#688099] font-bold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3ebf2]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[#688099]">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f5f9fc]">
                        <td className="p-3 font-mono text-[11px] text-[#688099] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#012758]">{log.action}</td>
                        <td className="p-3 text-[#173a5f]">{log.details}</td>
                        <td className="p-3 text-[#688099]">{log.performedBy || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. SETTINGS & WIPE DATABASE TAB */}
      {activeAdminSubTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#d5e0eb] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#012758]">System Settings & Database Management</h3>
            <p className="text-xs text-[#315172]">
              Administrative tools for Golden Gate system maintenance.
            </p>

            {/* Danger Zone: Wipe Database as requested */}
            <div className="p-5 border-2 border-[#ae4439]/30 rounded-2xl bg-[#fff0ee]/40 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ae4439]" />
                <h4 className="font-bold text-sm text-[#ae4439]">
                  Database Clean Slate (Purge All Site Data)
                </h4>
              </div>
              <p className="text-xs text-[#315172]">
                As requested, this will clear all students, active movements, visitor registers, and audit logs from both this device and the live Firestore cloud database. Use this before loading your school's official data roster.
              </p>
              <button
                type="button"
                onClick={() => setIsPurgeConfirmOpen(true)}
                className="px-4 py-2.5 bg-[#ae4439] hover:bg-[#8e332a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>PURGE ALL DATA FROM SYSTEM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Single Student */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-[#d5e0eb] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-3">
              <h3 className="font-bold text-base text-[#012758]">Add Student Record</h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-[#688099] hover:text-[#012758]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmissionNo}
                    onChange={(e) => setNewAdmissionNo(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 12455"
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#012758] font-mono text-sm rounded-xl px-3 py-2"
                    autoFocus
                  />
                  <span className="text-[10px] text-[#688099] mt-0.5 block">
                    House No will be: BPSST50{newAdmissionNo.padStart(5, '0')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">Class</label>
                  <input
                    type="text"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">Section</label>
                  <input
                    type="text"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value.toUpperCase())}
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#012758] mb-1">BPS House *</label>
                  <select
                    value={newHouse}
                    onChange={(e) => setNewHouse(e.target.value as BPSHouse)}
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2 cursor-pointer font-medium"
                  >
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

                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={newFather}
                    onChange={(e) => setNewFather(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="e.g. 9829012345"
                    className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#e3ebf2]">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 bg-[#f5f9fc] text-[#173a5f] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#012758] hover:bg-[#073a7d] text-white text-xs font-bold rounded-xl"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System-Generated Student QR Code Modal */}
      <StudentQrModal
        student={selectedStudentForQr}
        isOpen={Boolean(selectedStudentForQr)}
        onClose={() => setSelectedStudentForQr(null)}
        onToggleStatus={handleToggleQrStatus}
      />

      {/* Delete Student In-App Confirmation Modal */}
      <DeleteStudentModal
        student={studentToDelete}
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirmDelete={handleConfirmDeleteStudent}
      />

      {/* Wipe / Purge Database In-App Confirmation Modal */}
      {isPurgeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl border border-[#d5e0eb] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#ae4439] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase">Confirm Complete System Purge</h3>
              </div>
              <button
                onClick={() => setIsPurgeConfirmOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-[#173a5f] font-medium leading-relaxed">
                This will permanently erase all students, movement logs, visitor registers, and audit trails from both this machine and the live Firestore cloud database.
              </p>
              <div className="p-3 bg-[#fff0ee] border border-[#ae4439]/30 rounded-xl text-xs text-[#ae4439] font-bold">
                ⚠️ This operation cannot be undone. Are you sure you wish to proceed?
              </div>
            </div>
            <div className="bg-[#f5f9fc] px-5 py-3 border-t border-[#d5e0eb] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPurgeConfirmOpen(false)}
                className="px-4 py-2 bg-white text-[#173a5f] border border-[#d5e0eb] font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearDatabase}
                className="px-4 py-2 bg-[#ae4439] hover:bg-[#8e332a] text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Yes, Purge Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200 max-w-sm">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 ${
              toastNotification.type === 'success'
                ? 'bg-[#012758] border-[#fda31b] text-white'
                : 'bg-white border-[#d5e0eb] text-[#173a5f]'
            }`}
          >
            {toastNotification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#fda31b] shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-[#19558a] shrink-0" />
            )}
            <span className="text-xs font-bold leading-snug">{toastNotification.text}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="text-white/60 hover:text-white p-1 ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
