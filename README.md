# GM Screen

![Latest Release Download Count](https://img.shields.io/badge/dynamic/json?label=Downloads@latest&query=assets%5B1%5D.download_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2FElfFriend-DnD%2Ffoundryvtt-gmScreen%2Freleases%2Flatest)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fgm-screen&colorB=4aa94a)
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FElfFriend-DnD%2Ffoundryvtt-gmScreen%2Fmain%2Fsrc%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange)
[![ko-fi](https://img.shields.io/badge/-buy%20me%20a%20coke-%23FF5E5B)](https://ko-fi.com/elffriend)


Creates a Configurable modular grid that GMs can populate with journal entries, rollable tables, etc.

## To Do
- ~~Create an `Application` for the GM Screen~~
- ~~Leverage CSS grids for the table's layout~~
- ~~Allow user to select a Journal Entry for each table cell~~
- Allow user to select a Rollable Table for any given cell
- Render the following in a read-only mode:
  - ~~Journal Entries~~
  - Rollable Tables
- ~~Allow user to change the selected entity for a given cell~~
- ~~Allow user to configure the row/column layout~~
- Allow user to span a cell across multiple cells

## Installation

Module JSON:

```
https://github.com/ElfFriend-DnD/foundryvtt-gmScreen/releases/latest/download/module.json
```

## Configuration

| **Name**         | Description     |
| ---------------- | --------------- |
| **Some Setting** | Does Something. |


## Compatibility

I'm honestly not sure how well this will play with modules that make changes to how journal articles or roll tables interact.

| **Name**                                                      |       Works        | Notes |
| ------------------------------------------------------------- | :----------------: | ----- |
| [OneJournal](https://gitlab.com/fvtt-modules-lab/one-journal) | :heavy-check-mark: |       |
| [MEME](https://github.com/Moerill/fvtt-markdown-editor)       | :heavy-check-mark: |       |

## Known Issues

- Plenty.

## Acknowledgements

Bootstrapped with Nick East's [create-foundry-project](https://gitlab.com/foundry-projects/foundry-pc/create-foundry-project).

Mad props to the [League of Extraordinary FoundryVTT Developers](https://forums.forge-vtt.com/c/package-development/11) community which helped me figure out a lot.
