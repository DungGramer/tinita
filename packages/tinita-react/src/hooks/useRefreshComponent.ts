import { useReducer } from 'react';

const useRefreshComponent = (): [number, () => void] => {
  const [refresh, setRefresh] = useReducer((x) => x + 1, 0);

  return [refresh, setRefresh];
};

export default useRefreshComponent;
