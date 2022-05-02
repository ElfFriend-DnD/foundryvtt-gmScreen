import { MODULE_ID } from '../../constants';
import { log } from '../../helpers';
import { GmScreen } from '../GmScreen';

/**
 * Apply overrides to make this render inside the provided cellId
 * MUTATES SheetClass
 * BRITTLE
 */
export function applyGmScreenCellSheetOverrides(SheetClass: DocumentSheet, cellId: string) {
  debugger;
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

interface SheetClassDefinition {
  cls: DocumentSheet;
  default: boolean;
  id: string;
  label: string;
}
/**
 * Obtain the FormApplication class constructor which should be used to display this Document in the Gm Screen.
 * Adapted from `ClientDocumentMixin._getSheetClass`
 */
export function _getGmScreenSheetClass(document: Actor | Item | JournalEntry | RollTable) {
  const cfg = CONFIG[document.documentName];

  // @ts-expect-error 'type' is expected to be undefined sometimes
  // this document's type (or "base")
  const type: string = document.data.type || CONST.BASE_DOCUMENT_TYPE;

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

  return coreDefaultSheetClass;
}
