"""SMTP email sender for magic-link auth.

Falls back to no-op if SMTP env vars are not configured (dev mode).
"""

from __future__ import annotations

from email.message import EmailMessage

import aiosmtplib
from loguru import logger

from signsafe.core.config import settings


class EmailService:
    @property
    def is_configured(self) -> bool:
        return settings.has_smtp

    async def send_magic_link(self, to_email: str, token: str) -> bool:
        if not self.is_configured:
            logger.info("SMTP not configured — skipping email send (dev mode)")
            return False

        link = f"{settings.public_app_url}/sync/verify?token={token}"
        msg = EmailMessage()
        msg["From"] = settings.smtp_from
        msg["To"] = to_email
        msg["Subject"] = "Your SignSafe sign-in link"
        msg.set_content(
            f"Click the link below to sign in to SignSafe and sync your lease analyses:\n\n"
            f"{link}\n\n"
            f"This link expires in 15 minutes. If you didn't request this, ignore this email.\n\n"
            f"— SignSafe\n"
            f"Lease forensics for first-time commercial tenants"
        )
        msg.add_alternative(
            f"""
            <html><body style="font-family:Georgia,serif;background:#0A0C10;color:#F4F1EA;padding:32px;">
              <div style="max-width:480px;margin:auto;background:#13161C;padding:32px;border:1px solid #333;">
                <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#888;margin-bottom:8px;">SIGNSAFE · MAGIC LINK</div>
                <h1 style="font-size:32px;font-weight:400;margin:0 0 16px;">Sign in to SignSafe.</h1>
                <p style="color:#A8A296;font-size:14px;line-height:1.6;">Click the button below to verify your email and sync your lease analyses across devices.</p>
                <a href="{link}" style="display:inline-block;background:#D4FF4F;color:#0A0C10;padding:14px 24px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;font-weight:600;margin:24px 0;">VERIFY EMAIL →</a>
                <p style="color:#6B6760;font-size:11px;font-family:monospace;">Link expires in 15 minutes.<br>If you didn't request this, ignore this email.</p>
              </div>
            </body></html>
            """,
            subtype="html",
        )

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_pass,
                start_tls=settings.smtp_use_tls,
                timeout=15,
            )
            logger.info("Magic link email sent to {}", to_email)
            return True
        except Exception as exc:
            logger.error("Failed to send magic link email to {}: {}", to_email, exc)
            return False
