const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

const sendMail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[Mail Simulation] To: ${to} | Subject: ${subject}`);
      return { messageId: 'simulated-mail-' + Date.now() };
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"রক্তবার্তা" <noreply@roktobarta.com>',
      to,
      subject,
      text: text || '',
      html: html || ''
    });

    console.log(`[Mail Sent] Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Mail Error] ${error.message}`);
    // Return null instead of throwing so email failure does not crash the user flow
    return null;
  }
};

module.exports = { transporter, sendMail };
