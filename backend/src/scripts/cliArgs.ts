export const readFlags = (argv: string[]) => {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    // npm on Windows can drop the quotes, so a value may arrive as several words.
    const words: string[] = [];
    while (index + 1 < argv.length && !argv[index + 1].startsWith("--")) {
      words.push(argv[index + 1]);
      index += 1;
    }
    if (words.length) flags[key.slice(2)] = words.join(" ");
  }
  return flags;
};

export const hasFlag = (argv: string[], name: string) => argv.includes(`--${name}`);
