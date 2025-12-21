# limelight

Limelight is a VSCode extension that helps to focus on a specific part of the code and puts the rest
in the backgrounnd.

## Features

Focus on the code you want to see and nothing else.

- Block Focus
![Block Focus](resources/block.png)

- Custom Selection Focus
![Custom Selection Focus](resources/selection.png)

## Installation
- VSCode Makretplace: https://marketplace.visualstudio.com/items?itemName=fischi20.limelight-focus

## Default Key Bindings
- `Ctrl+Alt+W` if there is a selection, highlight that selection, otherwhise highlight the block where the cursor is in
- escape Drop the selection

## Extension Settings

- `limelight.opacity` (default: 0.1): Opacity of the dimmed code
- `limelight.lightThemeColor` (default: rgb(0, 0, 0)): Color of the dimmed code in light theme (CSS color format)
- `limelight.darkThemeColor` (default: rgb(255, 255, 255)): Color of the dimmed code in dark theme (CSS color format)
- `limelight.persistOnTabSwitch` (default: true): Whether to persist the limelight effect when switching to other files/tabs


