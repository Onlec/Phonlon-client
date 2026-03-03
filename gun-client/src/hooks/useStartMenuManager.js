import { useCallback, useState } from 'react';

export function useStartMenuManager() {
  const [isStartOpen, setIsStartOpen] = useState(false);

  const openStartMenu = useCallback(() => {
    setIsStartOpen(true);
  }, []);

  const toggleStartMenu = useCallback(() => {
    setIsStartOpen((prev) => !prev);
  }, []);

  const closeStartMenu = useCallback(() => {
    setIsStartOpen(false);
  }, []);

  return {
    isStartOpen,
    setIsStartOpen,
    openStartMenu,
    toggleStartMenu,
    closeStartMenu
  };
}

export default useStartMenuManager;
