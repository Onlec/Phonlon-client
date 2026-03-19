import React from 'react';
import { render } from '@testing-library/react';
import DesktopShell from './DesktopShell';

jest.mock('../ToastNotification', () => () => <div data-testid="toast" />);
jest.mock('./DesktopShortcuts', () => () => <div data-testid="shortcuts" />);
jest.mock('./PaneLayer', () => () => <div data-testid="pane-layer" />);
jest.mock('./StartMenu', () => () => <div data-testid="start-menu" />);
jest.mock('./Taskbar', () => () => <div data-testid="taskbar" />);
jest.mock('./ContextMenuHost', () => () => <div data-testid="context-menu-host" />);

describe('DesktopShell', () => {
  test('applies runtime luna custom vars to the desktop root', () => {
    const { container } = render(
      <DesktopShell
        onDesktopClick={jest.fn()}
        wallpaperStyle={{ backgroundColor: 'rgb(1, 2, 3)' }}
        themeStyle={{ '--custom-luna-seed': '#123456' }}
        dataTheme="luna-custom"
        dataFontsize="groot"
        scanlinesEnabled={false}
        desktopShortcuts={[]}
        onOpenShortcut={jest.fn()}
        onShortcutContextMenu={jest.fn()}
        onRenameShortcut={jest.fn()}
        onMoveShortcut={jest.fn()}
        gridConfig={{}}
        paneLayerProps={{}}
        startMenuProps={{}}
        taskbarProps={{}}
        toasts={[]}
        removeToast={jest.fn()}
        onToastClick={jest.fn()}
        contextMenu={{ enabled: false }}
      />
    );

    const desktop = container.querySelector('.desktop');

    expect(desktop).toHaveAttribute('data-theme', 'luna-custom');
    expect(desktop).toHaveAttribute('data-fontsize', 'groot');
    expect(desktop.style.backgroundColor).toBe('rgb(1, 2, 3)');
    expect(desktop.style.getPropertyValue('--custom-luna-seed')).toBe('#123456');
    expect(desktop.querySelector('#portal-root')).not.toBeNull();
  });
});
