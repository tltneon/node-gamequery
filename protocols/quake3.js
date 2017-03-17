module.exports = require('./quake2').extend({
	init: function() {
		this._super();
		this.sendHeader = 'getstatus';
		this.responseHeader = 'statusResponse';
	},
	finalizeState: function(state) {
		state.name = this.stripColors(state.name);
		for(let i in state.raw) {
			state.raw[i] = this.stripColors(state.raw[i]);
		}
		for(let i = 0; i < state.players.length; i++) {
			state.players[i].name = this.stripColors(state.players[i].name);
		}
	},
	stripColors: function(str) {
		return str.replace(/\^(X.{6}|.)/g,'');
	}
});
