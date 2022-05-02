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

  getData() {
    const sheetData = super.getData();

    if (sheetData instanceof Promise) {
      return sheetData;
    }

    // TODO: Rolltable.Result and Results wrong
    const enrichedResults = (sheetData.results as unknown as RollTableConfig.Data['results'][]).map(
      (result: RollTableConfig.Data['results']) => {
        let label: string;

        switch (result.type) {
          case CONST.TABLE_RESULT_TYPES.COMPENDIUM: {
            label = `@Compendium[${result.collection}.${result.resultId}]{${result.text}}`;
            break;
          }
          case CONST.TABLE_RESULT_TYPES.ENTITY: {
            label = `@${result.collection}[${result.resultId}]{${result.text}}`;
            break;
          }
          default:
            label = result.text;
        }

        return {
          ...result,
          label,
        };
      },
    );

    return { ...sheetData, enrichedResults };
  }
}
