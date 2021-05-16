import { log } from '../helpers';
import { TEMPLATES } from '../constants';

export class CompactJournalEntryDisplay extends JournalSheet {
  cellId: string;

  constructor(object, options) {
    super(object, options);
    this.cellId = options.cellId;
  }

  get isEditable() {
    return false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      editable: false,
      popOut: false,
    } as Partial<Application.Options>) as JournalSheet['options'];
  }

  /** @override */
  get template() {
    // @ts-ignore
    if (this._sheetMode === 'image') return ImagePopout.defaultOptions.template;
    return TEMPLATES.compactJournalEntry;
  }

  _replaceHTML(element, html, options) {
    $(this.cellId).find('.gm-screen-grid-cell-title').text(this.title);

    const gridCellContent = $(this.cellId).find('.gm-screen-grid-cell-content');
    //@ts-ignore
    gridCellContent.html(html);
    this._element = html;
  }

  _injectHTML(html, options) {
    $(this.cellId).find('.gm-screen-grid-cell-title').text(this.title);

    const gridCellContent = $(this.cellId).find('.gm-screen-grid-cell-content');

    log(false, 'CompactJournalEntryDisplay _injectHTML', {
      cellId: this.cellId,
      gridCellContent,
      html,
    });

    gridCellContent.append(html);
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
