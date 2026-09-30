import dotenv from "dotenv";
import { readFileSync, statSync } from "fs";
import mongoose from "mongoose";
import { extname } from "path";
import { ASSET_MAX_BYTES } from "../constants/assets";
import { buildKey, extensionFor, uploadObject } from "../services/assetUpload.service";
import { toLocalityId } from "../services/catalogueRules";
import { createSeatMap } from "../services/seatMap.service";
import { parseBody } from "../utils/validate";
import { seatListSchema } from "../validators/catalogue";
import { readFlags } from "./cliArgs";

dotenv.config();

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
};

// Hosted images and frontend assets are stored as given; local files go to S3.
const resolveImage = async (image: string, name: string) => {
  if (/^https:\/\//.test(image) || image.startsWith("/assets/")) return image;
  const contentType = CONTENT_TYPES[extname(image).toLowerCase()];
  const extension = contentType && extensionFor(contentType);
  if (!contentType || !extension) throw new Error("Use a .webp, .png, .jpg or .avif plan image.");
  if (statSync(image).size > ASSET_MAX_BYTES["seat-map"]) throw new Error("The plan image is over 5 MB.");
  return uploadObject(buildKey("seat-map", toLocalityId(name), extension), readFileSync(image), contentType);
};

const main = async () => {
  const flags = readFlags(process.argv.slice(2));
  const name = flags.name?.trim();
  if (!name || !flags.image || !flags.seats) {
    throw new Error(
      'Usage: npm run import-seat-map -- --name "Venue floor 3" --image plan.webp --seats seats.json',
    );
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  const raw = JSON.parse(readFileSync(flags.seats, "utf8")) as unknown;
  const seats = parseBody(seatListSchema, Array.isArray(raw) ? raw : (raw as { seats?: unknown }).seats);
  const image = await resolveImage(flags.image, name);

  await mongoose.connect(process.env.MONGODB_URI);
  const map = await createSeatMap({ name, image, seats });
  console.log(`Seat map "${map.name}" is in the library with ${map.seatCount} seats: ${map.id}`);
};

main()
  .catch((error: unknown) => {
    const fields = (error as { meta?: { fields?: Record<string, string> } }).meta?.fields;
    console.error(error instanceof Error ? error.message : error);
    if (fields) {
      for (const [field, message] of Object.entries(fields)) console.error(`  ${field}: ${message}`);
    }
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
