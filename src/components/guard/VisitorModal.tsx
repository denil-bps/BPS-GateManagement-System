import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  LogOut,
  Search,
  Printer,
} from 'lucide-react';
import { VisitorGroup } from '../../types';
import { StorageService } from '../../services/storage';

interface VisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'NEW' | 'OUT';
  onRegisterVisitor: (data: {
    headVisitorName: string;
    email: string;
    phone: string;
    accompanyingNames: string[];
    vehicleNumber: string;
    whomToMeet: string;
    purposeReason: string;
  }) => void;
  onCheckoutVisitor: (visitorIdOrPass: string) => void;
  activeVisitors: VisitorGroup[];
  onPrintPass?: (visitor: VisitorGroup) => void;
  initialVisitorForOut?: VisitorGroup | null;
}

export const VisitorModal: React.FC<VisitorModalProps> = ({
  isOpen,
  onClose,
  mode,
  onRegisterVisitor,
  onCheckoutVisitor,
  activeVisitors,
  onPrintPass,
  initialVisitorForOut,
}) => {
  // New Visitor Form State
  const [headVisitorName, setHeadVisitorName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [accompanyingNames, setAccompanyingNames] = useState<string[]>([]);
  const [newAccompanyingInput, setNewAccompanyingInput] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [whomToMeet, setWhomToMeet] = useState<string>('');
  const [purposeReason, setPurposeReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Visitor OUT State
  const [selectedVisitorForOut, setSelectedVisitorForOut] = useState<VisitorGroup | null>(
    initialVisitorForOut || null
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [currentAutoTime, setCurrentAutoTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentAutoTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialVisitorForOut) {
      setSelectedVisitorForOut(initialVisitorForOut);
    }
  }, [initialVisitorForOut]);

  // Real-time synchronization with Public Display (Monitor 2)
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'NEW') {
      StorageService.broadcastPublicDisplay({
        mode: 'VISITOR_REGISTER',
        timestamp: Date.now(),
        visitor: {
          headVisitorName: headVisitorName || 'Prospective Visitor',
          passNumber: 'VP-NEW',
          totalVisitors: 1 + accompanyingNames.length,
          whomToMeet: whomToMeet || 'School Official',
          purposeReason: purposeReason || 'Official Visit',
          vehicleNumber: vehicleNumber || undefined,
          accompanyingNames: accompanyingNames,
          email: email || undefined,
        },
        activeActionLabel: headVisitorName.trim()
          ? `Guard registering: ${headVisitorName} (${1 + accompanyingNames.length} persons, Meeting: ${whomToMeet || 'School'})`
          : 'Guard Terminal opened Visitor Registration Desk',
      });
    } else {
      StorageService.broadcastPublicDisplay({
        mode: 'VISITOR_OUT_WAIT',
        timestamp: Date.now(),
        visitor: selectedVisitorForOut
          ? {
              headVisitorName: selectedVisitorForOut.headVisitorName,
              passNumber: selectedVisitorForOut.passNumber,
              totalVisitors: selectedVisitorForOut.totalVisitors,
              whomToMeet: selectedVisitorForOut.whomToMeet,
            }
          : undefined,
        activeActionLabel: selectedVisitorForOut
          ? `Processing Checkout for Pass ${selectedVisitorForOut.passNumber} (${selectedVisitorForOut.headVisitorName})`
          : 'Guard Terminal opened Visitor Checkout Desk',
      });
    }
  }, [
    isOpen,
    mode,
    headVisitorName,
    whomToMeet,
    accompanyingNames,
    vehicleNumber,
    purposeReason,
    email,
    selectedVisitorForOut,
  ]);

  if (!isOpen) return null;

  const handleAddAccompanying = () => {
    if (newAccompanyingInput.trim()) {
      setAccompanyingNames([...accompanyingNames, newAccompanyingInput.trim()]);
      setNewAccompanyingInput('');
    }
  };

  const handleRemoveAccompanying = (index: number) => {
    setAccompanyingNames(accompanyingNames.filter((_, i) => i !== index));
  };

  const handleSubmitNewVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!headVisitorName.trim()) {
      setFormError('Head visitor name is required.');
      return;
    }

    if (!whomToMeet.trim()) {
      setFormError('Please specify whom the visitor group is meeting.');
      return;
    }

    if (!purposeReason.trim()) {
      setFormError('Please specify the purpose of visit.');
      return;
    }

    onRegisterVisitor({
      headVisitorName: headVisitorName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      accompanyingNames,
      vehicleNumber: vehicleNumber.trim() || 'N/A',
      whomToMeet: whomToMeet.trim(),
      purposeReason: purposeReason.trim(),
    });
  };

  const handleConfirmCheckout = () => {
    if (selectedVisitorForOut) {
      onCheckoutVisitor(selectedVisitorForOut.id);
      setSelectedVisitorForOut(null);
    }
  };

  const filteredActiveVisitors = activeVisitors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.status === 'ON_CAMPUS' &&
      (v.headVisitorName.toLowerCase().includes(q) ||
        v.passNumber.toLowerCase().includes(q) ||
        v.whomToMeet.toLowerCase().includes(q) ||
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.phone.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#d5e0eb] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#012758] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#073a7d] rounded-lg">
              {mode === 'NEW' ? (
                <UserPlus className="w-5 h-5 text-[#fda31b]" />
              ) : (
                <LogOut className="w-5 h-5 text-[#fda31b]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                {mode === 'NEW' ? 'Register New Visitor Group' : 'Process Visitor Exit (OUT)'}
              </h3>
              <p className="text-xs text-[#d5e0eb]">
                Birla Public School · Golden Gate Verification
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {formError && (
            <div className="p-3 bg-[#fff0ee] border border-[#ae4439] rounded-lg text-xs text-[#ae4439] flex items-center gap-2">
              <span>{formError}</span>
            </div>
          )}

          {/* Mode 1: NEW VISITOR REGISTRATION */}
          {mode === 'NEW' && (
            <form onSubmit={handleSubmitNewVisitor} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Head Visitor Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Head Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={headVisitorName}
                    onChange={(e) => setHeadVisitorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] shadow-xs"
                    autoFocus
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98290 12345"
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] font-mono shadow-xs"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. parent@example.com"
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] shadow-xs"
                  />
                </div>

                {/* Vehicle Number */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. RJ-18-CA-4022 or On Foot"
                    className="w-full bg-white border border-[#d5e0eb] text-[#012758] font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] uppercase shadow-xs"
                  />
                </div>

                {/* Whom to Meet */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Whom to Meet *
                  </label>
                  <input
                    type="text"
                    required
                    value={whomToMeet}
                    onChange={(e) => setWhomToMeet(e.target.value)}
                    placeholder="e.g. Housemaster - Panini House / Principal Office"
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] shadow-xs"
                  />
                </div>

                {/* Purpose / Reason */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#012758] mb-1">
                    Purpose / Reason for Visit *
                  </label>
                  <input
                    type="text"
                    required
                    value={purposeReason}
                    onChange={(e) => setPurposeReason(e.target.value)}
                    placeholder="e.g. Weekend Parent Interaction / Campus Tour"
                    className="w-full bg-white border border-[#d5e0eb] text-[#173a5f] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] shadow-xs"
                  />
                </div>

              </div>

              {/* Accompanying Visitors Section */}
              <div className="p-4 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#19558a]" />
                    <span className="text-xs font-bold text-[#012758]">
                      Accompanying Visitors ({accompanyingNames.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-[#688099]">
                    Total Party: <strong className="text-[#012758] font-mono-numbers">{1 + accompanyingNames.length}</strong> persons
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAccompanyingInput}
                    onChange={(e) => setNewAccompanyingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAccompanying();
                      }
                    }}
                    placeholder="Enter guest name (e.g. Priya Sharma, Arjun Sharma)"
                    className="flex-1 bg-white border border-[#d5e0eb] text-[#173a5f] text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#012758] shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAccompanying}
                    className="px-3.5 py-2 bg-[#19558a] hover:bg-[#073a7d] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Person</span>
                  </button>
                </div>

                {accompanyingNames.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {accompanyingNames.map((name, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#d5e0eb] rounded-lg text-xs text-[#012758] shadow-2xs font-medium"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAccompanying(idx)}
                          className="text-[#ae4439] hover:text-[#012758] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Automatic Timestamp */}
              <div className="flex items-center justify-between p-3 bg-[#e8f1fa] border border-[#d5e0eb] rounded-lg text-xs">
                <span className="text-[#19558a] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#19558a]" />
                  Time IN (Recorded Automatically):
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
                  <CheckCircle className="w-4 h-4 text-[#fda31b]" />
                  <span>ISSUE VISITOR PASS & MARK IN</span>
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: VISITOR OUT */}
          {mode === 'OUT' && (
            <div className="space-y-4">
              
              {/* Search or Select Visitor */}
              {!selectedVisitorForOut ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#19558a]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search active visitor by Pass ID, Name, Phone or Vehicle..."
                      className="w-full bg-[#f5f9fc] border border-[#d5e0eb] text-[#173a5f] text-xs rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#012758] font-mono"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredActiveVisitors.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#688099] border border-dashed border-[#d5e0eb] rounded-xl bg-[#f5f9fc]">
                        No active visitors on campus matching query.
                      </div>
                    ) : (
                      filteredActiveVisitors.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVisitorForOut(v)}
                          className="p-3 bg-[#f5f9fc] hover:bg-[#e8f1fa] border border-[#d5e0eb] hover:border-[#19558a] rounded-xl cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#012758]">
                                {v.headVisitorName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40 font-bold">
                                {v.passNumber}
                              </span>
                              <span className="text-[11px] text-[#688099]">
                                ({v.totalVisitors} {v.totalVisitors > 1 ? 'visitors' : 'visitor'})
                              </span>
                            </div>

                            <p className="text-xs text-[#315172] mt-0.5">
                              Visiting: <span className="text-[#012758] font-medium">{v.whomToMeet}</span> · Veh: <span className="font-mono text-[#012758] font-medium">{v.vehicleNumber}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-[#688099] block font-mono">
                              IN: {new Date(v.dateTimeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-[#19558a] font-bold group-hover:underline">
                              Select for Exit →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Selected Visitor Confirmation */
                <div className="space-y-4">
                  <div className="p-4 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[#e3ebf2] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#012758]">
                          {selectedVisitorForOut.headVisitorName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-[#e7f5f1] text-[#116e63] border border-[#116e63]/40 font-bold">
                          {selectedVisitorForOut.passNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedVisitorForOut(null)}
                        className="text-xs text-[#19558a] hover:underline cursor-pointer"
                      >
                        Change Selection
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#688099] block">Time IN:</span>
                        <span className="font-mono-numbers text-[#012758] font-bold">
                          {new Date(selectedVisitorForOut.dateTimeIn).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#688099] block">Total Visitors:</span>
                        <span className="text-[#012758] font-bold">
                          {selectedVisitorForOut.totalVisitors} person(s)
                        </span>
                      </div>

                      <div>
                        <span className="text-[#688099] block">Whom Met:</span>
                        <span className="text-[#012758] font-bold">
                          {selectedVisitorForOut.whomToMeet}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#688099] block">Vehicle:</span>
                        <span className="font-mono-numbers text-[#012758] font-bold">
                          {selectedVisitorForOut.vehicleNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {onPrintPass && (
                      <button
                        type="button"
                        onClick={() => onPrintPass(selectedVisitorForOut)}
                        className="px-4 py-2 bg-white hover:bg-[#e8f1fa] text-[#19558a] border border-[#d5e0eb] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Pass Slip</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedVisitorForOut(null)}
                      className="px-4 py-2 bg-[#f5f9fc] hover:bg-[#e8f1fa] text-[#173a5f] text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-[#d5e0eb]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCheckout}
                      className="px-6 py-2.5 bg-[#19558a] hover:bg-[#073a7d] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <LogOut className="w-4 h-4 text-[#fda31b]" />
                      <span>CONFIRM EXIT (MARK COMPLETED)</span>
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
