import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Monitor,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Role, UserAccount } from '../../types';
import { INITIAL_USERS } from '../../data/mockData';

interface HeroLoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  onOpenPublicDisplay: () => void;
  studentCount: number;
}

export const HeroLoginScreen: React.FC<HeroLoginScreenProps> = ({
  onLoginSuccess,
  onOpenPublicDisplay,
}) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setPassword('');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedRole) {
      setErrorMessage('Please select an operational station to proceed.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter the station access password.');
      return;
    }

    // Check station password securely with exact user credentials without displaying it in UI
    const validPass = selectedRole === 'ADMIN' ? 'admin-gate@bpspilani123' : 'gate@bpspilani123';
    if (password.trim() !== validPass) {
      setErrorMessage(
        `Incorrect access password for ${
          selectedRole === 'ADMIN' ? 'Administrator' : 'Gate System'
        }. Please check your credentials and retry.`
      );
      return;
    }

    const matchedUser =
      selectedRole === 'ADMIN' ? INITIAL_USERS[0] : INITIAL_USERS[1];
    onLoginSuccess(matchedUser);
  };

  return (
    <div className="min-h-screen bg-[#f5f9fc] flex flex-col justify-between text-[#173a5f]">
      {/* Top Bar with Live Indicator */}
      <header className="w-full bg-white border-b border-[#d5e0eb] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#116e63] animate-pulse" />
          <span className="text-xs font-bold text-[#173a5f] uppercase tracking-wider">
            Birla Public School, Pilani
          </span>
          <span className="hidden sm:inline-block text-[#d5e0eb]">|</span>
          <span className="hidden sm:inline-block text-xs font-semibold text-[#688099]">
            Golden Gate Security Network
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Monitor 2 button right from Hero */}
          <button
            onClick={onOpenPublicDisplay}
            title="Open Public Display for Monitor 2"
            className="px-3 py-1.5 bg-[#e8f1fa] hover:bg-[#d5e0eb] text-[#19558a] font-bold text-xs rounded-lg border border-[#d5e0eb] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5 text-[#fda31b]" />
            <span className="hidden sm:inline">Launch Public Display (Monitor 2)</span>
            <span className="sm:hidden">Monitor 2</span>
          </button>
        </div>
      </header>

      {/* Main Hero & Station Selector */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center">
        
        {/* School Branding - Clean Typography, No Graphic Logo */}
        <div className="text-center mb-6 animate-in fade-in duration-300">
          <span className="text-[11px] font-mono font-bold text-[#19558a] tracking-widest uppercase block">
            Vidya Niketan
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#012758] tracking-tight font-crest uppercase mt-1">
            Birla Public School, Pilani
          </h2>
          <span className="text-xs text-[#688099] font-medium block mt-0.5">
            Golden Gate Security & Administration Terminal
          </span>
        </div>

        {/* Portal Headline */}
        <div className="text-center max-w-2xl mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff3d9] border border-[#fda31b]/60 text-[#9d6500] text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-[#fda31b]" />
            <span>Golden Gate Station · Dual-Station Access</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#012758] tracking-tight font-crest uppercase">
            Select Station to Enter
          </h1>
          <p className="text-xs sm:text-sm text-[#315172] font-medium max-w-lg mx-auto">
            Choose your authorized operational role below, enter your access password, and open your dedicated dashboard.
          </p>
        </div>

        {/* Two Station Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl mb-8">
          
          {/* CARD 1: GATE SYSTEM (Duty Guard) */}
          <div
            onClick={() => handleSelectRole('GATE_SYSTEM')}
            className={`p-6 bg-white rounded-2xl border-2 transition-all cursor-pointer relative shadow-xs flex flex-col justify-between text-left ${
              selectedRole === 'GATE_SYSTEM'
                ? 'border-[#012758] ring-4 ring-[#012758]/10 bg-white'
                : 'border-[#d5e0eb] hover:border-[#19558a] hover:bg-[#f5f9fc]'
            }`}
          >
            {selectedRole === 'GATE_SYSTEM' && (
              <div className="absolute top-4 right-4 text-[#012758]">
                <CheckCircle2 className="w-5 h-5 fill-[#012758] text-white" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-[#e8f1fa] text-[#012758] border border-[#d5e0eb] rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#fda31b] uppercase tracking-wider bg-[#012758] px-2 py-0.5 rounded">
                    TERMINAL 1
                  </span>
                  <h3 className="text-lg font-black text-[#012758] tracking-tight mt-0.5">
                    GATE SYSTEM
                  </h3>
                </div>
              </div>

              <p className="text-xs text-[#315172] leading-relaxed mb-4">
                Used by duty security guards at Golden Gate. Scan student QR codes, authorize physical gate passes OUT, process student returns IN, register visitor groups, and print slips.
              </p>

              <div className="space-y-1.5 text-[11px] text-[#688099] font-medium border-t border-[#e3ebf2] pt-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#116e63]" />
                  <span>Webcam QR Barcode Scanning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#116e63]" />
                  <span>Student Departure (OUT) & Arrival (IN)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#116e63]" />
                  <span>Visitor Group Entry & Pass Slips</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#e3ebf2] flex items-center justify-between">
              <span className="text-xs font-bold text-[#012758]">
                {selectedRole === 'GATE_SYSTEM' ? 'Station Selected' : 'Click to Select Guard Station'}
              </span>
            </div>
          </div>

          {/* CARD 2: ADMINISTRATOR (School CSO & Management) */}
          <div
            onClick={() => handleSelectRole('ADMIN')}
            className={`p-6 bg-white rounded-2xl border-2 transition-all cursor-pointer relative shadow-xs flex flex-col justify-between text-left ${
              selectedRole === 'ADMIN'
                ? 'border-[#012758] ring-4 ring-[#012758]/10 bg-white'
                : 'border-[#d5e0eb] hover:border-[#19558a] hover:bg-[#f5f9fc]'
            }`}
          >
            {selectedRole === 'ADMIN' && (
              <div className="absolute top-4 right-4 text-[#012758]">
                <CheckCircle2 className="w-5 h-5 fill-[#012758] text-white" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-[#fff3d9] text-[#9d6500] border border-[#fda31b]/60 rounded-xl">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#012758] uppercase tracking-wider bg-[#fda31b] px-2 py-0.5 rounded">
                    ADMIN PORTAL
                  </span>
                  <h3 className="text-lg font-black text-[#012758] tracking-tight mt-0.5">
                    ADMINISTRATOR
                  </h3>
                </div>
              </div>

              <p className="text-xs text-[#315172] leading-relaxed mb-4">
                Full school management authority. Comprehensive student & visitor movement analytics, live headcounts, student database management, Excel bulk import, and security audit trail.
              </p>

              <div className="space-y-1.5 text-[11px] text-[#688099] font-medium border-t border-[#e3ebf2] pt-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fda31b]" />
                  <span>Command Analytics (Students & Visitors)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fda31b]" />
                  <span>Student Database & Excel Bulk Import</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fda31b]" />
                  <span>Full Movement Audit & System Settings</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#e3ebf2] flex items-center justify-between">
              <span className="text-xs font-bold text-[#012758]">
                {selectedRole === 'ADMIN' ? 'Station Selected' : 'Click to Select Admin Station'}
              </span>
            </div>
          </div>

        </div>

        {/* Password & Login Form when a role is selected */}
        <div className="w-full max-w-md bg-white border border-[#d5e0eb] rounded-2xl p-6 shadow-md transition-all">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#012758] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#19558a]" />
                  <span>
                    Password for {selectedRole === 'ADMIN' ? 'Administrator' : selectedRole === 'GATE_SYSTEM' ? 'Gate Guard' : 'Selected Station'}:
                  </span>
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    selectedRole
                      ? `Enter password for ${selectedRole === 'ADMIN' ? 'Administrator' : 'Gate Guard'}...`
                      : 'Please select a station above first'
                  }
                  disabled={!selectedRole}
                  className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-sm rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none focus:border-[#012758] focus:bg-white font-mono disabled:opacity-50"
                  autoFocus={Boolean(selectedRole)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#688099] hover:text-[#012758]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#fff0ee] border border-[#ae4439] text-xs text-[#ae4439] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedRole}
              className="w-full py-3 bg-[#012758] hover:bg-[#073a7d] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Login to {selectedRole === 'ADMIN' ? 'Admin Dashboard' : 'Gate Guard Desk'}</span>
            </button>
          </form>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center border-t border-[#d5e0eb] bg-white text-[11px] text-[#688099]">
        <span>Birla Public School, Pilani (Vidya Niketan) · Golden Gate Security System</span>
      </footer>
    </div>
  );
};
