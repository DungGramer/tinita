export function sortDates(arr: string[], type?: 'asc' | 'desc' = 'asc') {
  if (!arr) return arr;

  return arr.sort((a, b) => {
    return (
      new Date(a).getTime() - new Date(b).getTime() * (type === 'asc' ? 1 : -1)
    );
  });
}
