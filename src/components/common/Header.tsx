import React, { useState, useEffect } from 'react';
import {
  Monitor,
  LogOut,
  Menu,
  X,
  Users,
  Shield,
  LayoutDashboard,
  Clock,
  BarChart3,
  Database,
  Eye,
} from 'lucide-react';
import { UserAccount, Role } from '../../types';

interface HeaderProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onSwitchRole?: (role: Role) => void;
  activeTab: 'guard' | 'movements' | 'visitors' | 'admin' | 'public_preview';
  onSelectTab: (tab: 'guard' | 'movements' | 'visitors' | 'admin' | 'public_preview') => void;
  outsideCount: number;
  visitorCount: number;
  onOpenPublicDisplay: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onSelectTab,
  outsideCount,
  visitorCount,
  onOpenPublicDisplay,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabClick = (tab: 'guard' | 'movements' | 'visitors' | 'admin' | 'public_preview') => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-[#d5e0eb] text-[#173a5f] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Mobile Menu Toggle Button (for Guard or Admin on mobile) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#173a5f] hover:bg-[#f5f9fc] border border-[#d5e0eb]"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Clean School Title & Station Designation - NO LOGO GRAPHIC */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#012758] text-[#fda31b] shadow-2xs">
            {isAdmin ? <LayoutDashboard className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-[#012758] tracking-tight uppercase font-crest leading-tight">
                Birla Public School, Pilani
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isAdmin ? 'bg-[#fda31b] text-[#012758]' : 'bg-[#012758] text-[#fda31b]'
                }`}
              >
                {isAdmin ? 'ADMIN' : 'GATE'}
              </span>
            </div>
            <span className="text-[10px] text-[#688099] font-medium hidden sm:block">
              {isAdmin
                ? 'Chief Security Officer · Analytics & Roster Management'
                : 'Golden Gate Terminal · Student Movements & Visitors'}
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links - STRICTLY SEPARATED FOR EACH USER */}
        <nav className="hidden md:flex items-center gap-1 bg-[#f5f9fc] p-1 rounded-xl border border-[#d5e0eb]">
          {isAdmin ? (
            /* ADMIN NAVIGATION ONLY (No Gate Desk) */
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#012758] text-white shadow-xs'
                    : 'text-[#173a5f] hover:bg-[#e8f1fa]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#fda31b]" />
                <span>Admin Analytics & Dashboard</span>
              </button>

              <button
                onClick={() => handleTabClick('public_preview')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'public_preview'
                    ? 'bg-[#012758] text-white shadow-xs'
                    : 'text-[#173a5f] hover:bg-[#e8f1fa]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Monitor 2 Preview</span>
              </button>
            </div>
          ) : (
            /* GATE GUARD NAVIGATION ONLY (Scanner & Entry Operations) */
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTabClick('guard')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'guard'
                    ? 'bg-[#012758] text-white shadow-xs'
                    : 'text-[#173a5f] hover:bg-[#e8f1fa]'
                }`}
              >
                Gate Desk (Terminal)
              </button>

              <button
                onClick={() => handleTabClick('movements')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'movements'
                    ? 'bg-[#012758] text-white shadow-xs'
                    : 'text-[#173a5f] hover:bg-[#e8f1fa]'
                }`}
              >
                <span>Active Outside</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono-numbers font-bold ${
                    activeTab === 'movements'
                      ? 'bg-[#fda31b] text-[#012758]'
                      : 'bg-[#fff3d9] text-[#9d6500]'
                  }`}
                >
                  {outsideCount}
                </span>
              </button>

              <button
                onClick={() => handleTabClick('visitors')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'visitors'
                    ? 'bg-[#012758] text-white shadow-xs'
                    : 'text-[#173a5f] hover:bg-[#e8f1fa]'
                }`}
              >
                <span>Visitors</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono-numbers font-bold ${
                    activeTab === 'visitors'
                      ? 'bg-[#fda31b] text-[#012758]'
                      : 'bg-[#e7f5f1] text-[#116e63]'
                  }`}
                >
                  {visitorCount}
                </span>
              </button>

              <button
                onClick={() => handleTabClick('public_preview')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'public_preview'
                    ? 'bg-[#012758] text-white shadow-xs'
                    : 'text-[#173a5f] hover:bg-[#e8f1fa]'
                }`}
              >
                Monitor 2 View
              </button>
            </div>
          )}
        </nav>

        {/* Right Section: Monitor 2, Clock & User Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hardware Second Monitor Button */}
          <button
            onClick={onOpenPublicDisplay}
            title="Launch Monitor 2 display window for public viewing"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fda31b] hover:bg-[#e59214] text-[#012758] font-bold text-xs rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer active:scale-95"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LAUNCH MONITOR 2</span>
            <span className="sm:hidden">DISPLAY</span>
          </button>

          {/* Time & Date Display */}
          <div className="hidden xl:flex flex-col items-end text-right border-l border-[#d5e0eb] pl-3">
            <span className="text-xs font-mono-numbers text-[#012758] font-black tracking-wide">
              {timeStr}
            </span>
            <span className="text-[10px] text-[#688099] font-medium">
              {dateStr}
            </span>
          </div>

          {/* Station Identity & Dedicated Logout (Strict separation, no hot-switching) */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#d5e0eb]">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-[#012758] leading-tight">
                {isAdmin ? 'Chief Security Officer' : 'Golden Gate Guard'}
              </span>
              <span className="text-[10px] text-[#688099]">
                {isAdmin ? 'Administration Authority' : 'Station 1 Terminal'}
              </span>
            </div>

            {/* Logout to Hero Button */}
            <button
              onClick={onLogout}
              title="Logout & Return to Station Selection Hero Screen"
              className="px-2.5 py-1.5 bg-[#fff0ee] hover:bg-[#fde2e0] text-[#ae4439] border border-[#ae4439]/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Station</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer (Separated for Admin vs Guard) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#d5e0eb] bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#688099] pb-1 border-b border-[#e3ebf2]">
            {isAdmin ? 'ADMINISTRATIVE MENU' : 'GUARD GATE NAVIGATION'}
          </div>

          {isAdmin ? (
            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => handleTabClick('admin')}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-[#012758] text-white'
                    : 'text-[#173a5f] hover:bg-[#f5f9fc]'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-[#fda31b]" />
                <span>Admin Analytics & Command</span>
              </button>

              <button
                onClick={() => handleTabClick('public_preview')}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-2 ${
                  activeTab === 'public_preview'
                    ? 'bg-[#012758] text-white'
                    : 'text-[#173a5f] hover:bg-[#f5f9fc]'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Monitor 2 Public Preview</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => handleTabClick('guard')}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between ${
                  activeTab === 'guard'
                    ? 'bg-[#012758] text-white'
                    : 'text-[#173a5f] hover:bg-[#f5f9fc]'
                }`}
              >
                <span>Gate Desk (Scanner & Entry)</span>
                <Shield className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleTabClick('movements')}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between ${
                  activeTab === 'movements'
                    ? 'bg-[#012758] text-white'
                    : 'text-[#173a5f] hover:bg-[#f5f9fc]'
                }`}
              >
                <span>Active Outside Passes</span>
                <span className="font-mono text-xs font-bold text-[#9d6500] bg-[#fff3d9] px-2 py-0.5 rounded-full">
                  {outsideCount}
                </span>
              </button>

              <button
                onClick={() => handleTabClick('visitors')}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between ${
                  activeTab === 'visitors'
                    ? 'bg-[#012758] text-white'
                    : 'text-[#173a5f] hover:bg-[#f5f9fc]'
                }`}
              >
                <span>Visitor Desk</span>
                <span className="font-mono text-xs font-bold text-[#116e63] bg-[#e7f5f1] px-2 py-0.5 rounded-full">
                  {visitorCount}
                </span>
              </button>

              <button
                onClick={() => handleTabClick('public_preview')}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between ${
                  activeTab === 'public_preview'
                    ? 'bg-[#012758] text-white'
                    : 'text-[#173a5f] hover:bg-[#f5f9fc]'
                }`}
              >
                <span>Monitor 2 Public Preview</span>
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-[#e3ebf2] flex items-center justify-between">
            <span className="text-[11px] text-[#688099] font-mono">
              {isAdmin ? 'Logged in as Admin' : 'Logged in as Guard'}
            </span>
            <button
              onClick={onLogout}
              className="text-xs font-bold text-[#ae4439] hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
