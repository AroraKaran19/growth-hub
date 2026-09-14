export const readFlags = (argv: string[]) => {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key.startsWith("--") && value !== undefined && !value.startsWith("--")) {
      flags[key.slice(2)] = value;
      index += 1;
    }
  }
  return flags;
};
