export const formatScaledNumber = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  if (Number.isInteger(rounded)) return String(rounded);

  return rounded.toFixed(2).replace(/\.?0+$/, '');
};
