const nodemailer = require('nodemailer');

// Store the test account globally so we can reuse it
let testAccount = null;
let transporter = null;

// Create transporter - using Ethereal (fake SMTP for testing)
// Emails can be viewed at https://ethereal.email/
const createTransporter = async () => {
  if (transporter) return transporter;
  
  // Create a test account on Ethereal
  testAccount = await nodemailer.createTestAccount();
  
  console.log('📧 Ethereal Email Account Created:');
  console.log('   User:', testAccount.user);
  console.log('   Pass:', testAccount.pass);
  console.log('   View emails at: https://ethereal.email/');
  
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  
  return transporter;
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email, username, code) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"StreamVault" <${process.env.EMAIL_USER || 'noreply@streamvault.com'}>`,
      to: email,
      subject: '🎬 Verify Your StreamVault Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f23; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">▶️</span>
                      </div>
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Welcome to StreamVault!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi <strong style="color: #ffffff;">${username}</strong>,
                      </p>
                      <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Thank you for signing up! Please verify your email address using the code below:
                      </p>
                      
                      <!-- Verification Code -->
                      <div style="background: rgba(99, 102, 241, 0.2); border: 2px dashed rgba(99, 102, 241, 0.5); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px;">Your Verification Code</p>
                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">
                          ${code}
                        </div>
                        <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0;">This code expires in 10 minutes</p>
                      </div>
                      
                      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
                        If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
                      <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                        © 2025 StreamVault. All rights reserved.<br>
                        This is an automated message, please do not reply.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const emailTransporter = await createTransporter();
    const info = await emailTransporter.sendMail(mailOptions);
    
    // Log the preview URL - THIS IS WHERE YOU CAN VIEW THE EMAIL!
    console.log('📧 Verification Email Sent!');
    console.log('   To:', email);
    console.log('   Code:', code);
    console.log('   🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw - just log and continue
    // In dev mode, we'll still allow registration
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, username) => {
  try {
    const emailTransporter = await createTransporter();
    
    const mailOptions = {
      from: '"StreamVault" <noreply@streamvault.com>',
      to: email,
      subject: '🎉 Welcome to StreamVault!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f23; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px;">Email Verified!</h1>
                      <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Congratulations <strong style="color: #ffffff;">${username}</strong>! Your account is now verified and ready to use.
                      </p>
                      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 15px 30px; border-radius: 12px; display: inline-block;">
                        <span style="color: #ffffff; font-weight: bold; text-decoration: none;">Start Uploading Videos →</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('📧 Welcome Email Sent!');
    console.log('   🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  sendWelcomeEmail
};
