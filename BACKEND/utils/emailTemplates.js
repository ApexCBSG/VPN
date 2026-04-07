/**
 * Sentinel VPN - Branded Email Templates
 * Matches the app's dark theme (background: #060e20, primary: #81ecff)
 */

const baseLayout = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background-color: #040a18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #060e20; border-radius: 20px; border: 1px solid rgba(129, 236, 255, 0.08); overflow: hidden; }
    .card-header { background: linear-gradient(135deg, #081525, #0c1d35); padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(129, 236, 255, 0.06); }
    .logo-circle { display: inline-block; width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #81ecff, #00e3fd); line-height: 56px; text-align: center; margin-bottom: 16px; }
    .logo-circle svg, .logo-circle img { vertical-align: middle; }
    .brand-name { font-size: 14px; font-weight: 900; color: #81ecff; letter-spacing: 4px; margin: 0; }
    .brand-tagline { font-size: 10px; color: #6d758c; letter-spacing: 2px; margin-top: 4px; }
    .card-body { padding: 32px; }
    .heading { font-size: 22px; font-weight: 800; color: #dee5ff; margin: 0 0 12px; }
    .text { font-size: 14px; line-height: 1.7; color: #a3aac4; margin: 0 0 20px; }
    .code-box { background-color: #0c1a30; border: 1px solid rgba(129, 236, 255, 0.12); border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
    .code-value { font-size: 36px; font-weight: 900; color: #81ecff; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .code-label { font-size: 10px; color: #6d758c; letter-spacing: 2px; margin-top: 8px; font-weight: 700; }
    .token-box { background-color: #0c1a30; border: 1px solid rgba(129, 236, 255, 0.12); border-radius: 14px; padding: 16px 20px; margin: 24px 0; word-break: break-all; }
    .token-value { font-size: 13px; font-weight: 600; color: #81ecff; font-family: 'Courier New', monospace; line-height: 1.6; }
    .token-label { font-size: 10px; color: #6d758c; letter-spacing: 2px; margin-bottom: 8px; font-weight: 700; display: block; }
    .info-row { display: flex; align-items: center; background-color: rgba(129, 236, 255, 0.04); border-radius: 10px; padding: 12px 16px; margin: 8px 0; }
    .info-icon { color: #81ecff; margin-right: 12px; font-size: 16px; }
    .info-text { font-size: 12px; color: #a3aac4; }
    .divider { height: 1px; background: rgba(129, 236, 255, 0.06); margin: 24px 0; }
    .card-footer { padding: 20px 32px 28px; text-align: center; border-top: 1px solid rgba(129, 236, 255, 0.04); }
    .footer-text { font-size: 11px; color: #6d758c; margin: 0; line-height: 1.6; }
    .footer-brand { font-size: 9px; color: #4a5068; letter-spacing: 2px; margin-top: 12px; font-weight: 700; }
    .warn-text { font-size: 12px; color: #ff716c; background: rgba(255, 113, 108, 0.06); border-radius: 8px; padding: 10px 14px; margin-top: 16px; }
    .highlight { color: #81ecff; font-weight: 700; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="card-header">
        <div class="logo-circle">
          <span style="font-size: 24px; font-weight: 900; color: #060e20;">S</span>
        </div>
        <p class="brand-name">SENTINEL</p>
        <p class="brand-tagline">SECURE TUNNEL NETWORK</p>
      </div>
      <div class="card-body">
        ${content}
      </div>
      <div class="card-footer">
        <p class="footer-text">
          This is an automated message from Sentinel's Veil.<br />
          Please do not reply to this email.
        </p>
        <p class="footer-brand">SENTINEL SECURE ACCESS</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Email verification template (registration)
 */
exports.verificationEmail = (code) => ({
  subject: 'Verify Your Sentinel Account',
  text: `Welcome to Sentinel! Your verification code is: ${code}. It expires in 10 minutes.`,
  html: baseLayout(`
    <h1 class="heading">Verify Your Identity</h1>
    <p class="text">
      Welcome to <span class="highlight">Sentinel</span>. To activate your secure VPN access, enter the verification code below in the app.
    </p>
    <div class="code-box">
      <div class="code-value">${code}</div>
      <div class="code-label">VERIFICATION CODE</div>
    </div>
    <p class="text" style="font-size: 12px;">
      This code is valid for <span class="highlight">10 minutes</span>. If you did not create a Sentinel account, you can safely ignore this email.
    </p>
    <div class="warn-text">
      Never share this code with anyone. Sentinel staff will never ask for your verification code.
    </div>
  `)
});

/**
 * Password reset template
 */
exports.passwordResetEmail = (resetToken) => ({
  subject: 'Sentinel - Password Reset Request',
  text: `You requested a password reset. Your reset token is: ${resetToken}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
  html: baseLayout(`
    <h1 class="heading">Password Reset</h1>
    <p class="text">
      We received a request to reset the password for your <span class="highlight">Sentinel</span> account. Copy the token below and paste it in the app to set a new password.
    </p>
    <div class="token-box">
      <span class="token-label">RESET TOKEN</span>
      <div class="token-value">${resetToken}</div>
    </div>
    <p class="text" style="font-size: 12px;">
      This token is valid for <span class="highlight">10 minutes</span>. After that, you will need to request a new one.
    </p>
    <div class="divider"></div>
    <p class="text" style="font-size: 12px; margin-bottom: 0;">
      If you did not request a password reset, your account is still secure. No changes have been made.
    </p>
    <div class="warn-text">
      Never share this token with anyone. Sentinel staff will never ask for your reset token.
    </div>
  `)
});

/**
 * Welcome email (post-verification)
 */
exports.welcomeEmail = (name) => ({
  subject: 'Welcome to Sentinel - Your Secure Access is Ready',
  text: `Welcome to Sentinel, ${name}! Your account is now verified and ready. Download the app to get started with secure VPN access.`,
  html: baseLayout(`
    <h1 class="heading">Welcome to Sentinel</h1>
    <p class="text">
      Hi <span class="highlight">${name}</span>, your account has been verified and your secure access is now active.
    </p>
    <div class="divider"></div>
    <p class="text" style="font-size: 13px; font-weight: 600; color: #dee5ff;">Getting Started:</p>
    <div style="background-color: rgba(129, 236, 255, 0.04); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <p class="text" style="margin-bottom: 8px; font-size: 13px;">
        <span class="highlight">1.</span> Open the Sentinel app and sign in
      </p>
      <p class="text" style="margin-bottom: 8px; font-size: 13px;">
        <span class="highlight">2.</span> Select a server region from the global network
      </p>
      <p class="text" style="margin-bottom: 0; font-size: 13px;">
        <span class="highlight">3.</span> Tap the power button to establish your secure tunnel
      </p>
    </div>
    <p class="text" style="font-size: 12px; margin-bottom: 0;">
      Your traffic is encrypted with <span class="highlight">AES-256</span> through the WireGuard protocol. Stay safe out there.
    </p>
  `)
});

/**
 * Password changed confirmation
 */
exports.passwordChangedEmail = () => ({
  subject: 'Sentinel - Password Changed Successfully',
  text: 'Your Sentinel account password has been changed. If you did not make this change, please contact support immediately.',
  html: baseLayout(`
    <h1 class="heading">Password Updated</h1>
    <p class="text">
      Your <span class="highlight">Sentinel</span> account password has been successfully changed.
    </p>
    <div class="divider"></div>
    <p class="text" style="font-size: 12px; margin-bottom: 0;">
      If you did not make this change, please reset your password immediately or contact support.
    </p>
    <div class="warn-text">
      If this wasn't you, your account may be compromised. Reset your password immediately.
    </div>
  `)
});
