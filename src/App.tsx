import React, { useState, useEffect, useCallback } from 'react';
import {
  Student,
  StudentMovement,
  VisitorGroup,
  AuditLog,
  UserAccount,
  Role,
} from './types';
import { StorageService } from './services/storage';
import { HeroLoginScreen } from './components/auth/HeroLoginScreen';
import { Header } from './components/common/Header';
import { GuardDesk } from './components/guard/GuardDesk';
import { StudentProcessModal } from './components/guard/StudentProcessModal';
import { VisitorModal } from './components/guard/VisitorModal';
import { WebcamScannerModal } from './components/guard/WebcamScannerModal';
import { ActiveMovementsView } from './components/views/ActiveMovementsView';
import { VisitorDeskView } from './components/views/VisitorDeskView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PublicDisplay } from './components/public/PublicDisplay';
import { PassPrintModal } from './components/print/PassPrintModal';
import { StudentEmailPromptModal } from './components/guard/StudentEmailPromptModal';
import { sendVisitorPassEmail } from './services/emailService';

export default function App() {
  // Check URL parameters for standalone Monitor 2 Public Display
  const [isPublicScreenOnly, setIsPublicScreenOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return (
      urlParams.get('screen') === 'public' ||
      urlParams.get('display') === 'monitor2' ||
      urlParams.get('view') === 'public'
    );
  });

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return StorageService.isLoggedIn();
  });
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    return StorageService.getCurrentUser();
  });

  // Application Data States
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [movements, setMovements] = useState<StudentMovement[]>(() =>
    StorageService.getMovements()
  );
  const [visitors, setVisitors] = useState<VisitorGroup[]>(() => StorageService.getVisitors());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'guard' | 'movements' | 'visitors' | 'admin' | 'public_preview'
  >(() => (currentUser.role === 'ADMIN' ? 'admin' : 'guard'));

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [selectedStudentForProcess, setSelectedStudentForProcess] = useState<Student | null>(null);
  const [activeMovementForProcess, setActiveMovementForProcess] =
    useState<StudentMovement | null>(null);

  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState<boolean>(false);
  const [visitorModalMode, setVisitorModalMode] = useState<'NEW' | 'OUT'>('NEW');
  const [initialVisitorForOut, setInitialVisitorForOut] = useState<VisitorGroup | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printMovement, setPrintMovement] = useState<StudentMovement | null>(null);
  const [printVisitor, setPrintVisitor] = useState<VisitorGroup | null>(null);
  const [printBatchStudents, setPrintBatchStudents] = useState<Student[]>([]);

  // Automated Digital Pass Email Prompt States
  const [isEmailPromptOpen, setIsEmailPromptOpen] = useState<boolean>(false);
  const [emailPromptMovement, setEmailPromptMovement] = useState<StudentMovement | null>(null);
  const [emailPromptStudent, setEmailPromptStudent] = useState<Student | null>(null);
  const [scanErrorToast, setScanErrorToast] = useState<string | null>(null);

  // Function to refresh state from storage
  const refreshAllData = useCallback(() => {
    setStudents(StorageService.getStudents());
    setMovements(StorageService.getMovements());
    setVisitors(StorageService.getVisitors());
    setAuditLogs(StorageService.getAuditLogs());
    setCurrentUser(StorageService.getCurrentUser());
  }, []);

  // Listen for storage, cross-tab, and Firebase cloud changes
  useEffect(() => {
    const unsubFirebase = StorageService.initFirebaseSync(() => {
      refreshAllData();
    });
    const unsubscribe = StorageService.subscribeToSync(() => {
      refreshAllData();
    });
    return () => {
      unsubFirebase();
      unsubscribe();
    };
  }, [refreshAllData]);

  // Open Monitor 2 in a dedicated new window
  const handleOpenPublicDisplay = () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}?screen=public`;
    window.open(
      publicUrl,
      'BPS_GoldenGate_Public_Display',
      'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  // Login handler
  const handleLoginSuccess = (user: UserAccount) => {
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
    setIsLoggedIn(true);
    setActiveTab(user.role === 'ADMIN' ? 'admin' : 'guard');
  };

  // Logout handler (returns to Hero Login screen)
  const handleLogout = () => {
    StorageService.logout();
    setIsLoggedIn(false);
  };

  // Switch role handler - removed direct switching in favor of logout
  const handleSelectTab = (
    tab: 'guard' | 'movements' | 'visitors' | 'admin' | 'public_preview'
  ) => {
    if (currentUser.role === 'ADMIN') {
      if (tab === 'public_preview') {
        setActiveTab('public_preview');
      } else {
        setActiveTab('admin');
      }
      return;
    }
    if (currentUser.role === 'GATE_SYSTEM') {
      if (tab === 'admin') {
        setActiveTab('guard');
      } else {
        setActiveTab(tab);
      }
      return;
    }
    setActiveTab(tab);
  };

  // Process Student QR (from webcam scanner, barcode gun input, or gate pass QR)
  const handleProcessStudentQr = (qrOrAdmission: string) => {
    setIsScannerOpen(false);
    const resolved = StorageService.resolveScanCode(qrOrAdmission);

    if (resolved.type === 'STUDENT' && resolved.student) {
      StorageService.broadcastPublicDisplay({
        mode: 'STUDENT_SCANNED',
        timestamp: Date.now(),
        student: {
          name: resolved.student.name,
          house: resolved.student.house,
          class: resolved.student.class,
          section: resolved.student.section,
          houseNo: resolved.student.houseNo,
          photo: resolved.student.photo,
        },
      });

      setSelectedStudentForProcess(resolved.student);
      setActiveMovementForProcess(resolved.movement || null);
      setIsStudentModalOpen(true);
    } else if (resolved.type === 'STUDENT_PASS' && resolved.student && resolved.movement) {
      // Direct Student Gate Pass scan (for Return IN verification)
      StorageService.broadcastPublicDisplay({
        mode: 'STUDENT_SCANNED',
        timestamp: Date.now(),
        student: {
          name: resolved.student.name,
          house: resolved.student.house,
          class: resolved.student.class,
          section: resolved.student.section,
          houseNo: resolved.student.houseNo,
          photo: resolved.student.photo,
          gatePassNo: resolved.movement.gatePassNo,
          movementType: resolved.movement.movementType,
        },
      });

      setSelectedStudentForProcess(resolved.student);
      setActiveMovementForProcess(resolved.movement);
      setIsStudentModalOpen(true);
    } else if (resolved.type === 'VISITOR_PASS' && resolved.visitor) {
      // Direct Visitor Pass scan (for Checkout OUT verification)
      setVisitorModalMode('OUT');
      setInitialVisitorForOut(resolved.visitor);
      setIsVisitorModalOpen(true);
      StorageService.broadcastPublicDisplay({
        mode: 'VISITOR_OUT_WAIT',
        timestamp: Date.now(),
        visitor: {
          headVisitorName: resolved.visitor.headVisitorName,
          passNumber: resolved.visitor.passNumber,
          totalVisitors: resolved.visitor.totalVisitors,
          whomToMeet: resolved.visitor.whomToMeet,
        },
      });
    } else {
      // Last-mile fallback: check students array directly
      const cleanUpper = qrOrAdmission.toUpperCase().trim();
      const fallbackStudent = students.find(
        (s) =>
          s.admissionNo.toUpperCase().includes(cleanUpper) ||
          s.name.toUpperCase().includes(cleanUpper) ||
          s.houseNo.toUpperCase().includes(cleanUpper) ||
          s.id.toUpperCase().includes(cleanUpper)
      );

      if (fallbackStudent) {
        StorageService.broadcastPublicDisplay({
          mode: 'STUDENT_SCANNED',
          timestamp: Date.now(),
          student: {
            name: fallbackStudent.name,
            house: fallbackStudent.house,
            class: fallbackStudent.class,
            section: fallbackStudent.section,
            houseNo: fallbackStudent.houseNo,
            photo: fallbackStudent.photo,
          },
        });
        setSelectedStudentForProcess(fallbackStudent);
        setActiveMovementForProcess(StorageService.getActiveMovementForStudent(fallbackStudent.id) || null);
        setIsStudentModalOpen(true);
        return;
      }

      setScanErrorToast(`No student or pass found matching code: "${qrOrAdmission}".`);
      setTimeout(() => setScanErrorToast(null), 5000);
    }
  };

  // Student OUT Confirm (Saves transaction first, then prompts for Digital Pass Email)
  const handleConfirmStudentOut = (data: {
    gatePassNo: string;
    student: Student;
    vehicleNo: string;
    goingWithWhom: string;
    movementType: StudentMovement['movementType'];
    purposeReason: string;
  }) => {
    const newMovement = StorageService.recordStudentOut(data);
    setIsStudentModalOpen(false);
    refreshAllData();

    // Immediately open Digital Pass & Email prompt modal after successful save
    setEmailPromptMovement(newMovement);
    setEmailPromptStudent(data.student);
    setIsEmailPromptOpen(true);
  };

  // Student IN Confirm
  const handleConfirmStudentIn = (data: {
    movementId: string;
    studentId: string;
    whoDropped: string;
  }) => {
    StorageService.recordStudentIn(data);
    setIsStudentModalOpen(false);
    refreshAllData();
  };

  // Visitor Register Confirm (Automatically emails digital pass to Head Visitor)
  const handleRegisterVisitor = (data: {
    headVisitorName: string;
    email: string;
    phone: string;
    accompanyingNames: string[];
    vehicleNumber: string;
    whomToMeet: string;
    purposeReason: string;
  }) => {
    const newVisitor = StorageService.createVisitorGroup(data);
    setIsVisitorModalOpen(false);
    refreshAllData();

    // Automatically email digital pass to head visitor if email provided
    if (newVisitor.email) {
      sendVisitorPassEmail(newVisitor).then((res) => {
        if (res.success) {
          StorageService.updateVisitorEmailStatus(newVisitor.id, 'Sent');
        } else {
          StorageService.updateVisitorEmailStatus(newVisitor.id, 'Failed', res.error);
        }
        refreshAllData();
      });
    }

    // Open print visitor pass
    setPrintVisitor(newVisitor);
    setPrintMovement(null);
    setPrintBatchStudents([]);
    setIsPrintModalOpen(true);
  };

  // Resend Student Pass Email
  const handleResendStudentEmail = (movement: StudentMovement) => {
    const student = StorageService.getStudentById(movement.studentId);
    setEmailPromptMovement(movement);
    setEmailPromptStudent(student || null);
    setIsEmailPromptOpen(true);
  };

  // Resend Visitor Pass Email
  const handleResendVisitorEmail = (visitor: VisitorGroup) => {
    sendVisitorPassEmail(visitor).then((res) => {
      if (res.success) {
        StorageService.updateVisitorEmailStatus(visitor.id, 'Sent');
        alert(`Visitor pass #${visitor.passNumber} email sent successfully to ${visitor.email}`);
      } else {
        StorageService.updateVisitorEmailStatus(visitor.id, 'Failed', res.error);
        alert(`Could not send visitor pass email: ${res.error}`);
      }
      refreshAllData();
    });
  };

  // Visitor OUT Checkout Confirm
  const handleCheckoutVisitor = (visitorIdOrPass: string) => {
    StorageService.checkoutVisitor(visitorIdOrPass);
    setIsVisitorModalOpen(false);
    refreshAllData();
  };

  // Batch Print QR Cards
  const handleBatchPrintQrCards = (studentList: Student[]) => {
    setPrintBatchStudents(studentList);
    setPrintMovement(null);
    setPrintVisitor(null);
    setIsPrintModalOpen(true);
  };

  // If in standalone Public Display mode (Monitor 2), render only PublicDisplay
  if (isPublicScreenOnly) {
    return <PublicDisplay isStandaloneWindow />;
  }

  // If not logged in, render Hero Login Screen
  if (!isLoggedIn) {
    return (
      <HeroLoginScreen
        onLoginSuccess={handleLoginSuccess}
        onOpenPublicDisplay={handleOpenPublicDisplay}
        studentCount={students.length}
      />
    );
  }

  const outsideCount = students.filter((s) => s.status === 'OUTSIDE').length;
  const onCampusVisitorCount = visitors.filter((v) => v.status === 'ON_CAMPUS').length;

  return (
    <div className="min-h-screen bg-[#f5f9fc] text-[#173a5f] flex flex-col font-sans">
      
      {/* Universal Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={currentUser.role === 'ADMIN' && activeTab !== 'public_preview' ? 'admin' : activeTab}
        onSelectTab={handleSelectTab}
        outsideCount={outsideCount}
        visitorCount={onCampusVisitorCount}
        onOpenPublicDisplay={handleOpenPublicDisplay}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6">
        
        {/* Guard Station Tab 1: Guard Desk Terminal (GATE_SYSTEM only) */}
        {currentUser.role === 'GATE_SYSTEM' && activeTab === 'guard' && (
          <GuardDesk
            students={students}
            movements={movements}
            visitors={visitors}
            onOpenScanner={() => {
              StorageService.broadcastPublicDisplay({
                mode: 'SCANNER_ACTIVE',
                timestamp: Date.now(),
                scanner: {
                  statusText: 'SCANNER ACTIVE · AWAITING QR CODE',
                  isDetected: false,
                },
                activeActionLabel: 'Guard Terminal opened Live QR & Barcode Scanner',
              });
              setIsScannerOpen(true);
            }}
            onOpenNewVisitor={() => {
              StorageService.broadcastPublicDisplay({
                mode: 'VISITOR_REGISTER',
                timestamp: Date.now(),
                visitor: {
                  headVisitorName: 'New Visitor',
                  passNumber: 'VP-NEW',
                  totalVisitors: 1,
                  whomToMeet: 'School Official',
                },
                activeActionLabel: 'Guard Terminal opened Visitor Registration Desk',
              });
              setVisitorModalMode('NEW');
              setInitialVisitorForOut(null);
              setIsVisitorModalOpen(true);
            }}
            onOpenVisitorOut={(v) => {
              StorageService.broadcastPublicDisplay({
                mode: 'VISITOR_OUT_WAIT',
                timestamp: Date.now(),
                visitor: v
                  ? {
                      headVisitorName: v.headVisitorName,
                      passNumber: v.passNumber,
                      totalVisitors: v.totalVisitors,
                      whomToMeet: v.whomToMeet,
                    }
                  : undefined,
                activeActionLabel: v
                  ? `Guard checking out visitor: ${v.headVisitorName} (${v.passNumber})`
                  : 'Guard Terminal opened Visitor Checkout Desk',
              });
              setVisitorModalMode('OUT');
              setInitialVisitorForOut(v || null);
              setIsVisitorModalOpen(true);
            }}
            onProcessStudentQr={handleProcessStudentQr}
            onPrintMovementPass={(m) => {
              setPrintMovement(m);
              setPrintVisitor(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            onPrintVisitorPass={(v) => {
              setPrintVisitor(v);
              setPrintMovement(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            onOpenPublicDisplay={handleOpenPublicDisplay}
            onSelectTab={handleSelectTab}
          />
        )}

        {/* Guard Station Tab 2: Active Student Movements (GATE_SYSTEM only) */}
        {currentUser.role === 'GATE_SYSTEM' && activeTab === 'movements' && (
          <ActiveMovementsView
            movements={movements}
            students={students}
            onProcessStudentIn={handleProcessStudentQr}
            onPrintMovementPass={(m) => {
              setPrintMovement(m);
              setPrintVisitor(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            onResendEmail={handleResendStudentEmail}
          />
        )}

        {/* Guard Station Tab 3: Visitors Desk (GATE_SYSTEM only) */}
        {currentUser.role === 'GATE_SYSTEM' && activeTab === 'visitors' && (
          <VisitorDeskView
            visitors={visitors}
            onOpenNewVisitor={() => {
              StorageService.broadcastPublicDisplay({
                mode: 'VISITOR_REGISTER',
                timestamp: Date.now(),
                visitor: {
                  headVisitorName: 'New Visitor',
                  passNumber: 'VP-NEW',
                  totalVisitors: 1,
                  whomToMeet: 'School Official',
                },
                activeActionLabel: 'Guard Terminal opened Visitor Registration Desk',
              });
              setVisitorModalMode('NEW');
              setInitialVisitorForOut(null);
              setIsVisitorModalOpen(true);
            }}
            onCheckoutVisitor={handleCheckoutVisitor}
            onPrintVisitorPass={(v) => {
              setPrintVisitor(v);
              setPrintMovement(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            onResendEmail={handleResendVisitorEmail}
          />
        )}

        {/* Admin Dashboard: Analytics, Database & Management (ADMIN only - NO Gate Desk) */}
        {currentUser.role === 'ADMIN' && activeTab !== 'public_preview' && (
          <AdminDashboard
            students={students}
            movements={movements}
            visitors={visitors}
            auditLogs={auditLogs}
            onRefreshData={refreshAllData}
            onPrintMovementPass={(m) => {
              setPrintMovement(m);
              setPrintVisitor(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            onPrintVisitorPass={(v) => {
              setPrintVisitor(v);
              setPrintMovement(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            onBatchPrintQrCards={handleBatchPrintQrCards}
          />
        )}

        {/* Tab 5: Monitor 2 Live Preview */}
        {activeTab === 'public_preview' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#d5e0eb] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-[#012758]">
                  Public Display Monitor 2 Preview
                </h3>
                <p className="text-xs text-[#688099]">
                  This live view is what visitors and students see on Monitor 2 at the Golden Gate.
                </p>
              </div>
              <button
                onClick={handleOpenPublicDisplay}
                className="px-4 py-2 bg-[#fda31b] hover:bg-[#e59214] text-[#012758] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Launch Standalone Window for Monitor 2 ↗
              </button>
            </div>

            <div className="border-4 border-[#012758] rounded-2xl overflow-hidden shadow-2xl">
              <PublicDisplay />
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#d5e0eb] bg-white py-3 text-center text-xs text-[#688099]">
        Birla Public School, Pilani · Golden Gate Access Control & Security Register
      </footer>

      {/* Guard-Only Operational Modals (GATE_SYSTEM Station) */}
      {currentUser.role === 'GATE_SYSTEM' && (
        <>
          {/* Webcam Scanner Modal */}
          <WebcamScannerModal
            isOpen={isScannerOpen}
            onClose={() => {
              setIsScannerOpen(false);
              StorageService.resetPublicDisplayToIdle();
            }}
            onScanSuccess={handleProcessStudentQr}
            availableStudents={students}
          />

          {/* Student OUT/IN Authorization Modal */}
          <StudentProcessModal
            isOpen={isStudentModalOpen}
            onClose={() => {
              setIsStudentModalOpen(false);
              setSelectedStudentForProcess(null);
              setActiveMovementForProcess(null);
              StorageService.resetPublicDisplayToIdle();
            }}
            student={selectedStudentForProcess}
            activeMovement={activeMovementForProcess}
            onConfirmOut={handleConfirmStudentOut}
            onConfirmIn={handleConfirmStudentIn}
            isAdmin={false}
          />

          {/* Visitor Modal (NEW / OUT) */}
          <VisitorModal
            isOpen={isVisitorModalOpen}
            onClose={() => {
              setIsVisitorModalOpen(false);
              StorageService.resetPublicDisplayToIdle();
            }}
            mode={visitorModalMode}
            onRegisterVisitor={handleRegisterVisitor}
            onCheckoutVisitor={handleCheckoutVisitor}
            activeVisitors={visitors}
            onPrintPass={(v) => {
              setPrintVisitor(v);
              setPrintMovement(null);
              setPrintBatchStudents([]);
              setIsPrintModalOpen(true);
            }}
            initialVisitorForOut={initialVisitorForOut}
          />
        </>
      )}

      {/* Pass Printing Modal (4x3 in slip & A4 batch) */}
      <PassPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintMovement(null);
          setPrintVisitor(null);
          setPrintBatchStudents([]);
        }}
        movementData={printMovement}
        visitorData={printVisitor}
        batchStudents={printBatchStudents}
      />

      {/* Student Automated Digital Pass & Email Prompt Modal */}
      <StudentEmailPromptModal
        isOpen={isEmailPromptOpen}
        onClose={() => {
          setIsEmailPromptOpen(false);
          setEmailPromptMovement(null);
          setEmailPromptStudent(null);
        }}
        movement={emailPromptMovement}
        student={emailPromptStudent}
        onEmailSentSuccessfully={(movementId, recipientEmail) => {
          StorageService.updateMovementEmailStatus(movementId, 'Sent', undefined, recipientEmail);
          refreshAllData();
        }}
        onEmailFailed={(movementId, error, recipientEmail) => {
          StorageService.updateMovementEmailStatus(movementId, 'Failed', error, recipientEmail);
          refreshAllData();
        }}
        onPrintPass={(m) => {
          setPrintMovement(m);
          setPrintVisitor(null);
          setPrintBatchStudents([]);
          setIsPrintModalOpen(true);
        }}
      />

      {/* Non-blocking Toast Notification for Scanner */}
      {scanErrorToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
          <p className="text-xs sm:text-sm font-medium text-slate-100">{scanErrorToast}</p>
          <button
            type="button"
            onClick={() => setScanErrorToast(null)}
            className="text-slate-400 hover:text-white p-1 ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
