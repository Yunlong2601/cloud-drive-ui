import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('ERROR: Missing email configuration. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER || '',
    pass: GMAIL_APP_PASSWORD || '',
  },
});

app.post('/api/send-decryption-code', async (req, res) => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { email, code, fileName } = req.body;

  if (!email || !code || !fileName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: `CloudVault - Decryption Code for ${fileName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">CloudVault Security</h2>
        <p>A decryption code has been requested for the file:</p>
        <p><strong>${fileName}</strong></p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Your decryption code is:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; margin: 10px 0;">${code}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code is required to download the maximum-security protected file. Do not share this code with anyone you don't trust.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">This email was sent by CloudVault. If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Decryption code sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Email server running on port ${PORT}`);
});
