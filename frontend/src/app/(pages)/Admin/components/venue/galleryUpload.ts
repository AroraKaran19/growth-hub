export type FailedUpload = { name: string; message: string };

/** Uploads every file in turn; one failure never stops the rest. */
export const uploadEach = async <F extends { name: string }>(
  files: F[],
  upload: (file: F) => Promise<string>,
  messageFor: (error: unknown) => string,
) => {
  const added: string[] = [];
  const failed: FailedUpload[] = [];
  for (const file of files) {
    try {
      added.push(await upload(file));
    } catch (caught) {
      failed.push({ name: file.name, message: messageFor(caught) });
    }
  }
  return { added, failed };
};

export const uploadNotice = (failed: FailedUpload[], skipped: number): string | null => {
  const parts = failed.map((file) => `${file.name} was not added: ${file.message}`);
  if (skipped > 0) {
    parts.push(`${skipped} more ${skipped === 1 ? "photo was" : "photos were"} skipped because the gallery is full.`);
  }
  return parts.length ? parts.join(" ") : null;
};
