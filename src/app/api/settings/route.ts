import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";
import type { AppSettings } from "@/types";

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }
    
    return NextResponse.json({ settings: data || null });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getAdminClient();
    
    // Ensure we always update the same row if it exists, otherwise create it
    const id = body.id || "1";
    
    // Using upsert to update existing settings or insert if not exists
    const { data, error } = await supabase
      .from("settings")
      .upsert({ 
        ...body, 
        id, 
        updated_at: new Date().toISOString() 
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    
    return NextResponse.json({ settings: data });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings", details: error.message },
      { status: 500 }
    );
  }
}
