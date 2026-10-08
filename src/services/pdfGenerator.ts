import { jsPDF } from 'jspdf';
import { StudentMovement, VisitorGroup, Student } from '../types';
import { generateQrDataUrl } from './qrHelper';

/**
 * Generates an official 4 × 3 inch physical-look digital pass PDF.
 * Uses Birla Public School Pilani typography, official colors, and scannable QR code.
 */
export async function generateStudentPassPdf(
  movement: StudentMovement,
  student?: Student | null
): Promise<{ base64: string; dataUrl: string; filename: string }> {
  // 4 × 3 inches in landscape orientation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [3, 4], // height 3 in, width 4 in
  });

  const width = 4.0;
  const height = 3.0;

  // Outer border & background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  doc.setDrawColor(1, 39, 88); // #012758 Heritage Navy
  doc.setLineWidth(0.02);
  doc.rect(0.08, 0.08, width - 0.16, height - 0.16);

  // Top header bar (Heritage Navy)
  doc.setFillColor(1, 39, 88);
  doc.rect(0.08, 0.08, width - 0.16, 0.58, 'F');

  // Top Gold accent stripe
  doc.setFillColor(253, 163, 27); // #fda31b Gold
  doc.rect(0.08, 0.64, width - 0.16, 0.03, 'F');

  // Header Typography
  doc.setTextColor(253, 163, 27);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('VIDYA NIKETAN', 0.2, 0.22);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BIRLA PUBLIC SCHOOL, PILANI', 0.2, 0.38);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('GOLDEN GATE — OFFICIAL STUDENT GATE PASS', 0.2, 0.51);

  // Pass Number Badge (Top right of header)
  doc.setFillColor(253, 163, 27);
  doc.roundedRect(2.8, 0.15, 1.05, 0.38, 0.04, 0.04, 'F');
  doc.setTextColor(1, 39, 88);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('PASS NUMBER', 2.86, 0.27);
  doc.setFontSize(8.5);
  doc.text(movement.gatePassNo || `GP-${movement.sNo}`, 2.86, 0.44);

  // Body: Student Name & House Details
  doc.setTextColor(1, 39, 88);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(movement.studentName, 0.2, 0.84);

  doc.setTextColor(25, 85, 138); // #19558a
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const classText = student ? `Class ${student.class}-${student.section}` : '';
  const houseText = `${movement.house} House · House No: ${movement.houseNo}`;
  doc.text(`${houseText}${classText ? ` · ${classText}` : ''}`, 0.2, 0.98);

  // Divider line
  doc.setDrawColor(213, 224, 235);
  doc.setLineWidth(0.01);
  doc.line(0.2, 1.05, 2.65, 1.05);

  // Left Details Column (2.45 in wide)
  const leftX = 0.2;
  const valX = 1.05;
  let currentY = 1.2;
  const rowSpacing = 0.18;

  const addRow = (label: string, value: string, isAlert = false) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(104, 128, 153); // #688099
    doc.text(label, leftX, currentY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    if (isAlert) {
      doc.setTextColor(157, 101, 0); // Gold / Dark Orange
    } else {
      doc.setTextColor(23, 58, 95); // #173a5f
    }
    // Truncate if too long
    const cleanVal = doc.splitTextToSize(value || 'N/A', 1.55);
    doc.text(cleanVal[0] || '', valX, currentY);
    currentY += rowSpacing;
  };

  const formattedTimeOut = movement.dateTimeOut
    ? new Date(movement.dateTimeOut).toLocaleString('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'N/A';

  addRow('Movement Type:', movement.movementType, true);
  addRow('Purpose / Reason:', movement.purposeReason || 'Official Outing');
  addRow('Going With:', movement.isGoingSelf ? 'Self (Unaccompanied)' : movement.goingWithWhom || 'Self');
  addRow('Vehicle Number:', movement.vehicleNo || 'N/A');
  addRow('Departure Time:', formattedTimeOut);
  if (movement.expectedReturn) {
    addRow('Expected Return:', movement.expectedReturn);
  }

  // Right Side: QR Code (2.75 to 3.85 in)
  try {
    const qrString = `BPS-MOV-${movement.gatePassNo}-${movement.studentId}`;
    const qrDataUrl = await generateQrDataUrl(qrString, 200);
    // Draw QR image
    doc.addImage(qrDataUrl, 'PNG', 2.75, 0.85, 1.1, 1.1);

    // QR Helper text
    doc.setTextColor(104, 128, 153);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan for Gate Verification', 2.77, 2.05);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(1, 39, 88);
    doc.text(movement.gatePassNo, 2.82, 2.16);
  } catch (err) {
    console.error('Failed to embed QR code in student pass PDF:', err);
  }

  // Footer bar (Bottom 0.35 in)
  doc.setFillColor(245, 249, 252);
  doc.rect(0.08, 2.45, width - 0.16, 0.47, 'F');
  doc.setDrawColor(213, 224, 235);
  doc.line(0.08, 2.45, width - 0.08, 2.45);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 110, 99); // #116e63 green
  doc.text('STATUS: AUTHORIZED DEPARTURE (OUT)', 0.2, 2.62);

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(104, 128, 153);
  doc.text(
    'This is an official digital gate pass issued by Birla Public School, Pilani (Golden Gate). Retain for verification.',
    0.2,
    2.78
  );

  const base64 = doc.output('datauristring').split(',')[1];
  const dataUrl = doc.output('datauristring');
  const filename = `BPS_GatePass_${movement.gatePassNo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${movement.studentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  return { base64, dataUrl, filename };
}

/**
 * Generates an official 4 × 3 inch physical-look visitor pass PDF.
 */
export async function generateVisitorPassPdf(
  visitor: VisitorGroup
): Promise<{ base64: string; dataUrl: string; filename: string }> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [3, 4],
  });

  const width = 4.0;
  const height = 3.0;

  // Outer border & background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  doc.setDrawColor(1, 39, 88);
  doc.setLineWidth(0.02);
  doc.rect(0.08, 0.08, width - 0.16, height - 0.16);

  // Top header bar (Heritage Navy)
  doc.setFillColor(1, 39, 88);
  doc.rect(0.08, 0.08, width - 0.16, 0.58, 'F');

  // Top Gold accent stripe
  doc.setFillColor(253, 163, 27);
  doc.rect(0.08, 0.64, width - 0.16, 0.03, 'F');

  // Header Typography
  doc.setTextColor(253, 163, 27);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('VIDYA NIKETAN', 0.2, 0.22);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BIRLA PUBLIC SCHOOL, PILANI', 0.2, 0.38);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('GOLDEN GATE — OFFICIAL VISITOR PASS', 0.2, 0.51);

  // Pass Number Badge
  doc.setFillColor(253, 163, 27);
  doc.roundedRect(2.8, 0.15, 1.05, 0.38, 0.04, 0.04, 'F');
  doc.setTextColor(1, 39, 88);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('VISITOR PASS ID', 2.85, 0.27);
  doc.setFontSize(8.5);
  doc.text(visitor.passNumber, 2.85, 0.44);

  // Body: Visitor Name & Party Count
  doc.setTextColor(1, 39, 88);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(visitor.headVisitorName, 0.2, 0.84);

  doc.setTextColor(25, 85, 138);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const partyText = `Total Visitors: ${visitor.totalVisitors} ${
    visitor.accompanyingNames?.length
      ? `(${visitor.accompanyingNames.slice(0, 2).join(', ')}${
          visitor.accompanyingNames.length > 2 ? '...' : ''
        })`
      : '(Head Only)'
  }`;
  doc.text(partyText, 0.2, 0.98);

  // Divider line
  doc.setDrawColor(213, 224, 235);
  doc.setLineWidth(0.01);
  doc.line(0.2, 1.05, 2.65, 1.05);

  // Left Details Column
  const leftX = 0.2;
  const valX = 1.05;
  let currentY = 1.2;
  const rowSpacing = 0.18;

  const addRow = (label: string, value: string, isAlert = false) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(104, 128, 153);
    doc.text(label, leftX, currentY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    if (isAlert) {
      doc.setTextColor(17, 110, 99);
    } else {
      doc.setTextColor(23, 58, 95);
    }
    const cleanVal = doc.splitTextToSize(value || 'N/A', 1.55);
    doc.text(cleanVal[0] || '', valX, currentY);
    currentY += rowSpacing;
  };

  const formattedTimeIn = visitor.dateTimeIn
    ? new Date(visitor.dateTimeIn).toLocaleString('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'N/A';

  addRow('Whom To Meet:', visitor.whomToMeet);
  addRow('Purpose of Visit:', visitor.purposeReason || 'Official Visit');
  addRow('Vehicle Number:', visitor.vehicleNumber || 'N/A');
  addRow('Entry Time (IN):', formattedTimeIn, true);
  if (visitor.phone) {
    addRow('Contact Phone:', visitor.phone);
  }

  // Right Side: QR Code
  try {
    const qrString = `BPS-VIS-${visitor.passNumber}`;
    const qrDataUrl = await generateQrDataUrl(qrString, 200);
    doc.addImage(qrDataUrl, 'PNG', 2.75, 0.85, 1.1, 1.1);

    doc.setTextColor(104, 128, 153);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan for Return / Checkout', 2.75, 2.05);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(1, 39, 88);
    doc.text(visitor.passNumber, 2.85, 2.16);
  } catch (err) {
    console.error('Failed to embed QR code in visitor pass PDF:', err);
  }

  // Footer bar
  doc.setFillColor(245, 249, 252);
  doc.rect(0.08, 2.45, width - 0.16, 0.47, 'F');
  doc.setDrawColor(213, 224, 235);
  doc.line(0.08, 2.45, width - 0.08, 2.45);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 110, 99);
  doc.text('STATUS: TEMPORARY ON-CAMPUS PASS', 0.2, 2.62);

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(104, 128, 153);
  doc.text(
    'Please surrender this pass or scan at the Golden Gate upon exit. Have a pleasant visit.',
    0.2,
    2.78
  );

  const base64 = doc.output('datauristring').split(',')[1];
  const dataUrl = doc.output('datauristring');
  const filename = `BPS_VisitorPass_${visitor.passNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${visitor.headVisitorName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  return { base64, dataUrl, filename };
}
