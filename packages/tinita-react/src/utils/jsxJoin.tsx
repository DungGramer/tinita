import { Fragment } from 'react';

function jsxJoin<T extends JSX.Element>(array: T[], str: T): T {
  if (!array?.length) return null;

  return array.filter(Boolean).reduce((result, item) => (
    <Fragment>
      {result}
      {str}
      {item}
    </Fragment>
  ));
}

export default jsxJoin;
