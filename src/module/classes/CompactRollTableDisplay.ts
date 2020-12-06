import { log } from '../helpers';
import { TEMPLATES } from '../constants';

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
    // @ts-ignore
    $(html).on(
      'click',
      'a',
      function (e) {
        log(false, 'rolling table', {
          table: this,
        });
        let tableRoll = this.entity.roll();
        const draws = this.entity._getResultsForRoll(tableRoll.roll.total);
        if (draws.length) {
          this.entity.draw(tableRoll);
        }
        e.stopPropegation();
      }.bind(this)
    );

    super.activateListeners(html);
  }
}
