import { MODULE_ABBREV, MODULE_ID, MySettings, TEMPLATES } from '../constants';
import { getGame, log } from '../helpers';
import { GmScreenConfig, GmScreenGrid } from '../../gridTypes';

const defaultGmScreenConfig: GmScreenConfig = {
  activeGridId: 'default',
  grids: {
    default: {
      name: 'Main',
      id: 'default',
      isShared: false,
      entries: {},
    },
  },
};

export class GmScreenSettings extends FormApplication {
  static init() {
    getGame().settings.registerMenu(MODULE_ID, 'menu', {
      name: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Name`,
      label: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Label`,
      icon: 'fas fa-table',
      type: GmScreenSettings,
      restricted: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.gmScreenConfig, {
      default: defaultGmScreenConfig,
      type: defaultGmScreenConfig.constructor as ConstructorOf<GmScreenConfig>,
      scope: 'world',
      config: false,
      onChange: function (...args) {
        log(false, 'gmScreenConfig changed', {
          args,
          currentConfig: { ...(getGame().settings.get(MODULE_ID, MySettings.gmScreenConfig) as GmScreenConfig) },
        });

        getGame().modules.get(MODULE_ID)?.api?.refreshGmScreen();
      },
    });

    getGame().settings.register(MODULE_ID, MySettings.migrated, {
      config: false,
      default: { status: false, version: '1.2.2' },
      scope: 'world',
      type: Object as unknown as ConstructorOf<{ status: boolean; version: string }>,
    });

    getGame().settings.register(MODULE_ID, MySettings.columns, {
      name: `${MODULE_ABBREV}.settings.${MySettings.columns}.Name`,
      default: 4,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.columns}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.rows, {
      name: `${MODULE_ABBREV}.settings.${MySettings.rows}.Name`,
      default: 3,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.rows}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.displayDrawer, {
      name: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Name`,
      default: true,
      type: Boolean,
      scope: 'client',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Hint`,
      onChange: () => window.location.reload(),
    });

    getGame().settings.register(MODULE_ID, MySettings.rightMargin, {
      name: `${MODULE_ABBREV}.settings.${MySettings.rightMargin}.Name`,
      default: 0,
      type: Number,
      scope: 'client',
      range: { min: 0, max: 75, step: 5 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.rightMargin}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.drawerWidth, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerWidth}.Name`,
      default: 100,
      type: Number,
      scope: 'client',
      range: { min: 25, max: 100, step: 1 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerWidth}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.drawerHeight, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerHeight}.Name`,
      default: 60,
      type: Number,
      scope: 'client',
      range: { min: 10, max: 90, step: 1 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerHeight}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.drawerOpacity, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerOpacity}.Name`,
      default: 1,
      type: Number,
      scope: 'client',
      range: { min: 0.1, max: 1, step: 0.05 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerOpacity}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.condensedButton, {
      name: `${MODULE_ABBREV}.settings.${MySettings.condensedButton}.Name`,
      default: false,
      type: Boolean,
      scope: 'client',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.condensedButton}.Hint`,
    });

    getGame().settings.register(MODULE_ID, MySettings.reset, {
      name: `${MODULE_ABBREV}.settings.${MySettings.reset}.Name`,
      default: false,
      type: Boolean,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.reset}.Hint`,
      onChange: (selected) => {
        if (selected) {
          getGame().settings.set(MODULE_ID, MySettings.gmScreenConfig, defaultGmScreenConfig);
        }
      },
    });
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['gm-screen-config'],
      closeOnSubmit: false,
      height: 'auto' as const,
      submitOnChange: false,
      submitOnClose: false,
      id: 'gm-screen-tabs-config',
      template: TEMPLATES.settings,
      title: getGame().i18n.localize(`${MODULE_ABBREV}.gridConfig.GridConfig`),
      width: 600,
    };
  }

  get rows() {
    return getGame().settings.get(MODULE_ID, MySettings.rows);
  }

  get columns() {
    return getGame().settings.get(MODULE_ID, MySettings.columns);
  }

  get settingsData() {
    const gmScreenConfig = getGame().settings.get(MODULE_ID, MySettings.gmScreenConfig);

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

  _dragListeners(html: JQuery<any>) {
    let draggedRow: HTMLElement | undefined;

    html.on('dragstart', (e) => {
      draggedRow = e.target;
    });

    html.on('dragover', (e) => {
      if (!draggedRow) {
        return;
      }

      const targetRow = $(e.target).parents('tbody tr')[0];

      if (!targetRow) {
        return;
      }

      let tableRows = Array.from($(e.target).parents('tbody').children()) as HTMLElement[];

      if (tableRows.indexOf(targetRow) > tableRows.indexOf(draggedRow)) {
        targetRow.after(draggedRow);
      } else {
        targetRow.before(draggedRow);
      }
    });

    html.on('dragend', (e) => {
      draggedRow = undefined;
    });
  }

  activateListeners(html: JQuery<any>) {
    super.activateListeners(html);

    log(false, 'activateListeners', {
      html,
    });

    const handleNewRowClick = async (currentTarget: JQuery<any>) => {
      log(false, 'add row clicked', {
        data: currentTarget.data(),
      });

      const table = currentTarget.data().table;
      const tbodyElement = $(html).find('tbody');

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

    this._dragListeners(html);

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
    const gmScreenConfig = getGame().settings.get(MODULE_ID, MySettings.gmScreenConfig);

    const data = expandObject(formData);

    log(false, {
      formData,
      data,
    });

    if (Object.keys(data).length === 0) {
      ui.notifications?.error(getGame().i18n.localize(`${MODULE_ABBREV}.gridConfig.errors.empty`));
      throw 'Cannot save the grid with no tabs.';
    }

    const newGridIds = Object.keys(data.grids);

    const newGrids = newGridIds.reduce<GmScreenConfig['grids']>((acc, gridId) => {
      const grid = data.grids[gridId];

      // if this grid exists already, modify it
      if (gmScreenConfig.grids.hasOwnProperty(gridId)) {
        acc[gridId] = {
          ...gmScreenConfig.grids[gridId],
          ...grid,
        };

        return acc;
      }

      // otherwise create it
      acc[gridId] = {
        ...grid,
        entries: {},
        name: grid.name ?? '',
        isShared: grid.isShared ?? false,
        id: gridId,
      };

      return acc;
    }, {});

    // handle case where active tab is deleted
    const newActiveGridId = newGridIds.includes(gmScreenConfig.activeGridId)
      ? gmScreenConfig.activeGridId
      : newGridIds[0];

    const newGmScreenConfig: GmScreenConfig = {
      ...gmScreenConfig,
      grids: newGrids,
      activeGridId: newActiveGridId,
    };

    log(true, 'setting settings', {
      newGmScreenConfig,
    });

    await getGame().settings.set(MODULE_ID, MySettings.gmScreenConfig, newGmScreenConfig);

    window[MODULE_ID].refreshGmScreen();

    this.close();
  }
}
