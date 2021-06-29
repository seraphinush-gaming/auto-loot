```
Support seraph via donations, thanks in advance !
```

# auto-loot [![](https://img.shields.io/badge/paypal-donate-333333.svg?colorA=0070BA&colorB=333333)](https://www.paypal.me/seraphinush) [![](https://img.shields.io/badge/patreon-pledge-333333.svg?colorA=F96854&colorB=333333)](https://www.patreon.com/seraphinush)
tera-toolbox module to loot items automatically

## Auto-update guide
- Create a folder called `auto-loot` in `tera-toolbox/mods` and download >> [`module.json`](https://raw.githubusercontent.com/seraphinush-gaming/auto-loot/master/module.json) << (right-click this link and save link as..) into the folder

## Usage
- `loot`
  - Toggle

### Arguments
- `blacklist`
  - `add <id | chat link>`
    - Add item to blacklist
    - eg. `blacklist add <Essential Mana>`
  - `list`
    - Print blacklist to console
  - `rm <id | chat link>`
    - Remove item from blacklist
    - eg. `blacklist rm <Essential Mana>`
- `combat`
  - Toggle looting in combat
- `recent`
  - Print recently looted item to console
- `set`
  - `delay <num>`
    - Set loot interval to `num` ms
  - `interval <num>`
    - Set scan interval to `num` ms
- `?`
  - Send command and arguments to chat

## Changelog
<details>

    1.00
    - Initial online commit

</details>