const request = require('request');

module.exports = require('./core').extend({
	run: function(state) {
		let self = this;
		request({
			uri: 'http://mutantfactions.net/game/receiveLobby.php',
			timeout: 3000,
		}, function(e,r,body) {
			if(e) return self.fatal('Lobby request error');

			let split = body.split('<br/>');

			let found = false;
			for(let i = 0; i < split.length; i++) {
				let line = split[i];
				let fields = line.split('::');
				let ip = fields[2];
				let port = fields[3];
				if(ip == self.options.address && port == self.options.port) {
					found = fields;
					break;
				}
			}

			if(!found) return self.fatal('Server not found in list');

			state.raw.countrycode = fields[0];
			state.raw.country = fields[1];
			state.name = fields[4];
			state.map = fields[5];
			state.raw.numplayers = fields[6];
			state.maxplayers = fields[7];
			// fields[8] is unknown?
			state.raw.rules = fields[9];
			state.raw.gamemode = fields[10];
			state.raw.gangsters = fields[11];
			state.raw.cashrate = fields[12];
			state.raw.missions = fields[13];
			state.raw.vehicles = fields[14];
			state.raw.customweapons = fields[15];
			state.raw.friendlyfire = fields[16];
			state.raw.mercs = fields[17];
			// fields[18] is unknown? listen server?
			state.raw.version = fields[19];

			for(let i = 0; i < state.raw.numplayers; i++) {
				state.players.push({});
			}

			self.finish(state);
		});
	}
});
