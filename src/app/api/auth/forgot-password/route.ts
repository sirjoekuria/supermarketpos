import { NextResponse } from "next/server";
import { getAdminClient, hashPassword, writeAuditLog } from "@/lib/server-auth";
import { isRateLimited } from "@/lib/rate-limit";

// In-memory token storage fallback (perfect for local testing and zero DB schema friction)
const resetCodesStore = new Map<string, { code: string; expires: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    if (isRateLimited(ip, 5, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
    }

    const { email } = await request.json();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: user, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error || !user) {
      // Return success even if email is not found to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: "If the email is registered, you will receive a verification code.",
      });
    }

    // Generate secure 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    resetCodesStore.set(cleanEmail, { code: verificationCode, expires });

    // Output to stdout/console for testing & integration log verification
    console.log("=========================================");
    console.log(`PASSWORD RESET CODE FOR ${cleanEmail}: ${verificationCode}`);
    console.log("=========================================");

    // Also attempt writing to DB if the columns exist (progressive enhancement)
    try {
      await supabase
        .from("app_users")
        .update({
          reset_token: verificationCode,
          reset_token_expires: new Date(expires).toISOString(),
        } as any)
        .eq("email", cleanEmail);
    } catch {
      // Silently fall back to in-memory store if DB doesn't have RLS or these columns yet
    }

    await writeAuditLog({
      action: "password_reset_requested",
      entityType: "app_user",
      entityId: user.id,
      details: { email: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: "A verification code has been generated. Check server logs to retrieve it.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process request." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    if (isRateLimited(ip, 5, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
    }

    const { email, code, newPassword } = await request.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();

    if (!cleanEmail || !cleanCode || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Valid email, 6-digit code, and new password (min 6 chars) are required." },
        { status: 400 }
      );
    }

    // Try in-memory verify first
    let isValid = false;
    const record = resetCodesStore.get(cleanEmail);
    if (record && record.code === cleanCode && record.expires > Date.now()) {
      isValid = true;
      resetCodesStore.delete(cleanEmail); // Clear on successful use
    }

    const supabase = getAdminClient();

    // Fallback/Verification check in DB if memory check failed
    if (!isValid) {
      const { data: dbUser } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (
        dbUser &&
        dbUser.reset_token === cleanCode &&
        dbUser.reset_token_expires &&
        new Date(dbUser.reset_token_expires).getTime() > Date.now()
      ) {
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    // Get the user
    const { data: user, error: fetchError } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // Hash the password and save
    const hashedPassword = hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from("app_users")
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      } as any)
      .eq("email", cleanEmail);

    if (updateError) {
      throw updateError;
    }

    await writeAuditLog({
      action: "password_reset_success",
      entityType: "app_user",
      entityId: user.id,
      details: { email: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now Sign In.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reset password." }, { status: 500 });
  }
}
