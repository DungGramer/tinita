import { Dispatch, SetStateAction, useCallback, useState } from 'react';

type UseToggleProps = {
  defaultValue?: boolean;
};

type UseToggleReturnType = {
  value: boolean;
  toggle: () => void;
  setValue: Dispatch<SetStateAction<UseToggleReturnType['value']>>;
  setTrue: () => void;
  setFalse: () => void;
};

export const useToggle = ({ defaultValue = false }: UseToggleProps): UseToggleReturnType => {
  const [value, setValue] = useState<boolean>(Boolean(defaultValue));

  const toggle = useCallback(() => setValue((x) => !x), []);

  const setTrue = useCallback(() => setValue(true), []);

  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setValue, setTrue, setFalse };
};
