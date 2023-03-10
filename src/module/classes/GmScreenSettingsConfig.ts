import { GmScreenSettingsData } from '../../types';
import { MODULE_ABBREV, MODULE_ID } from '../constants';
import { log } from '../helpers';
import { GmScreen } from './GmScreen';

// we have no custom options
type GmScreenSettingsConfigOptions = FormApplicationOptions;

// the data provided to the template should look like this
interface GmScreenSettingsConfigData {
  settings: GmScreenSettingsData;
  defaultRows: number;
  defaultColumns: number;
}

// this application is instanciated by core with no object provided
type GmScreenSettingsObject = undefined;

export class GmScreenSettingsConfig extends FormApplication<
  GmScreenSettingsConfigOptions,
  GmScreenSettingsConfigData,
  GmScreenSettingsObject
> {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['gm-screen-config'],
      closeOnSubmit: false,
      height: 'auto' as const,
      submitOnChange: false,
      submitOnClose: false,
      id: 'gm-screen-tabs-config',
      template: GmScreen.TEMPLATES.settings,
      title: game.i18n.localize(`${MODULE_ABBREV}.gridConfig.GridConfig`),
      width: 600,
    };
  }

  get data() {
    return GmScreen.dataManager.gmScreenSettingsConfigData;
  }

  getData() {
    return {
      ...GmScreen.dataManager.gmScreenSettingsConfigData,
    };
  }

  // TODO: Audit this?
  _dragListeners(html: JQuery) {
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

      const tableRows = Array.from($(e.target).parents('tbody').children()) as HTMLElement[];

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

  handleNewRowClick = async (currentTarget: JQuery) => {
    const tbodyElement = $(this.element).find('tbody');

    const newGridRowTemplateData = {
      gridId: randomID(),
      grid: {
        name: '',
        columnOverride: '',
        rowOverride: '',
      },
      defaultColumns: this.data.defaultColumns,
      defaultRows: this.data.defaultRows,
    };

    const newRow = $(await renderTemplate(GmScreen.TEMPLATES.grids.tableRow, newGridRowTemplateData));
    // render a new row at the end of tbody
    tbodyElement.append(newRow);
    this.setPosition({}); // recalc height
  };

  handleDeleteRowClick = (currentTarget: JQuery) => {
    log(false, 'delete row clicked', {
      currentTarget,
    });

    currentTarget.closest('tr').remove();
    this.setPosition({}); // recalc height
  };

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    this._dragListeners(html);

    html.on('click', 'button', (event) => {
      const action = event.currentTarget?.dataset?.action;

      switch (action) {
        case 'add-row': {
          this.handleNewRowClick(event.currentTarget);
          break;
        }
        case 'delete-row': {
          this.handleDeleteRowClick(event.currentTarget);
          break;
        }
      }
    });
  }

  async _updateObject(event: Event, formData: object) {
    const dataManager = GmScreen.dataManager;

    const formDataObject: Omit<GmScreenSettingsData, 'activeGridId'> = expandObject(formData);

    log(false, {
      formData,
      formDataObject,
    });

    if (Object.keys(formDataObject).length === 0) {
      ui.notifications?.error(game.i18n.localize(`${MODULE_ABBREV}.gridConfig.errors.empty`));
      throw new Error('Cannot save the grid with no tabs.');
    }

    const newGridIds = Object.keys(formDataObject.grids);

    // rebuild the grids object on every save
    const newGrids = newGridIds.reduce<GmScreenSettingsData['grids']>((acc, gridId) => {
      const grid = formDataObject.grids[gridId];

      // if this grid exists already, spread the old and modify it
      if (dataManager.grids.hasOwnProperty(gridId)) {
        acc[gridId] = {
          ...dataManager.grids[gridId],
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
    const newActiveGridId = newGridIds.includes(dataManager.activeGmGridId)
      ? dataManager.activeGmGridId
      : newGridIds[0];

    const newGmScreenConfig: GmScreenSettingsData = {
      grids: newGrids,
      activeGridId: newActiveGridId,
    };

    log(true, 'setting settings', {
      newGmScreenConfig,
    });

    await game.settings.set(MODULE_ID, GmScreen.SETTINGS.gmScreenConfig, newGmScreenConfig);

    this.close();
  }
}
