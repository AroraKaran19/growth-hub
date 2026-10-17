type AttemptKind = "pass" | "membership";

const storageKey = (kind: AttemptKind) => `growthhub.checkout-attempt.${kind}`;

/** The same key for the same request, so a refresh gets the same held booking back from the server. */
export const attemptKeyFor = (kind: AttemptKind, request: unknown) => {
  const signature = JSON.stringify(request);
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(kind)) ?? "null") as { signature?: string; key?: string } | null;
    if (saved?.signature === signature && typeof saved.key === "string") return saved.key;
  } catch {
    // Storage can be blocked; a fresh key then just starts a new hold.
  }
  const key = crypto.randomUUID();
  try {
    sessionStorage.setItem(storageKey(kind), JSON.stringify({ signature, key }));
  } catch {
    // As above.
  }
  return key;
};

export const forgetAttempt = (kind: AttemptKind) => {
  try {
    sessionStorage.removeItem(storageKey(kind));
  } catch {
    // Nothing to forget when storage is blocked.
  }
};
