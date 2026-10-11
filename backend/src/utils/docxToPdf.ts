import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const CANDIDATES = [
  "/usr/bin/soffice",
  "/usr/lib/libreoffice/program/soffice",
  "/opt/libreoffice/program/soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
];
const TIMEOUT_MS = 60_000;

export const findSoffice = () =>
  [process.env.LIBREOFFICE_PATH, ...CANDIDATES].find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate))) ?? null;

const run = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let errors = "";
    child.stderr.on("data", (chunk: Buffer) => (errors += chunk.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`LibreOffice exited with ${code}: ${errors.trim().slice(0, 300)}`));
    });
  });

/** Converts with LibreOffice; each call gets its own profile, which LibreOffice otherwise locks. */
export const convertDocx = async (docx: Buffer, format: "pdf" | "png" = "pdf"): Promise<Buffer> => {
  const soffice = findSoffice();
  if (!soffice) throw new Error("LIBREOFFICE_MISSING");

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "invoice-"));
  const profile = path.join(os.tmpdir(), `lo-profile-${process.pid}-${crypto.randomBytes(4).toString("hex")}`);
  try {
    const input = path.join(work, "invoice.docx");
    fs.writeFileSync(input, docx);
    await run(soffice, [
      `-env:UserInstallation=file:///${profile.replace(/\\/g, "/")}`,
      "--headless",
      "--norestore",
      "--convert-to",
      format,
      "--outdir",
      work,
      input,
    ]);
    const output = path.join(work, `invoice.${format}`);
    if (!fs.existsSync(output)) throw new Error("LibreOffice produced no file");
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
    fs.rmSync(profile, { recursive: true, force: true });
  }
};
