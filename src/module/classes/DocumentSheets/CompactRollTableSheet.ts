import { GmScreen } from '../GmScreen';

export class CompactRollTableDisplay extends RollTableConfig {
  get isEditable() {
    return false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: GmScreen.TEMPLATES.compactRollTable,
      editable: false,
      popOut: false,
    });
  }

  async getData() {
    const sheetData = await super.getData();

    // TODO: Rolltable.Result and Results wrong
    const enrichedResults = (sheetData.results as unknown as RollTableConfig.Data['results'][]).map(
      (result: RollTableConfig.Data['results']) => {
        const label = this._getLabelFromResult(result);
        return {
          ...result,
          label,
        };
      },
    );

    return { ...sheetData, enrichedResults };
  }

  async _rollOnTable() {
    const rollTable = this.document as RollTable;
    await rollTable.draw();
  }

  private _getLabelFromResult(result) {
    let label;
    switch (result.type) {
      case CONST.TABLE_RESULT_TYPES.COMPENDIUM: {
        label = `@Compendium[${result.documentCollection}.${result.documentId}]{${result.text}}`;
        break;
      }
      case CONST.TABLE_RESULT_TYPES.DOCUMENT: {
        label = `@UUID[${result.documentCollection}.${result.documentId}]{${result.text}}`;
        break;
      }
      default:
        label = result.text;
    }
    return label;
  }

  activateListeners(html) {
    DocumentSheet.prototype.activateListeners.call(this, html);
  }
}
