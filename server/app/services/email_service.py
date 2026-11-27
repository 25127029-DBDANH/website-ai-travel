"""Transactional password recovery mail for Sài Gòn Guide."""

import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

from app.core.config import settings

logger = logging.getLogger(__name__)


def _deliver(recipient: str, subject: str, text: str, html: str) -> None:
    try:
        message = EmailMessage()
        message["From"] = settings.SMTP_FROM or settings.SMTP_USER
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(text)
        message.add_alternative(html, subtype="html")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception:
        # Provider diagnostics can contain the recipient, credentials or message body.
        logger.warning("Recovery email delivery failed.")


async def send_verification_code(recipient: str, code: str) -> None:
    await asyncio.to_thread(
        _deliver,
        recipient,
        "Sài Gòn Guide · Xác minh email / Verify email",
        f"Mã xác minh của bạn là {code}. Mã có hiệu lực trong 15 phút.\n\n"
        f"Your verification code is {code}. It expires in 15 minutes.",
        f'<p lang="vi">Mã xác minh của bạn là <b>{code}</b>. Mã có hiệu lực trong 15 phút.</p>'
        f'<p lang="en">Your verification code is <b>{code}</b>. It expires in 15 minutes.</p>',
    )


async def send_reset_link(recipient: str, token: str) -> None:
    url = f"{settings.PUBLIC_WEB_URL.rstrip('/')}/reset-password?token={token}"
    href = escape(url, quote=True)
    await asyncio.to_thread(
        _deliver,
        recipient,
        "Sài Gòn Guide · Đặt lại mật khẩu / Reset password",
        f"Đặt lại mật khẩu bằng liên kết sau trong 30 phút.\n{url}\n\n"
        f"Reset your password using this link within 30 minutes.\n{url}",
        f'<p lang="vi"><a href="{href}">Đặt lại mật khẩu</a> trong vòng 30 phút.</p>'
        f'<p lang="en"><a href="{href}">Reset your password</a> within 30 minutes.</p>',
    )
