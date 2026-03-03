import React from 'react';
import xpAssets from '../../config/xpAssets';

function StartMenu({
  isOpen,
  paneConfig,
  currentUser,
  getAvatar,
  getLocalUserInfo,
  onOpenPane,
  onCloseStartMenu,
  onLogoff,
  onShutdown,
  assetMap = xpAssets
}) {
  if (!isOpen) return null;

  const localInfo = getLocalUserInfo(currentUser);

  return (
    <div className="start-menu" onClick={(e) => e.stopPropagation()} role="menu" aria-label="Startmenu">
      <div className="start-menu-header">
        <img
          src={localInfo?.localAvatar ? `/avatars/${localInfo.localAvatar}` : (getAvatar(currentUser) || assetMap.startmenu.userAvatar)}
          alt="user"
          className="start-user-img"
        />
        <span className="start-user-name">{localInfo?.localName || currentUser}</span>
      </div>
      <div className="start-menu-main">
        <div className="start-left-col">
          {Object.entries(paneConfig).map(([paneName, config]) => (
            <button
              key={paneName}
              type="button"
              className="start-item"
              onClick={() => {
                onOpenPane(paneName);
                onCloseStartMenu();
              }}
            >
              {config.desktopIcon.endsWith('.ico') || config.desktopIcon.endsWith('.png') ? (
                <img src={config.desktopIcon} alt="" className="start-item-icon-image" />
              ) : (
                <span className="start-item-icon-emoji" aria-hidden="true">{config.desktopIcon}</span>
              )}
              <span>{config.desktopLabel}</span>
            </button>
          ))}
        </div>
        <div className="start-right-col">
          <button type="button" className="start-item start-item--pinned" onClick={onCloseStartMenu}>
            <img src={assetMap.startmenu.pinned.documents} alt="" className="start-item-icon-image" />
            My Documents
          </button>
          <button type="button" className="start-item start-item--pinned" onClick={onCloseStartMenu}>
            <img src={assetMap.startmenu.pinned.computer} alt="" className="start-item-icon-image" />
            My Computer
          </button>
        </div>
      </div>
      <div className="start-menu-footer">
        <button type="button" className="logoff-btn" onClick={onLogoff}>
          <img src={assetMap.startmenu.actions.logoff} alt="" className="start-footer-icon" />
          <span>Log Off</span>
        </button>
        <button type="button" className="shutdown-btn" onClick={onShutdown}>
          <img src={assetMap.startmenu.actions.shutdown} alt="" className="start-footer-icon" />
          <span>Shut Down</span>
        </button>
      </div>
    </div>
  );
}

export default StartMenu;
