export const formatPlainNumber = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  return rounded.toFixed(2).replace(/\.?0+$/, '');
};
