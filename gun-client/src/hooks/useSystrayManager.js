import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_OPTIONS } from '../utils/presenceUtils';

export function useSystrayManager({
  userStatus,
  onStatusChange,
  onOpenContacts,
  onSignOut,
  onCloseMessenger,
  onOpenMenu,
  onCloseMenu
}) {
  const [showSystrayMenu, setShowSystrayMenu] = useState(false);
  const systrayMenuRef = useRef(null);
  const systrayIconRef = useRef(null);

  const currentStatusOption = useMemo(
    () => STATUS_OPTIONS.find((s) => s.value === userStatus) || STATUS_OPTIONS[0],
    [userStatus]
  );

  const closeSystrayMenu = useCallback(() => {
    setShowSystrayMenu(false);
    if (typeof onCloseMenu === 'function') {
      onCloseMenu();
    }
  }, [onCloseMenu]);

  const onToggleMenu = useCallback((e) => {
    e.stopPropagation();
    setShowSystrayMenu((prev) => {
      const next = !prev;
      if (next && typeof onOpenMenu === 'function') {
        onOpenMenu();
      }
      if (!next && typeof onCloseMenu === 'function') {
        onCloseMenu();
      }
      return next;
    });
  }, [onOpenMenu, onCloseMenu]);

  const handleStatusChange = useCallback((value) => {
    onStatusChange(value);
    closeSystrayMenu();
  }, [onStatusChange, closeSystrayMenu]);

  const handleOpenContacts = useCallback(() => {
    onOpenContacts();
    closeSystrayMenu();
  }, [onOpenContacts, closeSystrayMenu]);

  const handleSignOut = useCallback(() => {
    onSignOut();
    closeSystrayMenu();
  }, [onSignOut, closeSystrayMenu]);

  const handleCloseMessenger = useCallback(() => {
    onCloseMessenger();
    closeSystrayMenu();
  }, [onCloseMessenger, closeSystrayMenu]);

  useEffect(() => {
    if (!showSystrayMenu) return;
    const handleClick = (e) => {
      if (
        systrayMenuRef.current &&
        !systrayMenuRef.current.contains(e.target) &&
        systrayIconRef.current &&
        !systrayIconRef.current.contains(e.target)
      ) {
        setShowSystrayMenu(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeSystrayMenu();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSystrayMenu, closeSystrayMenu]);

  return {
    showSystrayMenu,
    systrayMenuRef,
    systrayIconRef,
    currentStatusOption,
    onToggleMenu,
    closeSystrayMenu,
    onStatusChange: handleStatusChange,
    onOpenContacts: handleOpenContacts,
    onSignOut: handleSignOut,
    onCloseMessenger: handleCloseMessenger
  };
}

export default useSystrayManager;
