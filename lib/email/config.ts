import "server-only";

import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const emailConfig = {
  from: process.env.EMAIL_FROM || 'Swift Trade <noreply@swifttrade.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@swifttrade.com',
  
  subjects: {
    otp: 'Your Swift Trade Verification Code',
    welcome: 'Welcome to Swift Trade! 🚀',
    passwordReset: 'Reset Your Swift Trade Password',
    passwordChanged: 'Your Password Has Been Changed',
    loginAlert: 'New Login to Your Swift Trade Account',
    depositConfirm: 'Deposit Confirmed ✓',
    withdrawalConfirm: 'Withdrawal Request Received',
    withdrawalApproved: 'Withdrawal Approved ✓',
    withdrawalRejected: 'Withdrawal Request Update',
    tradeConfirm: 'Trade Executed Successfully',
    kycApproved: 'KYC Verification Approved ✓',
    kycRejected: 'KYC Verification Update',
    airdropClaimed: 'Airdrop Claimed Successfully! 🎉',
    botPurchase: 'Trading Bot Activated! 🤖',
    tierUpgrade: 'Tier Upgrade Confirmed! 🎖️',
    investmentStarted: 'Investment Program Started! 📈',
    investmentMonthly: 'Your Monthly Investment Report 📊',
  },
};

export const isEmailConfigured = (): boolean => {
  return !!process.env.RESEND_API_KEY;
};
