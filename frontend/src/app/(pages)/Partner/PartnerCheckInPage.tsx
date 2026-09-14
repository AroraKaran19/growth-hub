"use client";

import { useState, type FormEvent } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
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
import { verifyScan, type ScanOutcome } from "./verify";

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

  if (!desk.isReady) return <PartnerSkeleton />;

  const verify = (raw: string) =>
    setOutcome(
      verifyScan(raw, {
        today: desk.today,
        venueName: desk.venue.name,
        bookings: desk.bookings,
        members: desk.members,
        checkIns: desk.checkIns,
        allMemberBookings: desk.allMemberBookings,
        allMemberships: desk.allMemberships,
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

  const handleCheckIn = () => {
    if (!outcome?.checkInId) return;
    const name = outcome.booking?.memberName ?? outcome.member?.memberName ?? "Member";
    desk.checkIn(outcome.checkInId);
    setOutcome({
      tone: "success",
      title: "Checked in",
      detail: `${name} is in. Show them to ${
        outcome.booking?.seats.join(", ") ?? outcome.member?.seats.join(", ")
      }.`,
    });
    setCode("");
  };

  const recent = Object.entries(desk.checkIns)
    .map(([id, time]) => {
      const booking = desk.bookings.find((item) => item.bookingId === id);
      const member = desk.members.find((item) => item.membershipId === id);
      return {
        id,
        time,
        name: booking?.memberName ?? member?.memberName ?? id,
        detail: booking
          ? `${booking.type} ${booking.seats.join(", ")}`
          : member
            ? `Member, ${member.workspace} ${member.seats.join(", ")}`
            : "",
      };
    })
    .sort((a, b) => b.time.localeCompare(a.time));

  const tone = outcome ? TONES[outcome.tone] : null;
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
                placeholder="e.g. 091822000102"
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
              Member passes start with m-, for example m-11.
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
              {outcome.checkInId && (
                <button type="button" onClick={handleCheckIn} className={cn(CHECK_IN_BUTTON, "mt-4 w-full py-2.5")}>
                  Check in
                </button>
              )}
            </div>
          )}
        </section>

        <section className={`${PARTNER_CARD} h-fit p-5`}>
          <h2 className="text-base font-bold text-tertiary">Checked in today</h2>
          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface px-4 py-6 text-center text-sm text-tertiary/60">
              Nobody checked in from this desk yet today.
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
