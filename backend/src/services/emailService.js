const nodemailer = require("nodemailer");

/**
 * Sends a verification code email to the authority.
 */
async function sendVerificationEmail(email, code) {
  // If SMTP is not configured, we log the code for development.
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n--- [DEBUG] Email Verification Code for ${email}: ${code} ---\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Jan Awaaj" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Jan Awaaj - Verify your Authority Account",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 500px;">
        <h2 style="color: #0f766e;">Verify your Identity</h2>
        <p>Hello,</p>
        <p>You are registering for a Jan Awaaj Authority account. Please use the following 6-digit code to verify your email address:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; padding: 20px; text-align: center; background-color: #f8fafc; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };
