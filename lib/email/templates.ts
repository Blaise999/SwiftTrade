// Email Templates for Swift Trade
// All templates return HTML strings

interface BaseTemplateProps {
  previewText?: string;
}

// Base email wrapper with Swift Trade branding
const baseTemplate = (content: string, previewText: string = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Swift Trade</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0a0a0f;
      color: #f5f5f0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: linear-gradient(180deg, #1a1a24 0%, #12121a 100%);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 16px;
      padding: 40px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-swift { color: #5b9dff; } .logo-trade { color: #f5f5f0; }
    .logo-tr { color: #d4af37; }
    .logo-ade { color: #f5f5f0; }
    h1 {
      color: #f5f5f0;
      font-size: 24px;
      margin: 0 0 20px 0;
      text-align: center;
    }
    p {
      color: rgba(245, 245, 240, 0.7);
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .otp-box {
      background: rgba(212, 175, 55, 0.1);
      border: 2px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #d4af37;
      font-family: 'Courier New', monospace;
    }
    .otp-expiry {
      color: rgba(245, 245, 240, 0.5);
      font-size: 14px;
      margin-top: 10px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
      color: #0a0a0f !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      text-align: center;
    }
    .button-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #f5f5f0 !important;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .info-box {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: rgba(245, 245, 240, 0.5);
      font-size: 14px;
    }
    .info-value {
      color: #f5f5f0;
      font-weight: 500;
      font-size: 14px;
    }
    .success-badge {
      display: inline-block;
      background: rgba(0, 217, 165, 0.2);
      color: #00d9a5;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .warning-badge {
      display: inline-block;
      background: rgba(255, 107, 107, 0.2);
      color: #ff6b6b;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      padding-top: 30px;
    }
    .footer p {
      color: rgba(245, 245, 240, 0.4);
      font-size: 12px;
      margin: 5px 0;
    }
    .footer a {
      color: #d4af37;
      text-decoration: none;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: rgba(245, 245, 240, 0.5);
      text-decoration: none;
    }
    .highlight {
      color: #d4af37;
      font-weight: 600;
    }
    .amount-large {
      font-size: 32px;
      font-weight: bold;
      color: #00d9a5;
    }
    @media only screen and (max-width: 600px) {
      .container { padding: 20px 10px; }
      .card { padding: 24px; }
      .otp-code { font-size: 28px; letter-spacing: 4px; }
    }
  </style>
</head>
<body>
  <!-- Preview text -->
  <div style="display:none;font-size:1px;color:#0a0a0f;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  
  <div class="container">
    <div class="card">
      <!-- Logo -->
      <div class="logo">
        <span class="logo-swift">Swift</span> <span class="logo-trade">Trade</span>
      </div>
      
      ${content}
      
      <!-- Footer -->
      <div class="divider"></div>
      <div class="footer">
        <div class="social-links">
          <a href="#">Twitter</a>
          <a href="#">Telegram</a>
          <a href="#">Discord</a>
        </div>
        <p>© ${new Date().getFullYear()} Swift Trade. All rights reserved.</p>
        <p>This email was sent to you because you have an account with Swift Trade.</p>
        <p>
          <a href="#">Unsubscribe</a> · 
          <a href="#">Privacy Policy</a> · 
          <a href="#">Terms of Service</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// OTP Verification Email
export interface OTPEmailProps {
  name: string;
  otp: string;
  expiryMinutes?: number;
  action?: string;
}

export const otpEmailTemplate = ({ 
  name, 
  otp, 
  expiryMinutes = 10,
  action = 'verify your email'
}: OTPEmailProps): string => {
  const content = `
    <h1>Verification Code</h1>
    <p>Hi ${name},</p>
    <p>Use the following verification code to ${action}:</p>
    
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">Expires in ${expiryMinutes} minutes</div>
    </div>
    
    <p>If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>
    
    <p style="color: rgba(245, 245, 240, 0.5); font-size: 14px;">
      ⚠️ Never share this code with anyone. Swift Trade staff will never ask for your verification code.
    </p>
  `;
  
  return baseTemplate(content, `Your verification code is ${otp}`);
};

// Welcome Email
export interface WelcomeEmailProps {
  name: string;
  email: string;
}

export const welcomeEmailTemplate = ({ name, email }: WelcomeEmailProps): string => {
  const content = `
    <h1>Welcome to Swift Trade! 🚀</h1>
    <p>Hi ${name},</p>
    <p>Thank you for joining Swift Trade! Your account has been successfully created and you're ready to start trading.</p>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Account Email</span><br>
        <span class="info-value">${email}</span>
      </div>
    </div>
    
    <p>Here's what you can do next:</p>
    <ul style="color: rgba(245, 245, 240, 0.7); padding-left: 20px;">
      <li>Complete your profile and KYC verification</li>
      <li>Deposit funds to start trading</li>
      <li>Explore our trading academy</li>
      <li>Claim your $100 welcome bonus</li>
    </ul>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard" class="button">
        Go to Dashboard →
      </a>
    </div>
    
    <p>If you have any questions, our support team is available 24/7 to help you.</p>
  `;
  
  return baseTemplate(content, `Welcome to Swift Trade, ${name}! Start trading today.`);
};

// Password Reset Email
export interface PasswordResetEmailProps {
  name: string;
  resetLink: string;
  expiryMinutes?: number;
}

export const passwordResetEmailTemplate = ({ 
  name, 
  resetLink, 
  expiryMinutes = 30 
}: PasswordResetEmailProps): string => {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    
    <div class="button-container">
      <a href="${resetLink}" class="button">
        Reset Password
      </a>
    </div>
    
    <p style="color: rgba(245, 245, 240, 0.5); font-size: 14px; text-align: center;">
      This link will expire in ${expiryMinutes} minutes.
    </p>
    
    <div class="divider"></div>
    
    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.</p>
    
    <p style="color: rgba(245, 245, 240, 0.5); font-size: 14px;">
      Can't click the button? Copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #d4af37; word-break: break-all;">${resetLink}</a>
    </p>
  `;
  
  return baseTemplate(content, `Reset your Swift Trade password`);
};

// Password Changed Confirmation
export interface PasswordChangedEmailProps {
  name: string;
  changedAt: string;
  ipAddress?: string;
}

export const passwordChangedEmailTemplate = ({ 
  name, 
  changedAt,
  ipAddress 
}: PasswordChangedEmailProps): string => {
  const content = `
    <h1>Password Changed Successfully</h1>
    <p>Hi ${name},</p>
    <p>Your Swift Trade account password was successfully changed.</p>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Changed At</span><br>
        <span class="info-value">${changedAt}</span>
      </div>
      ${ipAddress ? `
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">IP Address</span><br>
        <span class="info-value">${ipAddress}</span>
      </div>
      ` : ''}
    </div>
    
    <p style="color: #ff6b6b;">
      ⚠️ If you did not make this change, please secure your account immediately by resetting your password and contacting our support team.
    </p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/auth/forgot-password" class="button button-secondary">
        Reset Password
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Your Swift Trade password has been changed`);
};

// Login Alert Email
export interface LoginAlertEmailProps {
  name: string;
  loginTime: string;
  ipAddress: string;
  location?: string;
  device?: string;
}

export const loginAlertEmailTemplate = ({ 
  name, 
  loginTime, 
  ipAddress,
  location,
  device 
}: LoginAlertEmailProps): string => {
  const content = `
    <h1>New Login Detected</h1>
    <p>Hi ${name},</p>
    <p>We detected a new login to your Swift Trade account:</p>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Time</span><br>
        <span class="info-value">${loginTime}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">IP Address</span><br>
        <span class="info-value">${ipAddress}</span>
      </div>
      ${location ? `
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Location</span><br>
        <span class="info-value">${location}</span>
      </div>
      ` : ''}
      ${device ? `
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Device</span><br>
        <span class="info-value">${device}</span>
      </div>
      ` : ''}
    </div>
    
    <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/settings" class="button button-secondary">
        Review Account Security
      </a>
    </div>
  `;
  
  return baseTemplate(content, `New login to your Swift Trade account from ${ipAddress}`);
};

// Deposit Confirmation Email
export interface DepositConfirmEmailProps {
  name: string;
  amount: string;
  currency: string;
  method: string;
  transactionId: string;
  date: string;
}

export const depositConfirmEmailTemplate = ({ 
  name, 
  amount, 
  currency,
  method,
  transactionId,
  date
}: DepositConfirmEmailProps): string => {
  const content = `
    <h1>Deposit Confirmed ✓</h1>
    <p>Hi ${name},</p>
    <p>Great news! Your deposit has been successfully processed.</p>
    
    <div class="otp-box" style="background: rgba(0, 217, 165, 0.1); border-color: rgba(0, 217, 165, 0.3);">
      <div class="amount-large">+${amount} ${currency}</div>
      <span class="success-badge">COMPLETED</span>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Payment Method</span><br>
        <span class="info-value">${method}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Transaction ID</span><br>
        <span class="info-value" style="font-family: monospace;">${transactionId}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Date</span><br>
        <span class="info-value">${date}</span>
      </div>
    </div>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/wallet" class="button">
        View Wallet →
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Your deposit of ${amount} ${currency} has been confirmed`);
};

// Withdrawal Request Email
export interface WithdrawalRequestEmailProps {
  name: string;
  amount: string;
  currency: string;
  method: string;
  destination: string;
  requestId: string;
  date: string;
}

export const withdrawalRequestEmailTemplate = ({ 
  name, 
  amount, 
  currency,
  method,
  destination,
  requestId,
  date
}: WithdrawalRequestEmailProps): string => {
  const content = `
    <h1>Withdrawal Request Received</h1>
    <p>Hi ${name},</p>
    <p>We've received your withdrawal request. It's being processed and you'll receive a confirmation once completed.</p>
    
    <div class="otp-box">
      <div class="amount-large" style="color: #f5f5f0;">-${amount} ${currency}</div>
      <span class="warning-badge">PROCESSING</span>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Withdrawal Method</span><br>
        <span class="info-value">${method}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Destination</span><br>
        <span class="info-value" style="font-family: monospace; word-break: break-all;">${destination}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Request ID</span><br>
        <span class="info-value" style="font-family: monospace;">${requestId}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Estimated Time</span><br>
        <span class="info-value">1-24 hours</span>
      </div>
    </div>
    
    <p style="color: rgba(245, 245, 240, 0.5); font-size: 14px;">
      ⚠️ If you didn't request this withdrawal, please contact support immediately and secure your account.
    </p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/history" class="button button-secondary">
        View Transaction History
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Withdrawal request for ${amount} ${currency} is being processed`);
};

// Airdrop Claimed Email
export interface AirdropClaimedEmailProps {
  name: string;
  tokenAmount: string;
  tokenSymbol: string;
  bnbWon?: boolean;
  bnbAmount?: string;
  txHash: string;
}

export const airdropClaimedEmailTemplate = ({ 
  name, 
  tokenAmount, 
  tokenSymbol,
  bnbWon,
  bnbAmount,
  txHash
}: AirdropClaimedEmailProps): string => {
  const content = `
    <h1>Airdrop Claimed! 🎉</h1>
    <p>Hi ${name},</p>
    <p>Congratulations! You've successfully claimed your airdrop tokens.</p>
    
    <div class="otp-box" style="background: rgba(0, 217, 165, 0.1); border-color: rgba(0, 217, 165, 0.3);">
      <div class="amount-large">+${tokenAmount} ${tokenSymbol}</div>
      <span class="success-badge">CLAIMED</span>
    </div>
    
    ${bnbWon ? `
    <div class="otp-box" style="background: rgba(212, 175, 55, 0.1); border-color: rgba(212, 175, 55, 0.3);">
      <p style="margin: 0 0 10px 0; color: #d4af37;">🏆 LOTTERY WINNER!</p>
      <div class="amount-large" style="color: #d4af37;">+${bnbAmount} BNB</div>
    </div>
    ` : ''}
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Transaction Hash</span><br>
        <span class="info-value" style="font-family: monospace; word-break: break-all;">${txHash}</span>
      </div>
    </div>
    
    <p>Your tokens have been sent to your connected wallet. You can now trade, stake, or hold your ${tokenSymbol} tokens.</p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/invest/staking" class="button">
        Stake Your ${tokenSymbol} →
      </a>
    </div>
  `;
  
  return baseTemplate(content, `You've claimed ${tokenAmount} ${tokenSymbol}${bnbWon ? ` + ${bnbAmount} BNB!` : '!'}`);
};

// KYC Status Email
export interface KYCStatusEmailProps {
  name: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
  level?: string;
}

export const kycStatusEmailTemplate = ({ 
  name, 
  status,
  reason,
  level
}: KYCStatusEmailProps): string => {
  const statusContent = {
    approved: {
      title: 'KYC Verification Approved ✓',
      badge: '<span class="success-badge">VERIFIED</span>',
      message: `Great news! Your identity verification has been approved. You now have full access to all Swift Trade features${level ? ` at ${level} level` : ''}.`,
      buttonText: 'Start Trading →',
      buttonLink: '/dashboard/trade/crypto'
    },
    rejected: {
      title: 'KYC Verification Update',
      badge: '<span class="warning-badge">ACTION REQUIRED</span>',
      message: `Unfortunately, we couldn't verify your identity with the documents provided.${reason ? ` Reason: ${reason}` : ''} Please resubmit your documents.`,
      buttonText: 'Resubmit Documents',
      buttonLink: '/kyc'
    },
    pending: {
      title: 'KYC Verification In Progress',
      badge: '<span style="display: inline-block; background: rgba(99, 102, 241, 0.2); color: #6366f1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">REVIEWING</span>',
      message: 'Your documents are being reviewed by our team. This usually takes 1-2 business days. We\'ll notify you once the verification is complete.',
      buttonText: 'Check Status',
      buttonLink: '/dashboard/settings'
    }
  };
  
  const config = statusContent[status];
  
  const content = `
    <h1>${config.title}</h1>
    <p>Hi ${name},</p>
    
    <div style="text-align: center; margin: 20px 0;">
      ${config.badge}
    </div>
    
    <p>${config.message}</p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}${config.buttonLink}" class="button">
        ${config.buttonText}
      </a>
    </div>
  `;
  
  return baseTemplate(content, `KYC Verification: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
};

// Trade Confirmation Email
export interface TradeConfirmEmailProps {
  name: string;
  type: 'buy' | 'sell';
  asset: string;
  amount: string;
  price: string;
  total: string;
  result?: 'win' | 'loss';
  profit?: string;
  date: string;
}

export const tradeConfirmEmailTemplate = ({ 
  name, 
  type,
  asset,
  amount,
  price,
  total,
  result,
  profit,
  date
}: TradeConfirmEmailProps): string => {
  const content = `
    <h1>Trade Executed ${result === 'win' ? '✓' : result === 'loss' ? '' : ''}</h1>
    <p>Hi ${name},</p>
    <p>Your trade has been executed successfully.</p>
    
    ${result ? `
    <div class="otp-box" style="background: ${result === 'win' ? 'rgba(0, 217, 165, 0.1)' : 'rgba(255, 107, 107, 0.1)'}; border-color: ${result === 'win' ? 'rgba(0, 217, 165, 0.3)' : 'rgba(255, 107, 107, 0.3)'};">
      <div class="amount-large" style="color: ${result === 'win' ? '#00d9a5' : '#ff6b6b'};">
        ${result === 'win' ? '+' : '-'}${profit}
      </div>
      <span class="${result === 'win' ? 'success-badge' : 'warning-badge'}">
        ${result === 'win' ? 'PROFIT' : 'LOSS'}
      </span>
    </div>
    ` : ''}
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Type</span><br>
        <span class="info-value" style="color: ${type === 'buy' ? '#00d9a5' : '#ff6b6b'};">${type.toUpperCase()}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Asset</span><br>
        <span class="info-value">${asset}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Amount</span><br>
        <span class="info-value">${amount}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Price</span><br>
        <span class="info-value">${price}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Date</span><br>
        <span class="info-value">${date}</span>
      </div>
    </div>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/history" class="button button-secondary">
        View Trade History
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Trade executed: ${type.toUpperCase()} ${asset} @ ${price}`);
};

// ============================================
// WITHDRAWAL REJECTION EMAIL
// ============================================

export interface WithdrawalRejectedEmailProps {
  name: string;
  amount: string;
  currency: string;
  method: string;
  destination: string;
  requestId: string;
  rejectionReason: string;
  date: string;
}

export const withdrawalRejectedEmailTemplate = ({
  name,
  amount,
  currency,
  method,
  destination,
  requestId,
  rejectionReason,
  date,
}: WithdrawalRejectedEmailProps): string => {
  const content = `
    <h1>Withdrawal Request Update</h1>
    <p>Hi ${name},</p>
    <p>Unfortunately, your withdrawal request has been declined. Please review the details below.</p>
    
    <div class="otp-box" style="background: rgba(255, 107, 107, 0.1); border-color: rgba(255, 107, 107, 0.3);">
      <div class="amount-large" style="color: #ff6b6b;">-${amount} ${currency}</div>
      <span class="warning-badge">REJECTED</span>
    </div>

    <div class="info-box" style="background: rgba(255, 107, 107, 0.08); border: 1px solid rgba(255, 107, 107, 0.2); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="padding: 8px 0;">
        <span class="info-label" style="color: #ff6b6b; font-weight: 600;">Rejection Reason</span><br>
        <span class="info-value" style="color: #f5f5f0; font-size: 15px; line-height: 1.5;">${rejectionReason}</span>
      </div>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Amount</span><br>
        <span class="info-value">${amount} ${currency}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Method</span><br>
        <span class="info-value">${method}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Destination</span><br>
        <span class="info-value" style="font-family: monospace; word-break: break-all;">${destination}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Request ID</span><br>
        <span class="info-value" style="font-family: monospace;">${requestId}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Date</span><br>
        <span class="info-value">${date}</span>
      </div>
    </div>
    
    <p>Your account balance has not been affected. If you believe this was a mistake or need assistance, please contact our support team.</p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/help" class="button button-secondary">
        Contact Support
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Your withdrawal of ${amount} ${currency} was declined`);
};

// ============================================
// WITHDRAWAL APPROVED EMAIL
// ============================================

export interface WithdrawalApprovedEmailProps {
  name: string;
  amount: string;
  currency: string;
  method: string;
  destination: string;
  requestId: string;
  date: string;
}

export const withdrawalApprovedEmailTemplate = ({
  name,
  amount,
  currency,
  method,
  destination,
  requestId,
  date,
}: WithdrawalApprovedEmailProps): string => {
  const content = `
    <h1>Withdrawal Approved ✓</h1>
    <p>Hi ${name},</p>
    <p>Your withdrawal request has been approved and is being processed.</p>
    
    <div class="otp-box" style="background: rgba(0, 217, 165, 0.1); border-color: rgba(0, 217, 165, 0.3);">
      <div class="amount-large" style="color: #00d9a5;">-${amount} ${currency}</div>
      <span class="success-badge">APPROVED</span>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Withdrawal Method</span><br>
        <span class="info-value">${method}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Destination</span><br>
        <span class="info-value" style="font-family: monospace; word-break: break-all;">${destination}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Request ID</span><br>
        <span class="info-value" style="font-family: monospace;">${requestId}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Date</span><br>
        <span class="info-value">${date}</span>
      </div>
    </div>

    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/history" class="button button-secondary">
        View Transaction History
      </a>
    </div>
  `;

  return baseTemplate(content, `Your withdrawal of ${amount} ${currency} has been approved`);
};

// ============================================
// BOT PURCHASE CONFIRMATION EMAIL
// ============================================

export interface BotPurchaseEmailProps {
  name: string;
  botType: string;
  botName: string;
  activationKey: string;
  features: string[];
  date: string;
}

export const botPurchaseEmailTemplate = ({
  name,
  botType,
  botName,
  activationKey,
  features,
  date,
}: BotPurchaseEmailProps): string => {
  const featureList = features.map(f => `<li style="padding: 4px 0;">${f}</li>`).join('');
  const content = `
    <h1>Trading Bot Activated! 🤖</h1>
    <p>Hi ${name},</p>
    <p>Congratulations! Your <span class="highlight">${botName}</span> trading bot has been successfully activated.</p>
    
    <div class="otp-box" style="background: rgba(212, 175, 55, 0.1); border-color: rgba(212, 175, 55, 0.3);">
      <div style="font-size: 20px; font-weight: bold; color: #d4af37; margin-bottom: 8px;">${botName}</div>
      <span class="success-badge">ACTIVATED</span>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Bot Type</span><br>
        <span class="info-value">${botType.toUpperCase()}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Activation Key</span><br>
        <span class="info-value" style="font-family: monospace; color: #d4af37;">${activationKey}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Activated On</span><br>
        <span class="info-value">${date}</span>
      </div>
    </div>

    <p style="margin-top: 20px;"><strong style="color: #f5f5f0;">Bot Features:</strong></p>
    <ul style="color: rgba(245, 245, 240, 0.7); padding-left: 20px;">
      ${featureList}
    </ul>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/bots" class="button">
        Configure Your Bot →
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Your ${botName} bot is now active!`);
};

// ============================================
// TIER UPGRADE CONFIRMATION EMAIL
// ============================================

export interface TierUpgradeEmailProps {
  name: string;
  tierName: string;
  tierLevel: number;
  pricePaid: string;
  bonusCredit: string;
  features: string[];
  date: string;
}

export const tierUpgradeEmailTemplate = ({
  name,
  tierName,
  tierLevel,
  pricePaid,
  bonusCredit,
  features,
  date,
}: TierUpgradeEmailProps): string => {
  const featureList = features.map(f => `<li style="padding: 4px 0;">${f}</li>`).join('');
  const tierEmojis: Record<number, string> = { 1: '🥉', 2: '🥈', 3: '🥇', 4: '💎' };
  const emoji = tierEmojis[tierLevel] || '🎖️';

  const content = `
    <h1>Tier Upgrade Confirmed! ${emoji}</h1>
    <p>Hi ${name},</p>
    <p>Your account has been upgraded to <span class="highlight">${tierName}</span>. You now have access to premium trading features!</p>
    
    <div class="otp-box" style="background: rgba(212, 175, 55, 0.1); border-color: rgba(212, 175, 55, 0.3);">
      <div style="font-size: 24px; font-weight: bold; color: #d4af37; margin-bottom: 8px;">${tierName}</div>
      <span class="success-badge">ACTIVE</span>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Tier Level</span><br>
        <span class="info-value">Level ${tierLevel}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Amount Paid</span><br>
        <span class="info-value">${pricePaid}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Trading Credit Bonus</span><br>
        <span class="info-value" style="color: #00d9a5;">+${bonusCredit}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Upgrade Date</span><br>
        <span class="info-value">${date}</span>
      </div>
    </div>
    
    <p style="margin-top: 20px;"><strong style="color: #f5f5f0;">Your ${tierName} unlocks:</strong></p>
    <ul style="color: rgba(245, 245, 240, 0.7); padding-left: 20px;">
      ${featureList}
    </ul>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard" class="button">
        Start Trading →
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Welcome to ${tierName}! Your account has been upgraded.`);
};

// ============================================
// INVESTMENT PROGRAM STARTED EMAIL
// ============================================

export interface InvestmentStartedEmailProps {
  name: string;
  planName: string;
  amountInvested: string;
  returnRate: string;
  duration: string;
  profitMode: string;
  startDate: string;
  maturityDate: string;
  projectedReturn: string;
}

export const investmentStartedEmailTemplate = ({
  name,
  planName,
  amountInvested,
  returnRate,
  duration,
  profitMode,
  startDate,
  maturityDate,
  projectedReturn,
}: InvestmentStartedEmailProps): string => {
  const content = `
    <h1>Investment Program Started! 📈</h1>
    <p>Hi ${name},</p>
    <p>Your investment in the <span class="highlight">${planName}</span> program has been confirmed and is now active.</p>
    
    <div class="otp-box" style="background: rgba(0, 217, 165, 0.1); border-color: rgba(0, 217, 165, 0.3);">
      <div class="amount-large">${amountInvested}</div>
      <span class="success-badge">ACTIVE</span>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Plan</span><br>
        <span class="info-value">${planName}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Projected Return Rate</span><br>
        <span class="info-value" style="color: #00d9a5;">${returnRate}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Duration</span><br>
        <span class="info-value">${duration}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Profit Mode</span><br>
        <span class="info-value">${profitMode}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Start Date</span><br>
        <span class="info-value">${startDate}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Maturity Date</span><br>
        <span class="info-value">${maturityDate}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Projected Total Return</span><br>
        <span class="info-value" style="color: #00d9a5; font-size: 18px; font-weight: bold;">${projectedReturn}</span>
      </div>
    </div>
    
    <p>You will receive monthly updates showing your investment progress. Profits are calculated and credited automatically.</p>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/investments" class="button">
        View Investment Dashboard →
      </a>
    </div>
  `;
  
  return baseTemplate(content, `Your ${planName} investment of ${amountInvested} is now active`);
};

// ============================================
// INVESTMENT MONTHLY REPORT EMAIL
// ============================================

export interface InvestmentMonthlyEmailProps {
  name: string;
  planName: string;
  originalInvestment: string;
  currentValue: string;
  monthlyProfit: string;
  totalProfit: string;
  totalReturnPct: string;
  monthNumber: number;
  totalMonths: number;
  maturityDate: string;
  nextCreditDate: string;
}

export const investmentMonthlyEmailTemplate = ({
  name,
  planName,
  originalInvestment,
  currentValue,
  monthlyProfit,
  totalProfit,
  totalReturnPct,
  monthNumber,
  totalMonths,
  maturityDate,
  nextCreditDate,
}: InvestmentMonthlyEmailProps): string => {
  const progressPct = Math.min(100, Math.round((monthNumber / totalMonths) * 100));
  const content = `
    <h1>Monthly Investment Report 📊</h1>
    <p>Hi ${name},</p>
    <p>Here's your monthly update for the <span class="highlight">${planName}</span> investment program.</p>
    
    <div class="otp-box" style="background: rgba(0, 217, 165, 0.1); border-color: rgba(0, 217, 165, 0.3);">
      <div style="font-size: 14px; color: rgba(245,245,240,0.5); margin-bottom: 4px;">Current Value</div>
      <div class="amount-large">${currentValue}</div>
      <div style="margin-top: 8px;">
        <span class="success-badge">+${totalReturnPct} TOTAL RETURN</span>
      </div>
    </div>
    
    <div class="info-box">
      <div style="padding: 8px 0;">
        <span class="info-label">Original Investment</span><br>
        <span class="info-value">${originalInvestment}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">This Month's Profit</span><br>
        <span class="info-value" style="color: #00d9a5; font-weight: bold;">+${monthlyProfit}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Total Profit Earned</span><br>
        <span class="info-value" style="color: #00d9a5;">+${totalProfit}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Progress</span><br>
        <span class="info-value">Month ${monthNumber} of ${totalMonths}</span>
        <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; margin-top: 8px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #d4af37, #00d9a5); height: 100%; width: ${progressPct}%; border-radius: 4px;"></div>
        </div>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Maturity Date</span><br>
        <span class="info-value">${maturityDate}</span>
      </div>
      <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="info-label">Next Profit Credit</span><br>
        <span class="info-value">${nextCreditDate}</span>
      </div>
    </div>
    
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.io'}/dashboard/investments" class="button">
        View Full Details →
      </a>
    </div>
  `;
  
  return baseTemplate(content, `${planName} Report: ${currentValue} (+${totalReturnPct})`);
};
