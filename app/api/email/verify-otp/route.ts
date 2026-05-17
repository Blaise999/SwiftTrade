import { NextRequest, NextResponse } from "next/server";
import { verifyOTPCode, isEmailConfigured } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// ✅ Vercel/Next route handler hints
export const runtime = "nodejs";
export const maxDuration = 30;

function withTimeout<T>(p: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("OTP_VERIFY_TIMEOUT")), ms)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim();
    const otp = String(body?.otp ?? "").trim();

    // ✅ default type (prevents dumb 400s)
    const type = String(body?.type ?? "email_verification").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP format. Must be 6 digits." },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────
    // DEV / DEMO MODE
    //
    // In development (or when the email service isn't configured), the
    // canonical dev OTP is "000000". Accept it unconditionally so signups
    // don't get stuck waiting for a real email.
    // ───────────────────────────────────────────────────────────────
    const isDev = process.env.NODE_ENV !== "production";
    const forceDevOtp = process.env.DEV_OTP === "1" || isDev;
    const emailMissing = !isEmailConfigured() || !isSupabaseConfigured();

    if (forceDevOtp || emailMissing) {
      if (otp === "000000") {
        console.log(`[verify-otp] dev/demo OK for ${email}`);
        return NextResponse.json({
          success: true,
          message: "Verification successful (dev mode)",
          demo: true,
        });
      }
      // In dev mode, ALSO accept any other 6-digit code so the legacy
      // demo behavior keeps working for screen recordings etc.
      console.log(`[verify-otp] dev/demo accept any 6-digit code for ${email}: ${otp}`);
      return NextResponse.json({
        success: true,
        message: "Verification successful (dev mode)",
        demo: true,
      });
    }

    console.log("[verify-otp] start", { email, type });

    // ✅ more realistic timeout (serverless cold start + DB call)
    const result = await withTimeout(verifyOTPCode(email, otp, type as any), 20000);

    console.log("[verify-otp] done", {
      ms: Date.now() - started,
      success: result?.success,
      err: result?.error,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Verification successful",
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || "Invalid code" },
      { status: 400 }
    );
  } catch (err: any) {
    const msg = err?.message || "Verification failed";

    if (msg === "OTP_VERIFY_TIMEOUT") {
      return NextResponse.json(
        { success: false, error: "Verification timed out. Try again." },
        { status: 504 }
      );
    }

    console.error("[API] Verify OTP error:", err);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
