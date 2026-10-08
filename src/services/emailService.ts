import { StudentMovement, VisitorGroup, Student } from '../types';
import { generateStudentPassPdf, generateVisitorPassPdf } from './pdfGenerator';

export interface SendEmailResult {
  success: boolean;
  error?: string;
  simulated?: boolean;
  messageId?: string;
}

export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Builds the official HTML email body for a Student Gate Pass.
 */
export function buildStudentPassEmailHtml(
  movement: StudentMovement,
  student?: Student | null
): string {
  const formattedTimeOut = movement.dateTimeOut
    ? new Date(movement.dateTimeOut).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const classSection = student ? `Class ${student.class}-${student.section}` : 'N/A';
  const studentId = student?.admissionNo || movement.studentId || 'N/A';
  const goingWith = movement.isGoingSelf
    ? 'Going Self (Unaccompanied)'
    : movement.goingWithWhom || 'Self';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BPS Golden Gate Pass #${movement.gatePassNo}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f5f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #173a5f;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d5e0eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(1, 39, 88, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #012758; padding: 28px 32px; border-bottom: 4px solid #fda31b; text-align: left;">
        <div style="color: #fda31b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
          VIDYA NIKETAN
        </div>
        <div style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px;">
          BIRLA PUBLIC SCHOOL, PILANI
        </div>
        <div style="color: #d5e0eb; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-top: 6px;">
          GOLDEN GATE — DIGITAL PASS
        </div>
      </td>
    </tr>

    <!-- Pass Confirmation Banner -->
    <tr>
      <td style="padding: 24px 32px 12px 32px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff3d9; border: 1px solid #fda31b; border-radius: 8px; padding: 14px 18px;">
          <tr>
            <td>
              <span style="font-size: 11px; font-weight: bold; color: #9d6500; text-transform: uppercase; letter-spacing: 1px;">
                Official Digital Gate Pass Issued
              </span>
              <div style="font-size: 18px; font-weight: 800; color: #012758; margin-top: 2px;">
                Pass #${movement.gatePassNo}
              </div>
            </td>
            <td align="right">
              <span style="display: inline-block; background-color: #116e63; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">
                OUTSIDE CAMPUS
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content Table -->
    <tr>
      <td style="padding: 12px 32px 24px 32px;">
        <p style="font-size: 14px; line-height: 1.5; color: #315172; margin: 0 0 16px 0;">
          This official digital gate pass has been registered at the Birla Public School Golden Gate for <strong>${movement.studentName}</strong>. A PDF copy of this pass has also been attached to this email.
        </p>

        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold; width: 40%;">Student Name</td>
            <td style="color: #012758; font-weight: 800; font-size: 14px;">${movement.studentName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Student ID / Admission No.</td>
            <td style="color: #173a5f; font-weight: 600;">${studentId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Class & Section</td>
            <td style="color: #173a5f; font-weight: 600;">${classSection}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Boarding House</td>
            <td style="color: #012758; font-weight: 700;">${movement.house} House</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">House No.</td>
            <td style="color: #173a5f; font-weight: 600; font-family: monospace;">${movement.houseNo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Gate Pass Number</td>
            <td style="color: #012758; font-weight: 800; font-family: monospace;">${movement.gatePassNo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Movement Type</td>
            <td style="color: #9d6500; font-weight: 700;">${movement.movementType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Purpose / Reason</td>
            <td style="color: #173a5f;">${movement.purposeReason}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Vehicle Number</td>
            <td style="color: #173a5f; font-weight: 600; font-family: monospace;">${movement.vehicleNo || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Going With Whom</td>
            <td style="color: #173a5f; font-weight: 600;">${goingWith}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Date & Time OUT</td>
            <td style="color: #012758; font-weight: 700;">${formattedTimeOut}</td>
          </tr>
          ${
            movement.expectedReturn
              ? `
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Expected Return</td>
            <td style="color: #173a5f; font-weight: 600;">${movement.expectedReturn}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="color: #688099; font-weight: bold;">Gate Pass Status</td>
            <td style="color: #116e63; font-weight: 800;">AUTHORIZED DEPARTURE (OUT)</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f5f9fc; border-top: 1px solid #d5e0eb; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #688099;">
          This is an automatically generated email from the BPS Golden Gate Management System. Please retain this pass for your records.
        </p>
        <p style="margin: 6px 0 0 0; font-size: 10px; color: #9bb0c4;">
          Birla Public School, Pilani (Vidya Niketan) · Golden Gate Access Control & Security
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Builds the official HTML email body for a Visitor Pass.
 */
export function buildVisitorPassEmailHtml(visitor: VisitorGroup): string {
  const formattedTimeIn = visitor.dateTimeIn
    ? new Date(visitor.dateTimeIn).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const accompanying = visitor.accompanyingNames?.length
    ? visitor.accompanyingNames.join(', ')
    : 'None (Solo Visitor)';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BPS Golden Gate — Visitor Pass ${visitor.passNumber}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f5f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #173a5f;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d5e0eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(1, 39, 88, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #012758; padding: 28px 32px; border-bottom: 4px solid #fda31b; text-align: left;">
        <div style="color: #fda31b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
          VIDYA NIKETAN
        </div>
        <div style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px;">
          BIRLA PUBLIC SCHOOL, PILANI
        </div>
        <div style="color: #d5e0eb; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-top: 6px;">
          GOLDEN GATE — DIGITAL PASS
        </div>
      </td>
    </tr>

    <!-- Pass Confirmation Banner -->
    <tr>
      <td style="padding: 24px 32px 12px 32px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #e7f5f1; border: 1px solid #116e63; border-radius: 8px; padding: 14px 18px;">
          <tr>
            <td>
              <span style="font-size: 11px; font-weight: bold; color: #116e63; text-transform: uppercase; letter-spacing: 1px;">
                Temporary Visitor Pass Issued
              </span>
              <div style="font-size: 18px; font-weight: 800; color: #012758; margin-top: 2px;">
                Pass ID: ${visitor.passNumber}
              </div>
            </td>
            <td align="right">
              <span style="display: inline-block; background-color: #012758; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">
                ON CAMPUS
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content Table -->
    <tr>
      <td style="padding: 12px 32px 24px 32px;">
        <p style="font-size: 14px; line-height: 1.5; color: #315172; margin: 0 0 16px 0;">
          Welcome to Birla Public School, Pilani. A digital visitor pass has been registered for <strong>${visitor.headVisitorName}</strong> at the Golden Gate. An official PDF pass is attached to this email.
        </p>

        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold; width: 40%;">Head Visitor Name</td>
            <td style="color: #012758; font-weight: 800; font-size: 14px;">${visitor.headVisitorName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Visitor Pass ID</td>
            <td style="color: #012758; font-weight: 800; font-family: monospace;">${visitor.passNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Accompanying Visitors</td>
            <td style="color: #173a5f; font-weight: 600;">${accompanying} (${visitor.totalVisitors} total)</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Vehicle Number</td>
            <td style="color: #173a5f; font-weight: 600; font-family: monospace;">${visitor.vehicleNumber || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Whom to Meet</td>
            <td style="color: #012758; font-weight: 700;">${visitor.whomToMeet}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2;">
            <td style="color: #688099; font-weight: bold;">Purpose of Visit</td>
            <td style="color: #173a5f;">${visitor.purposeReason}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e3ebf2; background-color: #f5f9fc;">
            <td style="color: #688099; font-weight: bold;">Date & Time IN</td>
            <td style="color: #012758; font-weight: 700;">${formattedTimeIn}</td>
          </tr>
          <tr>
            <td style="color: #688099; font-weight: bold;">Visitor Pass Status</td>
            <td style="color: #116e63; font-weight: 800;">ACTIVE TEMPORARY CAMPUS ACCESS</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f5f9fc; border-top: 1px solid #d5e0eb; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #688099;">
          This is an automatically generated email from the BPS Golden Gate Management System. Please retain this pass for your records.
        </p>
        <p style="margin: 6px 0 0 0; font-size: 10px; color: #9bb0c4;">
          Birla Public School, Pilani (Vidya Niketan) · Golden Gate Access Control & Security
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches student pass email with PDF attachment.
 */
export async function sendStudentPassEmail(
  movement: StudentMovement,
  recipientEmail: string,
  student?: Student | null
): Promise<SendEmailResult> {
  try {
    if (!isValidEmailAddress(recipientEmail)) {
      return {
        success: false,
        error: 'Invalid recipient email format.',
      };
    }

    // 1. Generate 4x3 in physical-look digital pass PDF
    const { base64, filename } = await generateStudentPassPdf(movement, student);

    // 2. Generate HTML email body
    const htmlContent = buildStudentPassEmailHtml(movement, student);
    const subject = `BPS Golden Gate — Gate Pass #${movement.gatePassNo} — ${movement.studentName}`;

    // 3. Dispatch to secure server endpoint
    const response = await fetch('/api/send-pass-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'STUDENT_PASS',
        recipientEmail: recipientEmail.trim(),
        subject,
        htmlContent,
        pdfAttachment: {
          filename,
          base64,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to dispatch pass notification email.',
      };
    }

    return {
      success: true,
      simulated: data.simulated,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error('Error dispatching student pass email:', err);
    return {
      success: false,
      error: err.message || 'Network error communicating with email dispatch service.',
    };
  }
}

/**
 * Dispatches visitor pass email with PDF attachment.
 */
export async function sendVisitorPassEmail(
  visitor: VisitorGroup
): Promise<SendEmailResult> {
  try {
    if (!visitor.email || !isValidEmailAddress(visitor.email)) {
      return {
        success: false,
        error: 'No valid recipient email address provided for head visitor.',
      };
    }

    // 1. Generate 4x3 in physical-look digital pass PDF
    const { base64, filename } = await generateVisitorPassPdf(visitor);

    // 2. Generate HTML email body
    const htmlContent = buildVisitorPassEmailHtml(visitor);
    const subject = `BPS Golden Gate — Visitor Pass ${visitor.passNumber}`;

    // 3. Dispatch to secure server endpoint
    const response = await fetch('/api/send-pass-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'VISITOR_PASS',
        recipientEmail: visitor.email.trim(),
        subject,
        htmlContent,
        pdfAttachment: {
          filename,
          base64,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to dispatch visitor pass email.',
      };
    }

    return {
      success: true,
      simulated: data.simulated,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error('Error dispatching visitor pass email:', err);
    return {
      success: false,
      error: err.message || 'Network error communicating with email dispatch service.',
    };
  }
}
