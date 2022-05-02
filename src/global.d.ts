import { GmScreenApplicationCommon } from './module/classes/GmScreenApplication';
import { GmScreenSettingsData, MyHooks } from './types';

declare global {
  interface LenientGlobalVariableTypes {
    game: never; // the type doesn't matter
  }

  namespace Game {
    interface ModuleData<T> {
      api?: Record<string, any>;
    }
  }

  namespace ClientSettings {
    interface Values {
      'gm-screen.columns': number;
      'gm-screen.display-as-drawer': boolean;
      'gm-screen.drawer-height': number;
      'gm-screen.drawer-opacity': number;
      'gm-screen.drawer-width': number;
      'gm-screen.gm-screen-config': GmScreenSettingsData;
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

  namespace Hooks {
    interface StaticCallbacks {
      [MyHooks.openClose]: (app: GmScreenApplicationCommon, options: { isOpen: boolean }) => void;
      [MyHooks.ready]: () => void;
      ['devModeReady']: (api: DevModeApi) => void;
    }
  }
}

declare enum LogLevel {
  NONE = 0,
  INFO = 1,
  ERROR = 2,
  DEBUG = 3,
  WARN = 4,
  ALL = 5,
}

interface DevModeApi {
  registerPackageDebugFlag(
    packageName: string,
    kind?: 'boolean' | 'level',
    options?: {
      default?: boolean | LogLevel;
      choiceLabelOverrides?: Record<string, string>; // actually keyed by LogLevel number
    },
  ): Promise<boolean>;

  getPackageDebugValue(packageName: string, kind?: 'boolean' | 'level'): boolean | LogLevel;
}
