const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send OTP verification email with branded HTML template
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 */
async function sendOtpEmail(email, otp) {
  // Dev mode fallback — if SMTP is not configured, log to console
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n📧 [DEV MODE] OTP for ${email}: ${otp}\n`);
    return { success: true, devMode: true };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `"SkillConnect" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your SkillConnect Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
              SkillConnect
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
              Verification Code
            </p>
          </div>

          <!-- Body -->
          <div style="padding:32px 24px;">
            <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hello! Use the following code to verify your email address. This code expires in <strong style="color:#667eea;">5 minutes</strong>.
            </p>
            
            <!-- OTP Code -->
            <div style="background:rgba(102,126,234,0.1);border:2px dashed #667eea;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ffffff;font-family:'Courier New',monospace;">
                ${otp}
              </span>
            </div>

            <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
              If you didn't request this code, you can safely ignore this email. Someone may have entered your email by mistake.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <p style="color:#64748b;font-size:11px;margin:0;">
              © ${new Date().getFullYear()} SkillConnect. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${email} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    throw error;
  }
}

module.exports = { sendOtpEmail };
