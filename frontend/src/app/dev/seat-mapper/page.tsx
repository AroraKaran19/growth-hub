import { notFound } from "next/navigation";
import SeatMapper from "./SeatMapper";

export const metadata = {
  title: "Seat mapper (internal)",
  robots: { index: false, follow: false },
};

export default function SeatMapperRoute() {
  // Internal tooling: mapping venues is billable work, not a public page.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-surface px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <h1 className="text-2xl font-bold text-tertiary">Seat mapper</h1>
        <p className="mt-1 text-sm text-tertiary/60">
          Internal tool. Not available in production builds.
        </p>

        <div className="mt-8">
          <SeatMapper />
        </div>
      </div>
    </div>
  );
}
