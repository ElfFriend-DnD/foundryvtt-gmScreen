import { GmScreenConfig, GmScreenGridEntry } from '../gridTypes';
import { MODULE_ID, MySettings } from './constants';
import { log } from './helpers';

interface GmScreenConfig1 {
  grid: {
    entries: GmScreenGridEntry[];
  };
}

export async function _gmScreenMigrate() {
  if (!game.user.isGM) return;
  const NEEDS_MIGRATION_VERSION = '2.0.0';
  // Updating from old install -> Migrated
  // Fresh install -> No migration CHECK
  // Skipped multiple versions and upgrading in 0.4.X or higher
  // X round of migrations (bound to happen again, right?)
  let migrated = game.settings.get(MODULE_ID, MySettings.migrated);
  // If we have migrated before
  if (migrated.status) {
    // If our version is newer than the NEEDS_MIGRATION_VERSION
    if (isNewerVersion(game.modules.get(MODULE_ID).data.version, NEEDS_MIGRATION_VERSION)) return;
    // If we are on the same version, but have migrated.
    if (migrated.version === NEEDS_MIGRATION_VERSION) return;
  }

  ui.notifications.notify('GM Screen | Beginning Migration to updated schema.', 'info');

  let gmScreenConfig: GmScreenConfig1 = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
  if (Array.isArray(gmScreenConfig.grid.entries)) {
    // need to convert gmscreenconfig.grid.entries from array to object

    const migratedEntries: GmScreenConfig['grid']['entries'] = gmScreenConfig.grid.entries.reduce((acc, entry) => {
      const entryId = `${entry.x}-${entry.y}`;

      acc[entryId] = {
        ...entry,
        entryId,
      };

      return acc;
    }, {});

    log(true, 'migration output', {
      ...gmScreenConfig,
      grid: {
        ...gmScreenConfig.grid,
        entries: migratedEntries,
      },
    });

    await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, {
      ...gmScreenConfig,
      grid: {
        ...gmScreenConfig.grid,
        entries: migratedEntries,
      },
    });
  }

  ui.notifications.notify('GM Screen | Migration Complete.', 'info');

  await game.settings.set(MODULE_ID, MySettings.migrated, { status: true, version: NEEDS_MIGRATION_VERSION });
}
