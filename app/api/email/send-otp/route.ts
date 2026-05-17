import { NextRequest, NextResponse } from "next/server";
import { sendOTPEmail, isEmailConfigured } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

console.log("VERCEL_ENV:", process.env.VERCEL_ENV);
console.log("HAS OTP_PEPPER:", !!process.env.OTP_PEPPER);


const ALLOWED_OTP_TYPES = new Set([
  "email_verification",
  "password_reset",
  "login",
  "withdrawal",
  "2fa",
]);

function coerceType(input: any) {
  const t = typeof input === "string" ? input.trim() : "";
  return t || "email_verification";
}

function normalizeEmail(input: any) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  const requestId = `sendotp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const email = normalizeEmail(body?.email);
    const name =
      typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "User";
    const type = coerceType(body?.type);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required", requestId },
        { status: 400 }
      );
    }

    if (!ALLOWED_OTP_TYPES.has(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid OTP type: ${type}`, requestId },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────
    // DEV / DEMO MODE
    //
    // Any time we don't have a working email provider (no RESEND_API_KEY
    // or no EMAIL_FROM, or we're in NODE_ENV=development without explicit
    // production-OTP opt-in), the OTP code is FROZEN to "000000".
    //
    // This unblocks local development: no real email is sent, and the user
    // can just type 000000 in the verify-otp page. It also matches what
    // verify-otp/route.ts now accepts.
    // ───────────────────────────────────────────────────────────────
    const isDev = process.env.NODE_ENV !== "production";
    const forceDevOtp = process.env.DEV_OTP === "1" || isDev;
    const emailMissing =
      !process.env.RESEND_API_KEY ||
      !process.env.EMAIL_FROM ||
      !isEmailConfigured();

    if (forceDevOtp || emailMissing) {
      console.log(
        `[API] send-otp dev/demo mode → ${email} (code is 000000)`,
        { requestId, isDev, emailMissing }
      );
      return NextResponse.json({
        success: true,
        message: "OTP sent (dev mode — use 000000)",
        demo: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        requestId,
      });
    }

    let result: any;
    try {
      result = await sendOTPEmail(email, name, type as any);
    } catch (e: any) {
      console.error("[API] sendOTPEmail threw:", e?.message || e, { requestId });
      return NextResponse.json(
        { success: false, error: e?.message || "sendOTPEmail_crashed", requestId },
        { status: 502 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || "Failed to send OTP", requestId },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent",
      messageId: result.messageId,
      expiresAt: result.expiresAt?.toISOString?.() ?? result.expiresAt,
      requestId,
    });
  } catch (err: any) {
    console.error("[API] Send OTP error:", err?.message || err, { requestId });
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to send OTP", requestId },
      { status: 500 }
    );
  }
}
