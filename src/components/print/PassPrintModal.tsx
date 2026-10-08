import React, { useState, useEffect } from 'react';
import { X, Printer, Layers } from 'lucide-react';
import { StudentMovement, VisitorGroup, Student } from '../../types';
import { generateQrDataUrl } from '../../services/qrHelper';

interface PassPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  movementData?: StudentMovement | null;
  visitorData?: VisitorGroup | null;
  batchStudents?: Student[];
}

export const PassPrintModal: React.FC<PassPrintModalProps> = ({
  isOpen,
  onClose,
  movementData,
  visitorData,
  batchStudents = [],
}) => {
  const [printLayout, setPrintLayout] = useState<'SLIP' | 'A4_BATCH'>('SLIP');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [batchQrUrls, setBatchQrUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (movementData) {
      generateQrDataUrl(`BPS-MOV-${movementData.gatePassNo}-${movementData.studentId}`).then((url) => {
        setQrDataUrl(url);
      });
    } else if (visitorData) {
      generateQrDataUrl(`BPS-VIS-${visitorData.passNumber}`).then((url) => {
        setQrDataUrl(url);
      });
    }

    if (batchStudents && batchStudents.length > 0) {
      Promise.all(
        batchStudents.map(async (st) => {
          const url = await generateQrDataUrl(st.qrId || st.houseNo);
          return { id: st.id, url };
        })
      ).then((results) => {
        const map: Record<string, string> = {};
        results.forEach((r) => {
          map[r.id] = r.url;
        });
        setBatchQrUrls(map);
      });
    }
  }, [isOpen, movementData, visitorData, batchStudents]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white border border-[#d5e0eb] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Modal Controls Bar (Hidden during window.print) */}
        <div className="no-print px-5 sm:px-6 py-4 bg-[#012758] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#073a7d] rounded-lg">
              <Printer className="w-5 h-5 text-[#fda31b]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Golden Gate Pass Printing Station
              </h2>
              <p className="text-xs text-[#d5e0eb]">
                Print 4×3 inch thermal/bill slip or batch student ID cards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {batchStudents.length > 0 && (
              <div className="flex bg-[#073a7d] p-0.5 rounded-lg border border-[#19558a]">
                <button
                  onClick={() => setPrintLayout('SLIP')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    printLayout === 'SLIP' ? 'bg-[#fda31b] text-[#012758] font-bold' : 'text-[#d5e0eb]'
                  }`}
                >
                  Single Slip (4×3 in)
                </button>
                <button
                  onClick={() => setPrintLayout('A4_BATCH')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    printLayout === 'A4_BATCH' ? 'bg-[#fda31b] text-[#012758] font-bold' : 'text-[#d5e0eb]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>A4 Batch Layout</span>
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#fda31b] hover:bg-[#e59214] text-[#012758] text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>SEND TO PRINTER</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Area */}
        <div className="p-6 overflow-y-auto bg-[#f5f9fc] flex justify-center">
          
          {/* Layout 1: 4×3 INCH COMPACT PASS SLIP */}
          {printLayout === 'SLIP' && (
            <div className="pass-slip-print bg-white text-slate-900 border-2 border-slate-900 rounded-lg p-3 shadow-lg w-[3.9in] min-h-[2.9in] font-sans text-xs flex flex-col justify-between">
              
              {/* Official Header - Clean Typography, No Graphic Logo */}
              <div className="text-center pb-2 border-b border-slate-300">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  Vidya Niketan
                </div>
                <div className="text-sm font-black text-slate-900 uppercase font-crest">
                  Birla Public School, Pilani
                </div>
                <div className="text-[9px] font-mono text-slate-600 font-bold uppercase tracking-wider">
                  Golden Gate Security Terminal · Official Gate Pass
                </div>
              </div>

              {/* Body: Student or Visitor details */}
              <div className="py-2 space-y-1.5 text-[11px] leading-snug">
                {movementData && (
                  <>
                    <div className="flex justify-between items-center bg-slate-100 px-2 py-1 rounded border border-slate-300">
                      <span className="font-bold text-slate-700">GATE PASS NO:</span>
                      <span className="font-mono font-bold text-slate-950 text-xs">
                        {movementData.gatePassNo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Student Name:</span>
                        <span className="font-bold text-black">{movementData.studentName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">House & No:</span>
                        <span className="font-mono font-semibold text-black">
                          {movementData.house} ({movementData.houseNo})
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[10px]">Movement Type:</span>
                        <span className="font-semibold text-black">{movementData.movementType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Vehicle No:</span>
                        <span className="font-mono text-black">{movementData.vehicleNo}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[10px]">Going With Whom:</span>
                        <span className="text-black font-medium">{movementData.goingWithWhom}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[10px]">Reason:</span>
                        <span className="text-black">{movementData.purposeReason}</span>
                      </div>

                      <div className="col-span-2 bg-slate-50 p-1 rounded border border-slate-200 mt-1">
                        <span className="text-gray-500 block text-[9px]">Departure Time OUT:</span>
                        <span className="font-mono font-bold text-black text-[10px]">
                          {new Date(movementData.dateTimeOut).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {visitorData && (
                  <>
                    <div className="flex justify-between items-center bg-slate-100 px-2 py-1 rounded border border-slate-300">
                      <span className="font-bold text-slate-700">VISITOR PASS NO:</span>
                      <span className="font-mono font-bold text-slate-950 text-xs">
                        {visitorData.passNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Head Visitor:</span>
                        <span className="font-bold text-black">{visitorData.headVisitorName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Party Size:</span>
                        <span className="font-bold text-black">{visitorData.totalVisitors} Person(s)</span>
                      </div>

                      {visitorData.accompanyingNames && visitorData.accompanyingNames.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-500 block text-[10px]">Guests:</span>
                          <span className="text-black">{visitorData.accompanyingNames.join(', ')}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-gray-500 block text-[10px]">Whom to Meet:</span>
                        <span className="font-semibold text-black">{visitorData.whomToMeet}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Vehicle No:</span>
                        <span className="font-mono text-black">{visitorData.vehicleNumber}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[10px]">Purpose:</span>
                        <span className="text-black">{visitorData.purposeReason}</span>
                      </div>

                      <div className="col-span-2 bg-slate-50 p-1 rounded border border-slate-200 mt-1">
                        <span className="text-gray-500 block text-[9px]">Entry Time IN:</span>
                        <span className="font-mono font-bold text-black text-[10px]">
                          {new Date(visitorData.dateTimeIn).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer with barcode and signature line */}
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between mt-1">
                <div className="text-[8px] text-gray-500 leading-tight">
                  <p>Must return pass to Golden Gate on exit</p>
                  <p>Golden Gate Security Desk · Pilani</p>
                </div>

                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Pass QR"
                    className="w-12 h-12 border border-slate-400 p-0.5 rounded"
                  />
                )}

                <div className="text-right text-[9px] font-semibold text-gray-800">
                  <div className="border-t border-dashed border-gray-400 pt-1 mt-3">
                    Guard Signature
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layout 2: A4 BATCH ID CARD PRINT */}
          {printLayout === 'A4_BATCH' && (
            <div className="a4-batch-print bg-white p-6 shadow-xl w-[210mm] min-h-[297mm] text-slate-900">
              <div className="text-center pb-4 mb-4 border-b-2 border-slate-900">
                <h1 className="text-xl font-black font-crest text-slate-950 uppercase">
                  Vidya Niketan · Birla Public School, Pilani
                </h1>
                <p className="text-xs font-bold text-slate-700 uppercase">
                  Golden Gate Security · Student ID Card Batch Print
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {batchStudents.map((st) => (
                  <div
                    key={st.id}
                    className="border-2 border-slate-800 rounded-lg p-3 flex flex-col justify-between h-[190px] bg-slate-50 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                      <div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase">
                          BIRLA PUBLIC SCHOOL, PILANI
                        </div>
                        <div className="font-bold text-sm text-slate-950 leading-tight">
                          {st.name}
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          Class {st.class}-{st.section} · {st.house} House
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs font-black text-slate-950 bg-slate-200 px-2 py-0.5 rounded">
                        {st.admissionNo}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <div className="text-xs space-y-0.5">
                        <div className="text-[10px] text-gray-500">Student/House No:</div>
                        <div className="font-mono font-bold text-xs text-slate-950">
                          {st.houseNo}
                        </div>
                        <div className="text-[10px] text-gray-500 pt-1">
                          Father: {st.fatherName || 'On Record'}
                        </div>
                      </div>

                      {batchQrUrls[st.id] && (
                        <div className="flex flex-col items-center">
                          <img
                            src={batchQrUrls[st.id]}
                            alt={st.name}
                            className="w-16 h-16 border border-slate-400 p-0.5 bg-white rounded"
                          />
                          <span className="text-[8px] font-mono mt-0.5 text-gray-600">
                            {st.qrId}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-300 pt-1 text-[8px] text-center text-gray-500 uppercase">
                      Official Student Golden Gate Pass Card · BPS Pilani
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
