import { log } from '../helpers';
import { TEMPLATES } from '../constants';

export class CompactJournalEntryDisplay extends JournalSheet {
  targetElement: JQuery<HTMLElement>;

  constructor(options, targetElement: JQuery<HTMLElement>) {
    super(options);
    log(false, 'CompactJournalEntryDisplay constructor', {
      options,
      targetElement,
    });
    this.targetElement = targetElement;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      // template: TEMPLATES.compactJournalEntry,
      editable: false,
      popOut: false,
    });
  }

  /** @override */
  get template() {
    // @ts-ignore
    if (this._sheetMode === 'image') return ImagePopout.defaultOptions.template;
    return TEMPLATES.compactJournalEntry;
  }

  _injectHTML(html, options) {
    log(false, 'CompactJournalEntryDisplay _injectHTML', {
      targetElement: this.targetElement,
      html,
    });
    this.targetElement.append(html);
    this._element = html;
  }

  /** @override */
  get id() {
    return `gmscreen-journal-${this.object.id}`;
  }

  // we want no listeners
  /** @override */
  // activateListeners(html) {}
}
