"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BID_STATUSES } from "@/lib/bids/constants";
import type { BidStatus } from "@/types/database";

async function resolveUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { userId: user.id, supabase };
}

/** Premjesti bid u drugu Kanban kolonu + novu poziciju. */
export async function updateBidStatusAction(formData: FormData) {
  const bidId = String(formData.get("bid_id") ?? "");
  const status = formData.get("status") as BidStatus | null;
  const position = Number(formData.get("position") ?? 0);
  if (!bidId || !status) return;
  if (!BID_STATUSES.includes(status)) return;

  const { supabase } = await resolveUser();
  const patch: Record<string, unknown> = { status, kanban_position: position };
  if (status === "submitted") patch.submitted_at = new Date().toISOString();

  await supabase.from("bids").update(patch).eq("id", bidId);
  revalidatePath("/dashboard/ponude");
  revalidatePath("/dashboard/bids");
  revalidatePath(`/dashboard/bids/${bidId}`);
}

/** Ažuriraj iznos ponude i rok iz Kanban kartice ili bid workspacea. */
export async function updateBidFieldsAction(formData: FormData) {
  const bidId = String(formData.get("bid_id") ?? "");
  const bidValueRaw = formData.get("bid_value");
  const submissionDeadline = formData.get("submission_deadline")?.toString() || null;
  if (!bidId) return;

  const patch: Record<string, unknown> = {};
  if (bidValueRaw !== null && bidValueRaw !== "") {
    const val = Number(bidValueRaw);
    if (!Number.isNaN(val)) patch.bid_value = val;
  }
  if (submissionDeadline !== null) {
    patch.submission_deadline = submissionDeadline || null;
  }

  const { supabase } = await resolveUser();
  await supabase.from("bids").update(patch).eq("id", bidId);
  revalidatePath(`/dashboard/bids/${bidId}`);
  revalidatePath("/dashboard/ponude");
}

/** Dodaj komentar na bid. */
export async function addBidCommentAction(formData: FormData) {
  const bidId = String(formData.get("bid_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!bidId || !body) return;

  const { userId, supabase } = await resolveUser();
  const { data: userData } = await supabase.auth.getUser();
  const authorName =
    (userData.user?.user_metadata?.full_name as string | undefined) ??
    userData.user?.email ??
    "Korisnik";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  await anySupabase.from("bid_comments").insert({
    bid_id: bidId,
    user_id: userId,
    author_name: authorName,
    body,
  });

  revalidatePath(`/dashboard/bids/${bidId}`);
}

export async function deleteBidCommentAction(formData: FormData) {
  const commentId = String(formData.get("comment_id") ?? "");
  const bidId = String(formData.get("bid_id") ?? "");
  if (!commentId) return;
  const { supabase } = await resolveUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  await anySupabase.from("bid_comments").delete().eq("id", commentId);
  revalidatePath(`/dashboard/bids/${bidId}`);
}
