import { log } from '../helpers';
import { TEMPLATES } from '../constants';

export function getCompactGenericEntityDisplay(relevantEntitySheetClass: BaseEntitySheet) {
  //@ts-ignore
  return class CompactGenericEntityDisplay extends relevantEntitySheetClass.constructor {
    targetElement: JQuery<HTMLElement>;

    constructor(options, targetElement: JQuery<HTMLElement>) {
      super(options);
      log(false, 'CompactGenericEntityDisplay constructor', {
        options,
        targetElement,
      });
      this.targetElement = targetElement;
    }

    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        editable: false,
        popOut: false,
      });
    }

    _injectHTML(html, options) {
      log(false, 'CompactGenericEntityDisplay _injectHTML', {
        targetElement: this.targetElement,
        html,
      });
      this.targetElement.append(html);
      //@ts-ignore
      this._element = html;
    }
  };
}
