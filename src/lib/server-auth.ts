import { createClient } from "@supabase/supabase-js";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export type StaffRole = "admin" | "manager" | "cashier";
export type ApprovalStatus = "approved" | "pending_admin" | "pending_manager" | "rejected";

export type StaffUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  password_hash: string;
  approval_status: ApprovalStatus;
  is_active: boolean;
  created_at: string;
};

let cachedSupabase: any = null;

export function getAdminClient() {
  if (cachedSupabase) return cachedSupabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.");
  }

  cachedSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedSupabase;
}

export function publicUser(user: StaffUserRow) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    approval_status: user.approval_status,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterations, salt, hash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !hash) return false;

  const calculated = pbkdf2Sync(password, salt, Number(iterations), 32, "sha256");
  const stored = Buffer.from(hash, "hex");

  return stored.length === calculated.length && timingSafeEqual(stored, calculated);
}

export async function findApprovedActor(actorId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", actorId)
    .eq("approval_status", "approved")
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as StaffUserRow;
}

export async function writeAuditLog(input: {
  actor?: Pick<StaffUserRow, "id" | "email" | "full_name" | "role"> | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const supabase = getAdminClient();
    await supabase.from("audit_logs").insert({
      actor_id: input.actor?.id || null,
      actor_email: input.actor?.email || null,
      actor_name: input.actor?.full_name || null,
      actor_role: input.actor?.role || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      details: input.details || {},
    });
  } catch (error) {
    console.warn("Audit log write skipped:", error);
  }
}
