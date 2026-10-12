import dotenv from "dotenv";
import mongoose from "mongoose";
import { Admin } from "../models";
import { revokeAccountSessions } from "../services/session.service";
import { hashPassword } from "../services/staffAuth.service";
import { normalizeEmail } from "../utils/email";
import { passwordProblem } from "../utils/password";
import { hasFlag, readFlags } from "./cliArgs";
import { promptHidden } from "./promptHidden";

dotenv.config();

const askPassword = async (email: string) => {
  const password = await promptHidden(`Password for ${email}: `);
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  if ((await promptHidden("Type it again: ")) !== password) throw new Error("The passwords don't match.");
  return password;
};

const main = async () => {
  const argv = process.argv.slice(2);
  const flags = readFlags(argv);
  const email = normalizeEmail(flags.email);
  const name = flags.name?.trim();
  const makeSuper = hasFlag(argv, "super");
  if (!email || !name) {
    throw new Error('Usage: npm run create-admin -- --email admin@example.com --name "Jane Doe" [--super]');
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  const passwordHash = await hashPassword(await askPassword(email));
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        status: "active",
        passwordHash,
        mustChangePassword: false,
        passwordResetHash: null,
        passwordResetExpiresAt: null,
        ...(makeSuper && { role: "super-admin", permissions: [] }),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  // A new password here signs out anyone still using the old one.
  if (admin) await revokeAccountSessions("admin", admin._id, "password-changed");
  console.log(`${admin?.role === "super-admin" ? "Super admin" : "Admin"} ready: ${admin?.email}`);
  if (admin?.role === "admin" && admin.permissions?.length === 0) {
    console.log("No sections yet. A super admin can grant them on the Staff page.");
  }
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
