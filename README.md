# GM Screen

![Latest Release Download Count](https://img.shields.io/badge/dynamic/json?label=Downloads@latest&query=assets%5B1%5D.download_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2FElfFriend-DnD%2Ffoundryvtt-gmScreen%2Freleases%2Flatest)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fgm-screen&colorB=4aa94a)
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FElfFriend-DnD%2Ffoundryvtt-gmScreen%2Fmain%2Fsrc%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange)
[![ko-fi](https://img.shields.io/badge/-buy%20me%20a%20coke-%23FF5E5B)](https://ko-fi.com/elffriend)
[![patreon](https://img.shields.io/badge/-patreon-%23FF424D)](https://www.patreon.com/ElfFriend_DnD)


Creates a Configurable modular grid that GMs can populate with journal entries, rollable tables, actors, and items.

## Installation

Module JSON:

```
https://github.com/ElfFriend-DnD/foundryvtt-gmScreen/releases/latest/download/module.json
```

## Screenshots

![Demonstration of the GM Screen Grid with dnd5e content.](readme-img/dnd5e-demo.jpg)

## Configuration

| **Name**                      | Default | Description                                                                                                                                         |
| ----------------------------- | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display as Drawer**         |  true   | Controls whether the GM Screen appears as a normal popup dialog or as a drawer. To use the PopOut module with the GM Screen, this needs to checked. |
| **Columns**                   |    4    | Sets the number of columns in the grid.                                                                                                             |
| **Rows**                      |    3    | Sets the number of rows in the grid.                                                                                                                |
| Drawer Only: **Right Margin** |  0(vw)  | Sets the offest from the sidebar to the right side of the GM Screen. This number affects the maximum possible width of the screen.                  |
| Drawer Only: **Height**       | 60(vh)  | Sets the height of the GM Screen Drawer.                                                                                                            |
| Drawer Only: **Width**        | 100(%)  | Calculated as a percentage of the available screen width after the sidebar and right margin are taken into account.                                 |
| Drawer Only: **Opacity**      | 100(%)  | Controls how opaque the drawer is.                                                                                                                  |
| **Reset Grid**                |  false  | Saving with this checkbox checked will reset the grid (useful if you end up somehow causing it to fail to render).                                  |

Note that changing the grid dimensions after populating the grid might cause unexpected results, and odds are you will have to clear the grid and repopulate things.

## Compatibility

I'm honestly not sure how well this will play with modules that make changes to how journal articles or roll tables interact.

| **Name**                                                               |       Works        | Notes                                            |
| ---------------------------------------------------------------------- | :----------------: | ------------------------------------------------ |
| [OneJournal](https://gitlab.com/fvtt-modules-lab/one-journal)          | :heavy_check_mark: | Works as expected.                               |
| [MEME](https://github.com/Moerill/fvtt-markdown-editor)                | :heavy_check_mark: | Markdown Renders as expected.                    |
| [Inline Webviewer](https://github.com/ardittristan/VTTInlineWebviewer) | :heavy_check_mark: | Jounrnal entries with webviews work as expected. |

## API

After the hook `gmScreenReady` is fired, the following api methods are expected to be on `window['gm-screen']`:
### `toggleGmScreenVisibility(isOpen: boolean)`

Opens or Closes the GM Screen. By default will toggle the current state.

```js
window['gm-screen'].toggleGmScreenVisibility(false); // always closes
window['gm-screen'].toggleGmScreenVisibility(true); // always opens
window['gm-screen'].toggleGmScreenVisibility(); // always toggles
```


### `Hooks.callAll('gmScreenOpenClose', cb)`

This hook is called when the GM Screen Opens of Closes with the following as the callback:

```ts
(app: Application, options: {isOpen: true}) => void
```

## Known Issues

- The grid does not refresh automatically when settings are changed, click the "refresh" button.
- It is possible to overlap your cells with column/row spanning. It should not be possible to make it so you cannot recover from such a situation manually.

## Acknowledgements

Bootstrapped with Nick East's [create-foundry-project](https://gitlab.com/foundry-projects/foundry-pc/create-foundry-project).

Mad props to the [League of Extraordinary FoundryVTT Developers](https://forums.forge-vtt.com/c/package-development/11) community which helped me figure out a lot.
