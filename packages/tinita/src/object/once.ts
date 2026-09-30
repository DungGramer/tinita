export function once<T extends (...args: any[]) => any>(func: T): T {
  let ran = false;
  let result: ReturnType<T>;
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    if (ran) return result;
    result = func.apply(this, args);
    ran = true;
    return result;
  } as T;
}
