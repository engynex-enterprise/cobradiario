import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envío de correos transaccionales vía SMTP (nodemailer).
 * Config por entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE.
 * Si no hay SMTP configurado, registra el contenido en logs (no bloquea el flujo).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private get configured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (!this.configured) return null;
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT ?? 465);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    return this.transporter;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const from = process.env.SMTP_FROM ?? 'Cobro Diario <noreply@cobradiario.app>';
    const tx = this.getTransporter();
    if (!tx) {
      this.logger.warn(`[MAIL] SMTP no configurado. Correo NO enviado a ${to}. Asunto: ${subject}`);
      this.logger.warn(`[MAIL] Contenido (para pruebas): ${html.replace(/\s+/g, ' ').slice(0, 300)}`);
      return;
    }
    await tx.sendMail({ from, to, subject, html });
    this.logger.log(`[MAIL] Enviado a ${to}: ${subject}`);
  }

  /** Correo de confirmación de cuenta. */
  async sendVerification(to: string, fullName: string, link: string): Promise<void> {
    await this.send(to, 'Confirma tu cuenta · Cobro Diario', verificationTemplate(fullName, link));
  }
}

/** Plantilla HTML moderna y profesional (verde Duolingo, responsive, estilos inline). */
function verificationTemplate(fullName: string, link: string): string {
  const name = (fullName || '').split(' ')[0] || '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirma tu cuenta</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(2,6,23,.08);">
        <tr><td style="background:linear-gradient(135deg,#58cc02,#46a302);padding:32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,.2);border-radius:16px;margin-bottom:12px;font-size:28px;">🏦</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Cobro Diario</h1>
        </td></tr>
        <tr><td style="padding:36px 36px 8px;">
          <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;">¡Hola${name ? ', ' + name : ''}! 👋</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Gracias por registrarte. Solo falta un paso: confirma tu correo para activar tu cuenta y empezar a gestionar tu cartera.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" style="display:inline-block;background:#58cc02;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:15px 34px;border-radius:14px;box-shadow:0 4px 0 #46a302;">Confirmar mi cuenta</a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;color:#58cc02;">${link}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;">Este enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo.</p>
        </td></tr>
        <tr><td style="padding:24px 36px 32px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">© 2026 Cobro Diario · Engynex</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
