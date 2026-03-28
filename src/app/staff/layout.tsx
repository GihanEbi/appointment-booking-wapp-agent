import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/layout/StaffShell";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = user?.user_metadata?.full_name ?? user?.email ?? "";
  return <StaffShell userName={name}>{children}</StaffShell>;
}
