const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send OTP email — subject and content adapt based on purpose
 * @param {string} email
 * @param {string} otp
 * @param {'login'|'verify'|'reset'} purpose
 */
async function sendOtpEmail(email, otp, purpose = 'login') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n📧 [DEV MODE] OTP for ${email} (${purpose}): ${otp}\n`);
    return { success: true, devMode: true };
  }

  const config = {
    login: { subject: 'Your Collabro Login Code', heading: 'Login Code', desc: 'Use this code to log in to your Collabro account.' },
    verify: { subject: 'Verify your Collabro account', heading: 'Email Verification', desc: 'Use this code to verify your email address.' },
    reset: { subject: 'Reset your Collabro password', heading: 'Password Reset Code', desc: 'Use this code to reset your password. If you did not request this, ignore this email.' },
  };

  const { subject, heading, desc } = config[purpose] || config.login;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Collabro" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px 24px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Collabro</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${heading}</p>
          </div>
          <div style="padding:32px 24px;">
            <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 24px;">
              ${desc} This code expires in <strong style="color:#667eea;">5 minutes</strong>.
            </p>
            <div style="background:rgba(102,126,234,0.1);border:2px dashed #667eea;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#fff;font-family:'Courier New',monospace;">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <p style="color:#64748b;font-size:11px;margin:0;">© ${new Date().getFullYear()} Collabro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${email} [${purpose}] (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    throw error;
  }
}

module.exports = { sendOtpEmail };
