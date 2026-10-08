import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Student } from '../../types';

interface DeleteStudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (student: Student) => void;
}

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
  student,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-[#d5e0eb] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#fff0ee] px-5 py-4 border-b border-[#ae4439]/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ae4439] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#ae4439] uppercase tracking-wide">
                Remove Student Record
              </h3>
              <p className="text-xs text-[#315172]">
                Permanent database deletion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#688099] hover:text-[#173a5f] rounded-lg hover:bg-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-[#f5f9fc] border border-[#d5e0eb] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#688099]">Student to Delete:</span>
              <span className="text-[10px] font-mono font-bold bg-[#e8f1fa] text-[#012758] px-2 py-0.5 rounded">
                Adm: {student.admissionNo}
              </span>
            </div>
            <p className="text-base font-black text-[#012758] leading-tight font-crest">
              {student.name}
            </p>
            <div className="text-xs text-[#315172] flex flex-wrap gap-x-3 gap-y-1">
              <span>Class: <strong>{student.class}-{student.section}</strong></span>
              <span>House: <strong>{student.house}</strong></span>
              <span className="font-mono text-[#688099]">({student.houseNo})</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#fff0ee]/70 border border-[#ae4439]/30 text-xs text-[#ad3b32]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#ae4439]" />
            <p>
              Are you sure you want to permanently delete this student? They will be completely removed from your local database and the live cloud Firestore database.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#f5f9fc] px-5 py-3.5 border-t border-[#d5e0eb] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#e8f1fa] text-[#173a5f] border border-[#d5e0eb] font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(student)}
            className="px-4 py-2 bg-[#ae4439] hover:bg-[#ad3b32] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Yes, Delete Student</span>
          </button>
        </div>
      </div>
    </div>
  );
};
