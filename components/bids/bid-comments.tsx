import { addBidCommentAction, deleteBidCommentAction } from "@/app/actions/bids";
import { MessageCircle } from "lucide-react";

export interface BidComment {
  id: string;
  body: string;
  author_name: string | null;
  user_id: string;
  created_at: string;
}

interface Props {
  bidId: string;
  comments: BidComment[];
  currentUserId: string;
}

function fmtDate(v: string): string {
  try {
    return new Intl.DateTimeFormat("bs-BA", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

export function BidComments({ bidId, comments, currentUserId }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="size-5 text-blue-600" />
        <h3 className="text-base font-semibold text-slate-900">Komentari tima</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {comments.length}
        </span>
      </div>

      <ul className="mb-5 space-y-3">
        {comments.length === 0 && (
          <li className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            Još nema komentara. Dodajte prvi.
          </li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{c.author_name ?? "Korisnik"}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">{fmtDate(c.created_at)}</span>
                {c.user_id === currentUserId && (
                  <form action={deleteBidCommentAction}>
                    <input type="hidden" name="comment_id" value={c.id} />
                    <input type="hidden" name="bid_id" value={bidId} />
                    <button
                      type="submit"
                      className="text-[11px] text-rose-600 hover:underline"
                      title="Obriši komentar"
                    >
                      obriši
                    </button>
                  </form>
                )}
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{c.body}</p>
          </li>
        ))}
      </ul>

      <form action={addBidCommentAction} className="space-y-2">
        <input type="hidden" name="bid_id" value={bidId} />
        <textarea
          name="body"
          required
          rows={3}
          maxLength={2000}
          placeholder="Napišite komentar za tim…"
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Pošalji
          </button>
        </div>
      </form>
    </div>
  );
}
