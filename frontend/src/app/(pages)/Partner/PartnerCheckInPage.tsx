"use client";

import { useState, type FormEvent } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { usePartnerDesk } from "@/stores/partner";
import { cn } from "@/utils";
import {
  CHECK_IN_BUTTON,
  PARTNER_CARD,
  PartnerPageHeader,
  PartnerSkeleton,
} from "./components/PartnerUi";
import QrScanner from "./components/QrScanner";
import SeatCheckIns from "./components/SeatCheckIns";
import { readApiError } from "@/libs/api/errors";
import { outcomeOfCheckIn, outcomeOfError, verifyScan, type ScanOutcome } from "./verify";
import type { CheckInInput } from "@/types/partner";

const TONES: Record<
  ScanOutcome["tone"],
  { icon: LucideIcon; box: string; icon_color: string }
> = {
  success: {
    icon: CircleCheck,
    box: "border-green-600/30 bg-green-500/8",
    icon_color: "text-green-700",
  },
  warning: {
    icon: CircleAlert,
    box: "border-amber-500/40 bg-amber-500/8",
    icon_color: "text-amber-700",
  },
  error: {
    icon: CircleX,
    box: "border-primary/30 bg-primary/5",
    icon_color: "text-primary",
  },
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const PartnerCheckInPage = () => {
  const desk = usePartnerDesk();
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  if (!desk.isReady) return <PartnerSkeleton />;

  const verify = (raw: string) =>
    setOutcome(
      verifyScan(raw, {
        today: desk.today,
        venueName: desk.venue.name,
        bookings: desk.bookings,
        members: desk.members,
        checkIns: desk.checkIns,
      }),
    );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setOutcome({
        tone: "error",
        title: "Nothing to check",
        detail: "Scan a QR code or type a booking ID first.",
      });
      return;
    }
    verify(code);
  };

  // The server verifies the signed code and the time window; the preview above is only a guide.
  const handleCheckIn = async (seatId?: string) => {
    if (!outcome?.send) return;
    const base = outcome.send;
    const send: CheckInInput = seatId && !("bookingRef" in base) ? { ...base, seatId } : base;
    setIsChecking(true);
    try {
      const result = await desk.checkIn(send);
      const done = outcomeOfCheckIn(result);
      const choices = outcome.seatChoices?.map((seat) =>
        seat.seatId === result.seat?.id ? { ...seat, checkedInAt: seat.checkedInAt ?? result.checkedInAt } : seat,
      );
      // Leave the other seats on screen so the next holder can be checked in straight away.
      setOutcome(choices?.some((seat) => !seat.checkedInAt) ? { ...done, send: base, seatChoices: choices, member: outcome.member } : done);
      setCode("");
    } catch (caught) {
      const info = readApiError(caught);
      const refused = outcomeOfError(info.code, info.message, info.meta);
      // Keep the pass so the desk can retry with the seat it picks.
      setOutcome(refused.seatChoices?.length ? { ...refused, send: base, member: outcome.member } : refused);
    } finally {
      setIsChecking(false);
    }
  };

  const bookingEntries = desk.bookings.flatMap((booking) => {
    const time = desk.checkIns[booking.bookingId];
    return time
      ? [{ id: booking.bookingId, time, name: booking.memberName, detail: `${booking.type} ${booking.seats.join(", ")}` }]
      : [];
  });
  // Multi-seat plans list each holder who came in.
  const memberEntries = desk.todayMembers.flatMap((member) =>
    (member.today?.seats ?? []).flatMap((seat) =>
      seat.checkedInAt
        ? [
            {
              id: `${member.membershipId}:${seat.seatId}`,
              time: seat.checkedInAt,
              name: member.seatList.length > 1 && seat.holder ? seat.holder : member.memberName,
              detail: `${member.plan}, ${seat.label}`,
            },
          ]
        : [],
    ),
  );
  const recent = [...bookingEntries, ...memberEntries].sort((a, b) => b.time.localeCompare(a.time));

  const tone = outcome ? TONES[outcome.tone] : null;
  const outcomeRef = outcome?.ref ?? outcome?.booking?.bookingId ?? outcome?.member?.membershipId;
  const outcomeAddons = outcomeRef ? (desk.addonsByTarget[outcomeRef] ?? []) : [];
  const ToneIcon = tone?.icon;

  return (
    <>
      <PartnerPageHeader
        title="Check-in"
        description="Scan a booking QR or member pass, or type the booking ID."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className={`${PARTNER_CARD} p-5 sm:p-8`}>
          <QrScanner
            onDetect={(value) => {
              setCode(value);
              verify(value);
            }}
          />

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto mt-8 flex max-w-sm flex-col gap-2 border-t border-tertiary/10 pt-6"
          >
            <label htmlFor="check-in-code" className="text-sm font-medium text-tertiary">
              Or enter a booking ID
            </label>
            <div className="flex gap-2">
              <input
                id="check-in-code"
                name="code"
                autoComplete="off"
                inputMode="text"
                placeholder="e.g. GH-0004521"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="min-w-0 grow rounded-lg border border-tertiary/20 bg-secondary px-3.5 py-2.5 font-mono text-sm text-tertiary outline-none transition-colors placeholder:font-sans placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              <button
                type="submit"
                className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
              >
                Verify
              </button>
            </div>
            <p className="text-xs text-tertiary/50">
              Member passes start with GH-M-, for example GH-M-0004521.
            </p>
          </form>

          {outcome && tone && ToneIcon && (
            <div
              role={outcome.tone === "error" ? "alert" : "status"}
              className={cn("mx-auto mt-6 max-w-sm rounded-xl border p-4", tone.box)}
            >
              <div className="flex items-start gap-3">
                <ToneIcon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", tone.icon_color)} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-tertiary">{outcome.title}</p>
                  <p className="mt-0.5 text-sm text-tertiary/70">{outcome.detail}</p>
                </div>
              </div>
              {outcomeAddons.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-tertiary/10 pt-3">
                  <PackageCheck aria-hidden="true" className="size-4 text-tertiary/55" />
                  <span className="text-xs font-medium text-tertiary/70">Add-ons today:</span>
                  {outcomeAddons.map((addon, index) => (
                    <span key={`${addon.orderRef}-${index}`} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-tertiary shadow-sm">
                      {addon.name}
                      {addon.quantity > 1 ? ` x ${addon.quantity}` : ""}
                    </span>
                  ))}
                </div>
              )}
              {outcome.send && outcome.seatChoices && outcome.seatChoices.length > 0 ? (
                <div className="mt-4 border-t border-tertiary/10 pt-3">
                  <p className="mb-2 text-xs font-medium text-tertiary/65">Whose seat is checking in?</p>
                  <SeatCheckIns
                    variant="picker"
                    seats={outcome.seatChoices}
                    memberName={outcome.member?.memberName ?? "this member"}
                    disabled={isChecking}
                    onCheckIn={handleCheckIn}
                  />
                </div>
              ) : outcome.send && (
                <button
                  type="button"
                  onClick={() => void handleCheckIn()}
                  disabled={isChecking}
                  className={cn(CHECK_IN_BUTTON, "mt-4 w-full py-2.5 disabled:opacity-60")}
                >
                  {isChecking ? "Checking in..." : "Check in"}
                </button>
              )}
            </div>
          )}
        </section>

        <section className={`${PARTNER_CARD} h-fit p-5`}>
          <h2 className="text-base font-bold text-tertiary">Checked in today</h2>
          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-tertiary/60">
              Nobody has checked in yet today.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-tertiary/8">
              {recent.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tertiary">{entry.name}</p>
                    <p className="truncate text-xs text-tertiary/55">{entry.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-tertiary/60">{formatTime(entry.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};

export default PartnerCheckInPage;
