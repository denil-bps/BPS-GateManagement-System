import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Persistent Database Storage File
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'gateflow_db.json');

function initDbFile() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = {
        students: [],
        movements: [],
        visitors: [],
        auditLogs: [],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[DB] Failed to init DB directory or file:', err);
  }
}

function readDb(): { students: any[]; movements: any[]; visitors: any[]; auditLogs: any[] } {
  try {
    initDbFile();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      movements: Array.isArray(parsed.movements) ? parsed.movements : [],
      visitors: Array.isArray(parsed.visitors) ? parsed.visitors : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch (err) {
    console.error('[DB] Error reading database file:', err);
    return { students: [], movements: [], visitors: [], auditLogs: [] };
  }
}

function writeDb(dbData: { students: any[]; movements: any[]; visitors: any[]; auditLogs: any[] }) {
  try {
    initDbFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error writing to database file:', err);
  }
}

// 1. Get entire live database
app.get('/api/database', (req: Request, res: Response) => {
  const data = readDb();
  res.json({
    success: true,
    ...data,
  });
});

// 2. Save / update entire database or specific collections
app.post('/api/database', (req: Request, res: Response) => {
  try {
    const current = readDb();
    const { collection, data, students, movements, visitors, auditLogs } = req.body;

    if (collection && Array.isArray(data)) {
      if (collection === 'students') current.students = data;
      else if (collection === 'movements') current.movements = data;
      else if (collection === 'visitors') current.visitors = data;
      else if (collection === 'auditLogs') current.auditLogs = data;
    } else {
      if (Array.isArray(students)) current.students = students;
      if (Array.isArray(movements)) current.movements = movements;
      if (Array.isArray(visitors)) current.visitors = visitors;
      if (Array.isArray(auditLogs)) current.auditLogs = auditLogs;
    }

    writeDb(current);
    res.json({
      success: true,
      studentsCount: current.students.length,
      movementsCount: current.movements.length,
      visitorsCount: current.visitors.length,
    });
  } catch (err: any) {
    console.error('[DB] Error saving data:', err);
    res.status(500).json({ success: false, error: err.message || 'Database write error' });
  }
});

// 3. Purge database
app.post('/api/database/purge', (req: Request, res: Response) => {
  try {
    const emptyDb = {
      students: [],
      movements: [],
      visitors: [],
      auditLogs: [],
    };
    writeDb(emptyDb);
    res.json({ success: true, message: 'Database purged successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Display State (Cross-Monitor / Cross-Device Live Mirror)
let publicDisplayState: any = { mode: 'IDLE', timestamp: 0 };
const sseClients: Response[] = [];

app.get('/api/public-display', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, payload: publicDisplayState });
});

// Real-Time Server-Sent Events stream for Monitor 2
app.get('/api/public-display/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  // Send current state immediately upon connection
  res.write(`data: ${JSON.stringify(publicDisplayState)}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

app.post('/api/public-display', (req: Request, res: Response) => {
  if (req.body && req.body.mode) {
    const incomingTs = Number(req.body.timestamp) || Date.now();
    publicDisplayState = {
      ...req.body,
      timestamp: incomingTs,
    };
    // Instantly push to all connected displays across windows, tabs, and external monitors
    const sseMessage = `data: ${JSON.stringify(publicDisplayState)}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.write(sseMessage);
      } catch {
        // ignore
      }
    });
  }
  res.json({ success: true, payload: publicDisplayState });
});

// Official Gate Email Config
const OFFICIAL_EMAIL = process.env.SMTP_USER || 'bps.gate@outlook.com';
const FROM_HEADER =
  process.env.EMAIL_FROM || `Birla Public School Golden Gate <${OFFICIAL_EMAIL}>`;

// Email validation helper
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

