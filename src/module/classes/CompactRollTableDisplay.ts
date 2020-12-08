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
}
