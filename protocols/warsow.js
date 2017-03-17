module.exports = require('./quake3').extend({
	finalizeState: function(state) {
		this._super(state);
		if(state.players) {
			for(let i = 0; i < state.players.length; i++) {
				let player = state.players[i];
				player.team = player.address;
				delete player.address;
			}
		}
	}
});
