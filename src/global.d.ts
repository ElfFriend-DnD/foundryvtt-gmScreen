import { GmScreenConfig } from './gridTypes';

declare global {
  namespace Game {
    interface ModuleData<T> {
      api?: Record<string, any>;
    }
  }

  interface JournalSheet {
    isKankaEntry?: boolean;
  }

  namespace ClientSettings {
    interface Values {
      'gm-screen.columns': number;
      'gm-screen.display-as-drawer': boolean;
      'gm-screen.drawer-height': number;
      'gm-screen.drawer-opacity': number;
      'gm-screen.drawer-width': number;
      'gm-screen.gm-screen-config': GmScreenConfig;
      'gm-screen.migrated': {
        status: boolean;
        version: string;
      };
      'gm-screen.condensedButton': boolean;
      'gm-screen.reset': boolean;
      'gm-screen.right-margin': number;
      'gm-screen.rows': number;
    }
  }
}
