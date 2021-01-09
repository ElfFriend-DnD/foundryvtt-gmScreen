import { log } from '../helpers';
import { TEMPLATES } from '../constants';

interface RollableTableData {
  results: {
    type: Number;
    isText: boolean;
    isEntity: boolean;
    isCompendium: boolean;
    text: string;
    resultId?: string;
    collection?: string;
  }[];
}

export class CompactRollTableDisplay extends RollTableConfig {
  targetElement: JQuery<HTMLElement>;

  constructor(options, targetElement: JQuery<HTMLElement>) {
    super(options);
    log(false, 'CompactRollTableDisplay constructor', {
      options,
      targetElement,
    });
    this.targetElement = targetElement;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: TEMPLATES.compactRollTable,
      editable: false,
      popOut: false,
    });
  }

  _injectHTML(html, options) {
    log(false, 'CompactRollTableDisplay _injectHTML', {
      targetElement: this.targetElement,
      html,
    });
    this.targetElement.append(html);
    this._element = html;
  }

  activateListeners(html) {
    $(html).on(
      'click',
      'a',
      function (e) {
        const action = e.currentTarget.dataset.action;

        log(false, 'CompactRollTableDisplay click registered', {
          table: this,
          action,
        });

        switch (action) {
          case 'rolltable-reset': {
            this.entity.reset();
            break;
          }
          case 'rolltable': {
            let tableRoll = this.entity.roll();
            const draws = this.entity._getResultsForRoll(tableRoll.roll.total);
            if (draws.length) {
              this.entity.draw(tableRoll);
            }
            break;
          }
        }
      }.bind(this)
    );

    // we purposefully are not calling
    // super.activateListeners(html);
  }

  //@ts-ignore
  getData() {
    const sheetData = super.getData() as RollableTableData;

    const enrichedResults = sheetData.results.map((result) => {
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
    });

    return { ...sheetData, enrichedResults };
  }
}
