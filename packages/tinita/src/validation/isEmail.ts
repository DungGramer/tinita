import { emailRegex } from '../regex';
import { isEmpty } from 'lodash-es';

export function isEmail(value: string): boolean {
  // Let's not start a debate on email regex. This is just for an example app!
  if (!isEmpty(value) && !emailRegex.test(value)) {
    return false;
  }

  return true;
}
