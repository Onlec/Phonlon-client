import React, { useEffect, useState } from 'react';
import { STATUS_OPTIONS } from '../../utils/presenceUtils';
import xpAssets from '../../config/xpAssets';

function Systray({
  isSuperpeer,
  connectedSuperpeers,
  isLoggedIn,
  relayStatus,
  forceReconnect,
  messengerSignedIn,
  systrayIconRef,
  currentStatusOption,
  getDisplayName,
  currentUser,
  onToggleMenu,
  showSystrayMenu,
  systrayMenuRef,
  getAvatar,
  userStatus,
  onStatusChange,
  onOpenContacts,
  onSignOut,
  onCloseMessenger,
  assetMap = xpAssets
}) {
  const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [clockTime, setClockTime] = useState(formatTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(formatTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="systray">
      {isSuperpeer && (
        <span className="superpeer-badge systray-slot" title={`Superpeer actief | ${connectedSuperpeers} peer(s) verbonden`}>
          <img className="systray-glyph" src={assetMap.systray.usb} alt="" />
        </span>
      )}
      {isLoggedIn && (
        <button
          type="button"
          className={`relay-status-badge systray-slot ${relayStatus.anyOnline ? 'relay-online' : 'relay-offline'}`}
          title={relayStatus.anyOnline
            ? `Relay verbonden${isSuperpeer ? ' | Superpeer actief' : ''} | ${connectedSuperpeers} peer(s)`
            : 'Relay offline - klik om te reconnecten'
          }
          onClick={() => !relayStatus.anyOnline && forceReconnect()}
        >
          <span className={`relay-led ${relayStatus.anyOnline ? 'relay-led--online' : 'relay-led--offline'}`} aria-hidden="true" />
        </button>
      )}
      {isLoggedIn && messengerSignedIn && (
        <button
          type="button"
          ref={systrayIconRef}
          className="systray-chatlon-icon systray-slot"
          title={`Chatlon - ${currentStatusOption.label} (${getDisplayName(currentUser)})`}
          onClick={onToggleMenu}
        >
          <img className="systray-chatlon-figure" src={assetMap.systray.chatlon} alt="" />
          <span className="systray-status-dot" style={{ backgroundColor: currentStatusOption.color }}></span>
        </button>
      )}
      {showSystrayMenu && (
        <div ref={systrayMenuRef} className="systray-menu" onClick={(e) => e.stopPropagation()}>
          <div className="systray-menu-header">
            <img src={getAvatar(currentUser)} alt="" className="systray-menu-avatar" />
            <div className="systray-menu-user">
              <div className="systray-menu-name">{getDisplayName(currentUser)}</div>
              <div className="systray-menu-status" style={{ color: currentStatusOption.color }}>{currentStatusOption.label}</div>
            </div>
          </div>
          <div className="dropdown-separator" />
          {STATUS_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`dropdown-item ${userStatus === opt.value ? 'dropdown-item--checked' : ''}`}
              onClick={() => onStatusChange(opt.value)}
            >
              <span className="systray-status-indicator" style={{ backgroundColor: opt.color }}></span>
              <span className="dropdown-item-label">{opt.label}</span>
            </button>
          ))}
          <div className="dropdown-separator" />
          <button type="button" className="dropdown-item" onClick={onOpenContacts}>
            <span className="dropdown-item-label">Chatlon openen</span>
          </button>
          <button type="button" className="dropdown-item" onClick={onSignOut}>
            <span className="dropdown-item-label">Afmelden</span>
          </button>
          <div className="dropdown-separator" />
          <button type="button" className="dropdown-item" onClick={onCloseMessenger}>
            <span className="dropdown-item-label">Afsluiten</span>
          </button>
        </div>
      )}
      <span className="systray-clock systray-slot">{clockTime}</span>
    </div>
  );
}

export default Systray;
