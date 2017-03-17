module.exports = require('./gamespy2').extend({
	finalizeState: function(state) {
		this._super(state);
		state.name = this.stripColor(state.name);
		state.map = this.stripColor(state.map);
		for(let i in state.raw) {
			if(!(typeof state.raw[i] == 'string')) continue;
			state.raw[i] = this.stripColor(state.raw[i]);
		}
		for(let i = 0; i < state.players.length; i++) {
			let player = state.players[i];
			if(!('name' in player)) continue;
			player.name = this.stripColor(player.name);
		}
	},
	stripColor: function(str) {
		// uses unreal 2 color codes
		return str.replace(/\x1b...|[\x00-\x1a]/g,'');
	}
});
