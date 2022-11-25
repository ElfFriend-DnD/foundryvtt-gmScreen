import { GmScreenGridEntry } from '../../types';
import { MODULE_ID } from '../constants';
import { getUserCellConfigurationInput, log } from '../helpers';
import { CompactRollTableDisplay } from './DocumentSheets/CompactRollTableSheet';
import { GmScreen } from './GmScreen';
import { GmScreenDataManager } from './GmScreenData';

interface SheetClassDefinition {
  cls: DocumentSheet;
  default: boolean;
  id: string;
  label: string;
}

/**
 * Helpers to make interacting with or rendering a given GridEntry easier
 * TODO: Should this be it's own class that is created for each cell?
 */
export class GmScreenCell {
  /**
   * Apply overrides to make this grid entry render inside the provided cellId
   * MUTATES SheetClass
   * BRITTLE
   */
  static applyGmScreenCellSheetOverrides(SheetClass: DocumentSheet, cellId: string) {
    SheetClass.options.editable = false;
    SheetClass.options.popOut = false;
    //@ts-expect-error Yeah I know this isn't the best idea
    SheetClass.cellId = cellId;

    Object.defineProperty(SheetClass, 'isEditable', { value: false });

    //@ts-expect-error Yeah I know this isn't the best idea
    SheetClass._injectHTML = function (html) {
      //@ts-expect-error I inject cellId
      $(this.cellId).find('.gm-screen-grid-cell-title').text(this.title);

      //@ts-expect-error I inject cellId
      const gridCellContent = $(this.cellId).find('.gm-screen-grid-cell-content');

      log(false, 'CompactEntitySheet overwritten _injectHTML', {
        targetElement: gridCellContent,
        gridCellContent,
        //@ts-expect-error I inject cellId
        cellId: this.cellId,
        html,
      });
      gridCellContent.append(html);
      //@ts-expect-error Yeah I know this isn't the best idea
      this._element = html;
    };

    //@ts-expect-error Yeah I know this isn't the best idea
    SheetClass._replaceHTML = function (element, html, options) {
      //@ts-expect-error I inject cellId
      $(this.cellId).find('.gm-screen-grid-cell-title').text(this.title);

      //@ts-expect-error I inject cellId
      const gridCellContent = $(this.cellId).find('.gm-screen-grid-cell-content');
      gridCellContent.html(html);
      //@ts-expect-error Yeah I know this isn't the best idea
      this._element = html;
    };
  }

  /**
   * Obtain the FormApplication class constructor which should be used to display this Document in the Gm Screen.
   * Adapted from `ClientDocumentMixin._getSheetClass`
   */
  static _getGridEntrySheetClass(document: Actor | Item | JournalEntry | RollTable) {
    const cfg = CONFIG[document.documentName];

    // @ts-expect-error 'type' is expected to be undefined sometimes
    // this document's type (or "base")
    const type: string = document.type || CONST.BASE_DOCUMENT_TYPE;

    // @ts-expect-error 'sheetClasses' is expected to exist
    // this document type's sheet definitions
    const documentTypeSheets: Record<string, SheetClassDefinition> = cfg.sheetClasses[type] || {};

    const gmScreenOverride = document.getFlag(MODULE_ID, GmScreen.FLAGS.gmScreenSheetClass) as string;

    const coreOverride = document.getFlag('core', 'sheetClass') as string;

    // if there's a gm screen override defined, use that
    if (documentTypeSheets[gmScreenOverride]) return documentTypeSheets[gmScreenOverride].cls;

    // if there's a core override defined, use that
    if (documentTypeSheets[coreOverride]) return documentTypeSheets[coreOverride].cls;

    // all of the sheet class definitions for this document's type
    const possibleSheetDefinitions = Object.values(documentTypeSheets);
    if (!possibleSheetDefinitions.length) return null;

    // TODO: Add "GM Screen Default Sheet Class"

    const coreDefaultSheetClass = (possibleSheetDefinitions.find((s) => s.default) ?? possibleSheetDefinitions.pop())
      ?.cls;

    // I have no idea how to incorporate this into the sheet enum in a nice way
    if (document instanceof RollTable) {
      return CompactRollTableDisplay;
    }

    return coreDefaultSheetClass;
  }

  /**
   * Gets user inputs about how a cell should change (row and column span)
   * submits that as an edit
   */
  static async _onConfigureGridEntry({ x, y }: { x: number; y: number }, entryId?: string) {
    try {
      let entryToConfigure: GmScreenGridEntry = {
        x,
        y,
        entryId: `${x}-${y}`,
      };

      if (entryId) {
        entryToConfigure = GmScreen.dataManager.activeGmGrid.entries[entryId];
      }

      log(false, 'configureCell cellToConfigure', entryToConfigure);

      const { newSpanRows, newSpanCols } = await getUserCellConfigurationInput(entryToConfigure, {
        rows: GmScreen.dataManager.activeGmGrid.rowOverride ?? GmScreen.dataManager.applicationData.rows,
        columns: GmScreen.dataManager.activeGmGrid.columnOverride ?? GmScreen.dataManager.applicationData.columns,
      });

      log(false, 'new span values from dialog', {
        newSpanRows,
        newSpanCols,
      });

      const newEntry = {
        ...entryToConfigure,
        spanRows: newSpanRows,
        spanCols: newSpanCols,
      };

      return GmScreen.dataManager.editCellInActiveGrid(newEntry);
    } catch (e) {
      log(false, 'User exited configure cell Dialog.');
    }
  }

  /**
   * Handle "open" clicks to render the original document's sheet normally
   */
  static async _onClickOpen(entityUuid?: string) {
    if (!entityUuid) {
      return;
    }

    try {
      const relevantDocument = await GmScreenDataManager.getRelevantGmScreenDocument(entityUuid);
      const relevantDocumentSheet = relevantDocument?.sheet;
      log(false, 'trying to edit entity', { relevantEntitySheet: relevantDocumentSheet });

      if (!relevantDocumentSheet) {
        return;
      }

      // If the sheet is already rendered:
      if (relevantDocumentSheet.rendered) {
        relevantDocumentSheet.bringToTop();
        return relevantDocumentSheet.maximize();
      }

      // Otherwise render the relevantDocumentSheet
      else relevantDocumentSheet.render(true);
    } catch (error) {
      log(true, 'error opening entity sheet', error);
    }
  }
}
