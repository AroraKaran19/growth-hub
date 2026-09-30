/** Mirrors the server's seat rule; an empty pick keeps the booking's current seats. */
export const seatCountProblem = (spaceType: string, people: number, picked: string[]) => {
  if (picked.length === 0) return null;
  if (spaceType === "desk") {
    return picked.length === people ? null : `Pick ${people} desk${people === 1 ? "" : "s"}, one per person.`;
  }
  return picked.length === 1 ? null : "Pick one room.";
};
