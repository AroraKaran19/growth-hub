import { Store } from "lucide-react";
import type { VenueRemovalNotice } from "@/types/cancellation";
import { cn } from "@/utils";
import { rupees } from "../../Booking/checkoutState";

/** Why a booking or plan was cancelled when its venue closed, and where the member's refund stands. */
const VenueRemovedNotice = ({ notice, className }: { notice: VenueRemovalNotice; className?: string }) => (
  <p className={cn("flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900", className)}>
    <Store aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
    <span>
      Cancelled because the venue closed: {notice.reason}{" "}
      {notice.status === "refunded"
        ? `Growth Hub refunded ${rupees(notice.amount ?? 0)} to you.`
        : notice.amount === null
          ? "Growth Hub will confirm your refund shortly."
          : `Growth Hub will refund ${rupees(notice.amount)} to you.`}
    </span>
  </p>
);

export default VenueRemovedNotice;
