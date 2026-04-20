"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferenceAction } from "@/app/actions/notification-preferences";

interface Props {
  eventKey: string;
  channel: "email" | "in_app";
  checked: boolean;
  icon: React.ReactNode;
  label: string;
}

export function PrefToggle({ eventKey, channel, checked: initialChecked, icon, label }: Props) {
  const [checked, setChecked] = useState(initialChecked);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next); // optimistic
    const fd = new FormData();
    fd.set("event_type", eventKey);
    fd.set("channel", channel);
    if (next) fd.set("enabled", "on");
    startTransition(async () => {
      try {
        await updateNotificationPreferenceAction(fd);
      } catch {
        setChecked(!next); // revert on error
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="flex items-center gap-2 select-none disabled:opacity-60"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
        {icon}
        {label}
      </span>
    </button>
  );
}
