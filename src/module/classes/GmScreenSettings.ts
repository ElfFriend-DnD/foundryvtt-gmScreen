import { MODULE_ABBREV, MODULE_ID, MySettings, TEMPLATES } from '../constants';
import { log } from '../helpers';
import { GmScreenConfig, GmScreenGrid } from '../../gridTypes';

const defaultGmScreenConfig: GmScreenConfig = {
  activeGridId: 'default',
  grids: {
    default: {
      name: 'Main',
      id: 'default',
      entries: {},
    },
  },
};

export class GmScreenSettings extends FormApplication {
  static init() {
    // Debug use
    CONFIG[MODULE_ID] = { debug: false };
    // CONFIG.debug.hooks = true;

    game.settings.registerMenu(MODULE_ID, 'menu', {
      name: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Name`,
      label: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Label`,
      icon: 'fas fa-table',
      type: GmScreenSettings,
      restricted: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.gmScreenConfig, {
      default: defaultGmScreenConfig,
      type: Object,
      scope: 'world',
      config: false,
    });

    game.settings.register(MODULE_ID, MySettings.migrated, {
      config: false,
      default: { status: false, version: '1.2.2' },
      scope: 'world',
      type: Object,
    });

    game.settings.register(MODULE_ID, MySettings.columns, {
      name: `${MODULE_ABBREV}.settings.${MySettings.columns}.Name`,
      default: 4,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.columns}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.rows, {
      name: `${MODULE_ABBREV}.settings.${MySettings.rows}.Name`,
      default: 3,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.rows}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.displayDrawer, {
      name: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Name`,
      default: true,
      type: Boolean,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Hint`,
      onChange: () => window.location.reload(),
    });

    game.settings.register(MODULE_ID, MySettings.rightMargin, {
      name: `${MODULE_ABBREV}.settings.${MySettings.rightMargin}.Name`,
      default: 0,
      type: Number,
      scope: 'world',
      range: { min: 0, max: 75, step: 5 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.rightMargin}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.drawerWidth, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerWidth}.Name`,
      default: 100,
      type: Number,
      scope: 'world',
      range: { min: 25, max: 100, step: 5 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerWidth}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.drawerHeight, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerHeight}.Name`,
      default: 60,
      type: Number,
      scope: 'world',
      range: { min: 10, max: 90, step: 5 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerHeight}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.drawerOpacity, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerOpacity}.Name`,
      default: 1,
      type: Number,
      scope: 'world',
      range: { min: 0.1, max: 1, step: 0.05 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerOpacity}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.reset, {
      name: `${MODULE_ABBREV}.settings.${MySettings.reset}.Name`,
      default: false,
      type: Boolean,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.reset}.Hint`,
      onChange: (selected) => {
        if (selected) {
          game.settings.set(MODULE_ID, MySettings.gmScreenConfig, defaultGmScreenConfig);
        }
      },
    });
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['gm-screen-config'],
      closeOnSubmit: false,
      height: 'auto',
      submitOnChange: false,
      submitOnClose: false,
      template: TEMPLATES.settings,
      title: game.i18n.localize(`${MODULE_ABBREV}.gridConfig.GridConfig`),
      width: 600,
    };
  }

  constructor(object = {}, options) {
    super(object, options);
  }

  get rows(): number {
    return game.settings.get(MODULE_ID, MySettings.rows);
  }

  get columns(): number {
    return game.settings.get(MODULE_ID, MySettings.columns);
  }

  get settingsData() {
    const gmScreenConfig: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    log(false, 'getSettingsData', {
      gmScreenConfig,
    });

    return {
      grids: gmScreenConfig.grids,
    };
  }

  getData() {
    const data = {
      ...super.getData(),
      settings: this.settingsData,
      defaultRows: this.rows,
      defaultColumns: this.columns,
    };

    log(false, data);
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    log(false, 'activateListeners', {
      html,
    });

    const handleNewRowClick = async (currentTarget: JQuery<any>) => {
      log(false, 'add row clicked', {
        data: currentTarget.data(),
      });

      const table = currentTarget.data().table;

      const tableElement = currentTarget.siblings('table');
      const tbodyElement = $(tableElement).find('tbody');

      const newGridRowTemplateData = {
        gridId: randomID(),
        grid: {
          name: '',
          columnOverride: '',
          rowOverride: '',
        },
        defaultColumns: this.columns,
        defaultRows: this.rows,
      };

      const newRow = $(await renderTemplate(TEMPLATES[table].tableRow, newGridRowTemplateData));
      // render a new row at the end of tbody
      tbodyElement.append(newRow);
      this.setPosition({}); // recalc height
    };

    const handleDeleteRowClick = (currentTarget: JQuery<any>) => {
      log(false, 'delete row clicked', {
        currentTarget,
      });

      currentTarget.parentsUntil('tbody').remove();
      this.setPosition({}); // recalc height
    };

    html.on('click', (e) => {
      const currentTarget = $(e.target).closest('button')[0];

      if (!currentTarget) {
        return;
      }

      const wrappedCurrentTarget = $(currentTarget);

      log(false, 'a button was clicked', { e, currentTarget });

      if (wrappedCurrentTarget.hasClass('add-row')) {
        handleNewRowClick(wrappedCurrentTarget);
      }
      if (wrappedCurrentTarget.hasClass('delete-row')) {
        handleDeleteRowClick(wrappedCurrentTarget);
      }
    });
  }

  // grids: {
  //   default: {
  //     name: 'Main',
  //     id: 'default',
  //     entries: {},
  //   },
  // },

  async _updateObject(ev, formData) {
    const gmScreenConfig: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    const data = expandObject(formData);

    log(false, {
      formData,
      data,
    });

    // TODO: re-create data.grids with a more sensible key, append `id` to the object, create empty `entries`

    const newGrids = Object.values<Partial<GmScreenGrid>>(data.grids).reduce<GmScreenConfig['grids']>(
      (acc, grid) => {
        const gridId = grid.id ?? randomID();

        // if this grid exists already, modify it
        if (acc.hasOwnProperty(gridId)) {
          acc[gridId] = {
            ...acc[gridId],
            ...grid,
          };

          return acc;
        }

        // otherwise create it
        acc[gridId] = {
          ...grid,
          entries: {},
          name: grid.name ?? '',
          id: gridId,
        };

        return acc;
      },
      { ...gmScreenConfig.grids }
    );

    const newGmScreenConfig = {
      ...gmScreenConfig,
      grids: newGrids,
    };

    log(true, 'setting settings', {
      newGmScreenConfig,
    });

    await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, newGmScreenConfig);

    this.close();
  }
}