// Health & Config Check
app.get('/api/email-config', (req: Request, res: Response) => {
  const isSmtpConfigured = Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim());
  const isResendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());

  res.json({
    officialSender: OFFICIAL_EMAIL,
    fromHeader: FROM_HEADER,
    isLiveConfigured: isSmtpConfigured || isResendConfigured,
    provider: isResendConfigured ? 'Resend API' : 'Outlook / SMTP (smtp-mail.outlook.com)',
  });
});

// Send Digital Pass Email API Endpoint
app.post('/api/send-pass-email', async (req: Request, res: Response) => {
  try {
    const { type, recipientEmail, subject, htmlContent, pdfAttachment } = req.body;

    // Security & Input Validation
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient email address provided.',
      });
    }

    if (!type || (type !== 'STUDENT_PASS' && type !== 'VISITOR_PASS')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pass notification type.',
      });
    }

    if (!subject || typeof subject !== 'string' || !subject.includes('BPS Golden Gate')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subject header for security pass notification.',
      });
    }

    if (!htmlContent || typeof htmlContent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing HTML content payload.',
      });
    }

    // Attachments check
    const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
    if (pdfAttachment && pdfAttachment.base64 && pdfAttachment.filename) {
      attachments.push({
        filename: pdfAttachment.filename,
        content: Buffer.from(pdfAttachment.base64, 'base64'),
        contentType: 'application/pdf',
      });
    }

    // 1. Check for Resend API
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
      try {
        const resendPayload: any = {
          from: FROM_HEADER,
          to: [recipientEmail.trim()],
          subject: subject.trim(),
          html: htmlContent,
        };

        if (pdfAttachment?.base64) {
          resendPayload.attachments = [
            {
              filename: pdfAttachment.filename,
              content: pdfAttachment.base64,
            },
          ];
        }

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          },
          body: JSON.stringify(resendPayload),
        });

        const resendData = await resendRes.json();
        if (!resendRes.ok) {
          throw new Error(resendData.message || 'Resend API error');
        }

        return res.json({
          success: true,
          messageId: resendData.id,
          provider: 'Resend',
          sentTo: recipientEmail.trim(),
        });
      } catch (err: any) {
        console.error('Resend delivery error:', err);
        return res.status(500).json({
          success: false,
          error: `Resend dispatch failed: ${err.message}`,
        });
      }
    }

    // 2. Check for SMTP credentials (e.g. Outlook)
    const smtpHost = process.env.SMTP_HOST || 'smtp-mail.outlook.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || OFFICIAL_EMAIL;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpPass && smtpPass.trim()) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass.trim(),
          },
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false,
          },
        });

        const info = await transporter.sendMail({
          from: FROM_HEADER,
          to: recipientEmail.trim(),
          subject: subject.trim(),
          html: htmlContent,
          attachments,
        });

        return res.json({
          success: true,
          messageId: info.messageId,
          provider: 'SMTP (Outlook)',
          sentTo: recipientEmail.trim(),
        });
      } catch (err: any) {
        console.error('SMTP delivery error:', err);
        return res.status(500).json({
          success: false,
          error: `SMTP dispatch error: ${err.message}`,
        });
      }
    }

    // 3. Fallback / Dev environment when secrets not yet populated
    // Log verified dispatch & return simulated success with clear instruction
    console.log(
      `[BPS GateFlow Email Notification] Dispatching digital pass to: ${recipientEmail.trim()}`
    );
    console.log(`[Subject]: ${subject}`);
    console.log(
      `[Attachment]: ${pdfAttachment?.filename || 'None'} (${attachments.length} attachment)`
    );

    return res.json({
      success: true,
      simulated: true,
      sentTo: recipientEmail.trim(),
      sender: OFFICIAL_EMAIL,
      message:
        'Digital pass verified and email notification queued successfully. (In live production, configure SMTP_PASS in environment for real inbox delivery from bps.gate@outlook.com)',
    });
  } catch (err: any) {
    console.error('Server error handling email dispatch:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error processing email dispatch.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BPS GateFlow Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
