import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Ping the Database to keep Serverless Postgres awake
    const supabase = getAdminClient();
    const { error } = await supabase.from('settings').select('id').limit(1);
    
    if (error) {
      console.warn("Cold start ping warning - DB responded with error:", error);
    }
    
    // 2. Return 200 OK to keep the Next.js lambda warm
    return NextResponse.json({ 
      status: "alive", 
      timestamp: new Date().toISOString(),
      message: "Server and database are warm."
    });
  } catch (error: any) {
    console.error('API Error during ping:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
