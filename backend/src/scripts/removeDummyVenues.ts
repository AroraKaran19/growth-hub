import dotenv from "dotenv";
import mongoose from "mongoose";
import { AddonOrder, Booking, Membership, SeatMap, Venue } from "../models";
import { deleteVenue } from "../services/venueRemoval.service";
import { hasFlag } from "./cliArgs";

dotenv.config();

// One-off cleanup of the old demo catalogue; delete this script once it has run.
const KEEP_SLUG = "growthhub";
const REASON = "Demo venue removed before launch.";

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const apply = hasFlag(process.argv.slice(2), "yes");
  await mongoose.connect(process.env.MONGODB_URI);

  const venues = await Venue.find({ slug: { $ne: KEEP_SLUG } }, { slug: 1, name: 1 }).lean();
  console.log(`${venues.length} venue(s) to delete (keeping "${KEEP_SLUG}"):`);
  for (const venue of venues) {
    const [bookings, memberships, orders] = await Promise.all([
      Booking.countDocuments({ venueId: venue._id, status: { $in: ["upcoming", "checked-in"] } }),
      Membership.countDocuments({ venueId: venue._id, status: { $in: ["active", "past-due"] } }),
      AddonOrder.countDocuments({ venueId: venue._id, status: "paid" }),
    ]);
    console.log(`  ${venue.slug} (${venue.name}): ${bookings} live bookings, ${memberships} live memberships, ${orders} paid add-on orders`);
  }

  const maps = await SeatMap.find({}, { name: 1, venueId: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean();
  const kept = await Venue.findOne({ slug: KEEP_SLUG }, { _id: 1 }).lean();
  const keepMap = maps.find((map) => kept && map.venueId?.equals(kept._id)) ?? maps[0];
  console.log(`${maps.length} seat map(s); keeping ${keepMap ? `"${keepMap.name}"` : "none"}.`);

  if (!apply) {
    console.log("Nothing changed. Members with live items above get the venue-removed email. Run again with --yes to delete.");
    return;
  }

  for (const venue of venues) {
    const result = await deleteVenue(venue.slug, REASON, { id: "system", name: "Growth Hub" });
    console.log(`Deleted ${venue.slug}`, JSON.stringify(result));
  }
  const removed = await SeatMap.deleteMany({ _id: { $ne: keepMap?._id }, venueId: null });
  console.log(`Deleted ${removed.deletedCount} seat map(s). Remaining: ${await SeatMap.countDocuments()}.`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
