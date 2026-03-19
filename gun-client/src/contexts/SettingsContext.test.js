import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_LUNA_CUSTOM_SEED } from '../utils/lunaCustomTheme';
import { SettingsProvider, useSettings } from './SettingsContext';
import { readUserPrefOnce, writeUserPref } from '../utils/userPrefsGun';

jest.mock('../utils/userPrefsGun', () => ({
  readUserPrefOnce: jest.fn(),
  writeUserPref: jest.fn(() => Promise.resolve()),
  PREF_KEYS: {
    SETTINGS: 'settings',
  },
}));

function SettingsProbe() {
  const { settings } = useSettings();

  return (
    <div>{`${settings.colorScheme}|${settings.customLunaTheme.seed}`}</div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writeUserPref.mockResolvedValue(undefined);
  });

  test('hydrates older settings payloads with the default luna custom seed', async () => {
    readUserPrefOnce.mockResolvedValue({
      colorScheme: 'luna-custom',
    });

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>
    );

    expect(
      await screen.findByText(`luna-custom|${DEFAULT_LUNA_CUSTOM_SEED}`)
    ).toBeInTheDocument();
    expect(writeUserPref).toHaveBeenCalledWith(
      'guest',
      'settings',
      expect.objectContaining({
        colorScheme: 'luna-custom',
        customLunaTheme: { seed: DEFAULT_LUNA_CUSTOM_SEED },
      })
    );
  });
});
