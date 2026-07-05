import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envío de correos transaccionales con proveedor conmutable por entorno.
 * MAIL_PROVIDER = smtp (por defecto) | resend | sendgrid
 *
 * - smtp:     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 * - resend:   RESEND_API_KEY
 * - sendgrid: SENDGRID_API_KEY
 * Común:      MAIL_FROM (ej. "Cobro Diario <noreply@tudominio.com>")
 *
 * Si no hay proveedor configurado, registra el contenido en logs (no bloquea el flujo).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private get provider(): string {
    return (process.env.MAIL_PROVIDER ?? 'smtp').toLowerCase();
  }
  private get from(): string {
    return process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? 'Cobro Diario <noreply@cobradiario.app>';
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      switch (this.provider) {
        case 'resend':
          await this.sendResend(to, subject, html);
          break;
        case 'sendgrid':
          await this.sendSendgrid(to, subject, html);
          break;
        default:
          await this.sendSmtp(to, subject, html);
      }
    } catch (e) {
      this.logger.error(`[MAIL] Error enviando a ${to}: ${(e as Error).message}`);
      throw e;
    }
  }

  async sendVerification(to: string, fullName: string, link: string): Promise<void> {
    await this.send(to, 'Confirma tu cuenta · Cobro Diario', verificationTemplate(fullName, link));
  }

  /** Invitación a una organización. */
  async sendOrgInvite(to: string, orgName: string, inviterName: string, role: string, link: string): Promise<void> {
    await this.send(to, `Te invitaron a ${orgName} · Cobro Diario`, orgInviteTemplate(orgName, inviterName, role, link));
  }

  // ---- proveedores ----
  private async sendSmtp(to: string, subject: string, html: string): Promise<void> {
    if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
      this.logMissing(to, subject, html);
      return;
    }
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT ?? 465);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
    this.logger.log(`[MAIL:smtp] Enviado a ${to}: ${subject}`);
  }

  private async sendResend(to: string, subject: string, html: string): Promise<void> {
    const key = process.env.RESEND_API_KEY;
    if (!key) return this.logMissing(to, subject, html);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to, subject, html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    this.logger.log(`[MAIL:resend] Enviado a ${to}: ${subject}`);
  }

  private async sendSendgrid(to: string, subject: string, html: string): Promise<void> {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) return this.logMissing(to, subject, html);
    // MAIL_FROM puede venir como "Nombre <correo>"; SendGrid necesita el correo.
    const m = /<([^>]+)>/.exec(this.from);
    const fromEmail = m ? m[1] : this.from;
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid ${res.status}: ${await res.text()}`);
    this.logger.log(`[MAIL:sendgrid] Enviado a ${to}: ${subject}`);
  }

  private logMissing(to: string, subject: string, html: string): void {
    this.logger.warn(`[MAIL] Proveedor "${this.provider}" sin configurar. Correo NO enviado a ${to}. Asunto: ${subject}`);
    this.logger.warn(`[MAIL] Enlace/contenido (pruebas): ${html.replace(/\s+/g, ' ').slice(0, 300)}`);
  }
}

/** Plantilla base (verde Duolingo, responsive, estilos inline). */
function baseTemplate(heading: string, bodyHtml: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(2,6,23,.08);">
      <tr><td style="background:linear-gradient(135deg,#58cc02,#46a302);padding:32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,.2);border-radius:16px;margin-bottom:12px;font-size:28px;">🏦</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Cobro Diario</h1>
      </td></tr>
      <tr><td style="padding:36px;">${heading ? `<h2 style="margin:0 0 12px;font-size:22px;font-weight:800;">${heading}</h2>` : ''}${bodyHtml}</td></tr>
      <tr><td style="padding:20px 36px 32px;border-top:1px solid #f1f5f9;"><p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">© 2026 Cobro Diario · Engynex</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(link: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;"><a href="${link}" style="display:inline-block;background:#58cc02;color:#fff;text-decoration:none;font-weight:800;font-size:16px;padding:15px 34px;border-radius:14px;box-shadow:0 4px 0 #46a302;">${label}</a></div>`;
}

function verificationTemplate(fullName: string, link: string): string {
  const name = (fullName || '').split(' ')[0] || '';
  return baseTemplate(`¡Hola${name ? ', ' + name : ''}! 👋`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Gracias por registrarte. Confirma tu correo para activar tu cuenta y empezar a gestionar tu cartera.</p>
     ${button(link, 'Confirmar mi cuenta')}
     <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Si el botón no funciona, copia este enlace:</p>
     <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#58cc02;">${link}</p>
     <p style="margin:0;font-size:13px;color:#94a3b8;">El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo.</p>`);
}

function orgInviteTemplate(orgName: string, inviterName: string, role: string, link: string): string {
  return baseTemplate(`Te invitaron a ${orgName}`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;"><b>${inviterName}</b> te invitó a unirte a <b>${orgName}</b> como <b>${role}</b> en Cobro Diario.</p>
     ${button(link, 'Aceptar invitación')}
     <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Si el botón no funciona, copia este enlace:</p>
     <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#58cc02;">${link}</p>
     <p style="margin:0;font-size:13px;color:#94a3b8;">Si no esperabas esta invitación, puedes ignorar este correo.</p>`);
}
