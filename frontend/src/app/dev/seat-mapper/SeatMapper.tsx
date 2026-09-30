"use client";

import { useRef, useState } from "react";
import { Check, Copy, ImageUp, Trash2, Undo2 } from "lucide-react";
import { SEAT_TYPE_LABELS, type Seat, type SeatType } from "@/types/seat";
import { cn } from "@/utils";
import SelectField from "@/app/components/ui/form/SelectField";

const SEAT_TYPE_OPTIONS = (Object.keys(SEAT_TYPE_LABELS) as SeatType[]).map(
  (value) => ({ value, label: SEAT_TYPE_LABELS[value] }),
);

const TYPE_STYLE: Record<SeatType, string> = {
  desk: "border-green-600 bg-green-500/40",
  "private-cabin": "border-blue-600 bg-blue-500/35",
  office: "border-purple-600 bg-purple-500/35",
  "meeting-room": "border-amber-600 bg-amber-500/40",
};

const FIELD =
  "w-full rounded-lg border border-tertiary/15 px-3 py-2 text-sm outline-none focus-visible:border-primary";

type Box = { x: number; y: number; width: number; height: number };

/** Ignore stray clicks; a real chair drag is always bigger than this. */
const MIN_SIZE = 0.6;

const nextFallbackLabel = (seats: Seat[]) => {
  const used = seats
    .map((seat) => Number(seat.label.match(/^seat-(\d+)$/)?.[1]))
    .filter((value) => Number.isFinite(value));

  return `seat-${used.length ? Math.max(...used) + 1 : 1}`;
};

