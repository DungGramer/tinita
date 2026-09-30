export function getArrayVal<k>(val: k[] | k, index = 0): k {
  return Array.isArray(val) ? val[index] : val;
}
