import readline from "readline";

/** Asks for a line without echoing what is typed. */
export const promptHidden = (question: string) =>
  new Promise<string>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    // Muted only after the question is drawn, so readline's redraw can't wipe it.
    (rl as unknown as { _writeToOutput: (text: string) => void })._writeToOutput = (text) => {
      if (!muted) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
