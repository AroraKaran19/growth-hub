const MIN_LENGTH = 10;
// bcrypt on the server ignores everything past 72 bytes.
const MAX_BYTES = 72;
// No 0/O, 1/l/I, so a password read aloud or copied by hand survives.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Mirrors the server's rule so the form can answer before submitting. */
export const passwordProblem = (password: string) => {
  if (password.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
  if (new TextEncoder().encode(password).length > MAX_BYTES) return `Keep it under ${MAX_BYTES} characters.`;
  return null;
};

/** A temporary password in three groups of four, like Ab3d-Ef6h-Jk9m. */
export const generatePassword = () => {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]);
  return [0, 4, 8].map((start) => chars.slice(start, start + 4).join("")).join("-");
};
