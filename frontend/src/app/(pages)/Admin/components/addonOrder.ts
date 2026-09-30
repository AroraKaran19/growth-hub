type Ordered = { id: string; sortOrder: number };

/** Rows to renumber after moving one row a step; renumbering also heals ties. */
export const reorderChanges = (rows: Ordered[], index: number, step: -1 | 1): Ordered[] => {
  const target = index + step;
  if (target < 0 || target >= rows.length) return [];

  const moved = [...rows];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved
    .map((row, position) => ({ id: row.id, sortOrder: position, was: row.sortOrder }))
    .filter((row) => row.was !== row.sortOrder)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
};

export const nextSortOrder = (rows: Ordered[]) =>
  rows.reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1;