const SeatMapper = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<SeatType>("desk");
  const [draft, setDraft] = useState<Box | null>(null);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");

  const planRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  // The plan stays on this machine; only the seat JSON leaves the page.
  const pickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const toPercent = (event: React.PointerEvent) => {
    const rect = planRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPercent(event);
    originRef.current = point;
    setDraft({ ...point, width: 0, height: 0 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;
    if (!origin) return;

    const point = toPercent(event);
    setDraft({
      x: Math.min(origin.x, point.x),
      y: Math.min(origin.y, point.y),
      width: Math.abs(point.x - origin.x),
      height: Math.abs(point.y - origin.y),
    });
  };

  const handlePointerUp = () => {
    const box = draft;
    originRef.current = null;
    setDraft(null);

    if (!box || box.width < MIN_SIZE || box.height < MIN_SIZE) return;

    const typed = label.trim();

    setSeats((current) => {
      // Fallback numbering counts from the highest used, not the array length,
      // so deleting seats never reuses or skips a number.
      const base = typed || nextFallbackLabel(current);

      const taken = new Set(current.map((seat) => seat.id));
      let id = base;
      let suffix = 2;
      while (taken.has(id)) id = `${base}-${suffix++}`;

      return [
        ...current,
        {
          id,
          label: base,
          type,
          x: Number(box.x.toFixed(2)),
          y: Number(box.y.toFixed(2)),
          width: Number(box.width.toFixed(2)),
          height: Number(box.height.toFixed(2)),
          available: true,
        },
      ];
    });

    // Only advance a label the user actually typed; a generated fallback must
    // never write itself into the field.
    const match = typed.match(/^(.*?)(\d+)$/);
    if (match) setLabel(`${match[1]}${Number(match[2]) + 1}`);
  };

  const renameSeat = (id: string, next: string) =>
    setSeats((current) =>
      current.map((seat) =>
        seat.id === id ? { ...seat, label: next, id: next || seat.id } : seat,
      ),
    );

  const exported = JSON.stringify(seats, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the textarea below is the fallback.
    }
  };

  const importSeats = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) setSeats(parsed);
    } catch {
      // Ignore malformed JSON; the field keeps whatever was typed.
    }
  };

  if (!image) {
    return (
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-tertiary/20 bg-secondary px-6 py-20 text-center transition-colors hover:border-primary/50">
        <span className="flex size-12 items-center justify-center rounded-xl bg-tertiary/5 text-tertiary/60">
          <ImageUp aria-hidden="true" className="size-5" />
        </span>
        <span className="text-base font-semibold text-tertiary">
          Choose a floor plan image
        </span>
        <span className="max-w-sm text-sm text-tertiary/60">
          The image stays on this computer. Map the seats, copy the JSON, then
          run the import script with the same image.
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={pickImage}
          className="sr-only"
        />
      </label>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div
          ref={planRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-tertiary/15 bg-secondary"
        >
          {/* Plain img, not next/image: the mapper measures drags against the
              raw box, and this never ships. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Floor plan"
            className="pointer-events-none w-full"
            draggable={false}
          />

          {seats.map((seat) => (
            <span
              key={seat.id}
              style={{
                left: `${seat.x}%`,
                top: `${seat.y}%`,
                width: `${seat.width}%`,
                height: `${seat.height}%`,
              }}
              className={cn(
                "absolute flex items-center justify-center rounded border-2 text-[9px] font-bold text-tertiary",
                TYPE_STYLE[seat.type],
              )}
            >
              {seat.label}
            </span>
          ))}

          {draft && (
            <span
              style={{
                left: `${draft.x}%`,
                top: `${draft.y}%`,
                width: `${draft.width}%`,
                height: `${draft.height}%`,
              }}
              className="absolute rounded border-2 border-dashed border-primary bg-primary/20"
            />
          )}
        </div>

        <p className="mt-3 text-sm text-tertiary/60">
          Drag a box over each chair. Type a label ending in a number once
          (e.g. <code className="font-semibold">D1</code>) and it increments
          after every box.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-tertiary/15 bg-secondary p-4">
          <h2 className="text-sm font-semibold text-tertiary">Next seat</h2>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-tertiary/60">Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="D1"
              className={FIELD}
            />
          </label>

          <SelectField
            label="Type"
            value={type}
            onChange={(next) => setType(next as SeatType)}
            options={SEAT_TYPE_OPTIONS}
            className="mt-3"
          />

          <p className="mt-3 text-xs text-tertiary/50">
            Pricing and availability are set in the admin panel, not here.
          </p>

          <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary">
            <ImageUp aria-hidden="true" className="size-3.5" />
            Use a different plan image
            <input
              type="file"
              accept="image/*"
              onChange={pickImage}
              className="sr-only"
            />
          </label>
        </div>

        <div className="rounded-xl border border-tertiary/15 bg-secondary p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tertiary">
              Mapped ({seats.length})
            </h2>
            <button
              type="button"
              onClick={() => setSeats((current) => current.slice(0, -1))}
              disabled={seats.length === 0}
              className="inline-flex items-center gap-1 text-xs text-tertiary/60 hover:text-tertiary disabled:opacity-40"
            >
              <Undo2 className="size-3.5" />
              Undo
            </button>
          </div>

          <ul className="mt-3 flex max-h-60 flex-col gap-1 overflow-y-auto">
            {seats.map((seat) => (
              <li
                key={seat.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-tertiary/5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    value={seat.label}
                    onChange={(event) => renameSeat(seat.id, event.target.value)}
                    aria-label={`Rename ${seat.label}`}
                    className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-tertiary/20 focus-visible:border-primary focus-visible:outline-none"
                  />
                  <span className="shrink-0 text-xs text-tertiary/45">
                    {seat.width.toFixed(1)} x {seat.height.toFixed(1)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSeats((current) =>
                      current.filter((item) => item.id !== seat.id),
                    )
                  }
                  aria-label={`Remove ${seat.label}`}
                  className="shrink-0 text-tertiary/40 hover:text-primary"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-tertiary/15 bg-secondary p-4">
          <button
            type="button"
            onClick={copy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-secondary"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>

          <textarea
            readOnly
            value={exported}
            className="mt-3 h-32 w-full rounded-lg border border-tertiary/15 p-2 font-mono text-[11px]"
          />

          <h3 className="mt-4 text-xs font-semibold text-tertiary">
            Load existing
          </h3>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Paste a seats array to keep editing it"
            className="mt-1 h-20 w-full rounded-lg border border-tertiary/15 p-2 font-mono text-[11px]"
          />
          <button
            type="button"
            onClick={importSeats}
            className="mt-2 w-full rounded-lg border border-tertiary/20 px-4 py-2 text-sm text-tertiary"
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatMapper;
