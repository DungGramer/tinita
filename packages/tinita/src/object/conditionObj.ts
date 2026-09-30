import { isEmpty } from 'lodash-es';

/**
 * Condition show object
 * @use { ...conditionObj('key', {key: 'value'}, condition) }
 */
export const conditionObj = (
  key: string | undefined,
  val: any,
  condition?: boolean
): Record<string, unknown> | undefined => {
  if (!key) {
    return condition !== undefined ? condition && val : val;
  }

  if (condition !== undefined) {
    return condition && { [key]: val };
  } else if (typeof val === 'number' || !isEmpty(val)) {
    return { [key]: val };
  } else return {};
};
