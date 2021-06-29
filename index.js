'use strict';

const REGEX_ID = /#(\d+)@/;

class AutoLoot {

  constructor(mod) {

    this.mod = mod;
    this.command = mod.command;
    this.hooks = [];
    this.loaded = false;

    // init
    this.dropitem = new Map();
    this.recentDropitem = new Map();
    this.interval = null;
    this.location = null;
    this.timeout = null;

    mod.command.add('loot', {
      '$none': () => {
        mod.settings.enabled = !mod.settings.enabled;
        if (mod.settings.enabled) {
          if (this.dropitem.size > 0) this.set_lootInterval();
        }
        else {
          this.unset_lootInterval();
          this.unset_lootTimeout();
        }
        this.send(`${mod.settings.enabled ? 'En' : 'Dis'}abled`);
      },
      'blacklist': {
        'add': async (id) => {
          if (!id)
            return this.send(`Invalid argument. usage : loot blacklist add &lt;item id | chat link&gt;`);

          (!isNaN(parseInt(id))) ? id = parseInt(id) : id = await this.get_chatLinkId(id);
          mod.settings.blacklist.push(id);
          let name = mod.game.data.items.get(id) ? mod.game.data.items.get(id).name : 'undefined';
          this.send(`Added &lt;${name}&gt; to blacklist.`);
        },
        'list': () => {
          mod.log(`Blacklist :`);
          mod.settings.blacklist.sort((a, b) => parseInt(a) - parseInt(b));
          mod.settings.blacklist = Array.from(new Set(mod.settings.blacklist));
          mod.settings.blacklist.forEach((item) => {
            let name = mod.game.data.items.get(item) ? mod.game.data.items.get(item).name : 'undefined';
            console.log('- ' + item + ' : ' + name);
          });
          this.send(`Exported blacklist to console.`);
        },
        'rm': async (id) => {
          if (!id)
            return this.send(`Invalid argument. usage : loot blacklist rm &lt;item id | chat link&gt;`);

          (!isNaN(parseInt(id))) ? id = parseInt(id) : id = await this.get_chatLinkId(id);
          mod.settings.blacklist.splice(mod.settings.blacklist.indexOf(id), 1);
          let name = mod.game.data.items.get(id) ? mod.game.data.items.get(id).name : 'undefined';
          this.send(`Removed &lt;${name}&gt; from blacklist.`);
        },
        '$default': () => this.send(`Invalid argument. usage : loot blacklist [add|list|rm]`)
      },
      'combat': () => {
        mod.settings.lootInCombat = !mod.settings.lootInCombat
        this.send(`Looting in combat ${mod.settings.lootInCombat ? 'en' : 'dis'}abled.`);
      },
      'recent': () => {
        mod.log(`Recently looted item :`);
        for (let item of [...this.recentDropitem.values()].sort((a, b) => b.date - a.date)) {
          let name = mod.game.data.items.get(item.id) ? mod.game.data.items.get(item.id).name : 'undefined';
          let time = Math.floor(((Date.now() - item.date) / 1000) / 60);
          console.log('- ' + item.id + ' : ' + name + ' (' + time + 'min ago)');
        }
        this.send(`Exported recently looted item to console.`);
      },
      'set': {
        'delay': (num) => {
          num = parseInt(num);
          if (isNaN(num))
            return this.send(`Invalid argument. usage : loot set delay &lt;num&gt;`);
          mod.settings.lootTimeout = num;
          this.send(`Set loot interval to ${num} ms.`);
        },
        'interval': (num) => {
          num = parseInt(num);
          if (isNaN(num))
            return this.send(`Invalid argument. usage : loot set interval &lt;num&gt;`);
          mod.settings.lootInterval = num;
          this.send(`Set scan interval to ${num} ms.`);
        },
        '$default': () => this.send(`Invalid argument. usage : loot set [delay|interval] &lt;num&gt;`)
      },
      '?': () => this.send(`Usage : loot [blacklist|combat|recent|set]`),
      '$default': () => this.send(`Invalid argument. usage : loot [blacklist|combat|recent|set|?]`)
    });

    // game state
    mod.game.on('enter_loading_screen', () => {
      this.unset_lootInterval();
      this.unset_lootTimeout();
      this.dropitem.clear();
      this.location = null;
    });

    this.load();

  }

  destructor() {
    this.command.remove('loot');
    this.unset_lootInterval();
    this.unset_lootTimeout();
    this.unload();

    this.loaded = undefined;
    this.hooks = undefined;
    this.command = undefined;
    this.mod = undefined;
  }

  // helper
  set_lootInterval() {
    this.interval = this.mod.setInterval(this.loot.bind(this), this.mod.settings.lootInterval);
  }

  unset_lootInterval() {
    this.mod.clearInterval(this.interval);
    this.interval = null;
  }

  set_lootTimeout() {
    this.timeout = this.mod.setTimeout(this.loot.bind(this), this.mod.settings.lootTimeout);
  }

  unset_lootTimeout() {
    this.mod.clearTimeout(this.timeout);
    this.timeout = null;
  }

  loot() {
    if (!this.mod.settings.lootInCombat && this.mod.game.me.inCombat) return;
    if (this.mod.game.me.mounted) return;
    if (!this.location) return;
    let looted = false;

    for (let item of [...this.dropitem.values()].sort((a, b) => a.priority - b.priority)) {
      if (this.location.dist3D(item.loc) <= 120) {
        this.mod.send('C_TRY_LOOT_DROPITEM', 4, { gameId: item.gameId });
        this.recentDropitem.set(item.item, Object.assign({}, { id: item.item, date: Date.now() }));
        this.dropitem.set(item.gameId, Object.assign(item, { priority: ++item.priority }));
        looted = true;
        break;
      }
    }

    if (looted) {
      if (!!this.interval) this.unset_lootInterval();
      this.set_lootTimeout();
    } else {
      if (!this.interval) this.set_lootInterval();
    }
  }

  get_chatLinkId(chatLink) {
    return new Promise((resolve) => {
      let res = chatLink.match(REGEX_ID);
      res = parseInt(res[1]);
      resolve(res);
    });
  }

  // code
  hook() {
    this.hooks.push(this.mod.hook(...arguments));
  }

  load() {
    this.hook('C_PLAYER_LOCATION', 5, (e) => { this.location = e.loc; });

    this.hook('S_SPAWN_DROPITEM', 9, (e) => {
      if (this.mod.settings.blacklist.includes(e.item)) return;
      this.dropitem.set(e.gameId, Object.assign(e, { priority: 0 }));
      if (!this.mod.settings.enabled) return;
      if (!this.interval && !this.timeout) {
        this.set_lootInterval();
        this.testTimer = Date.now();
      }
    });

    this.hook('S_DESPAWN_DROPITEM', 4, (e) => {
      this.dropitem.delete(e.gameId);
      if (!this.mod.settings.enabled) return;
      if (this.dropitem.size === 0) {
        this.unset_lootTimeout();
        this.unset_lootInterval();
      }
    });

    this.loaded = true;
  }

  unload() {
    if (this.hooks.length) {
      for (let h of this.hooks)
        this.mod.unhook(h);
      this.hooks = [];
    }

    this.loaded = false;
  }

  send(msg) { this.command.message(': ' + msg); }

}

module.exports = { NetworkMod: AutoLoot };