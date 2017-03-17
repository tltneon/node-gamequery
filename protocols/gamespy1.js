let async = require('async');

module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.sessionId = 1;
		this.encoding = 'latin1';
		this.byteorder = 'be';
	},
	run: function(state) {
		let self = this;

		async.series([
			function(c) {
				self.sendPacket('info', function(data) {
					state.raw = data;
					if('hostname' in state.raw) state.name = state.raw.hostname;
					if('mapname' in state.raw) state.map = state.raw.mapname;
					if(self.trueTest(state.raw.password)) state.password = true;
					if('maxplayers' in state.raw) state.maxplayers = parseInt(state.raw.maxplayers);
					c();
				});
			},
			function(c) {
				self.sendPacket('rules', function(data) {
					state.raw.rules = data;
					c();
				});
			},
			function(c) {
				self.sendPacket('players', function(data) {
					let players = {};
					let teams = {};
					for(let ident in data) {
						let split = ident.split('_');
						let key = split[0];
						let id = split[1];
						let value = data[ident];

						if(key == 'teamname') {
							teams[id] = value;
						} else {
							if(!(id in players)) players[id] = {};
							if(key == 'playername') key = 'name';
							else if(key == 'team') value = parseInt(value);
							else if(key == 'score' || key == 'ping' || key == 'deaths') value = parseInt(value);
							players[id][key] = value;
						}
					}
					
					state.raw.teams = teams;
					for(let i in players) state.players.push(players[i]);
					self.finish(state);
				});
			}
		]);

	},
	sendPacket: function(type,callback) {
		let self = this;
		let queryId = '';
		let output = {};
		this.udpSend('\\'+type+'\\',function(buffer) {
			let reader = self.reader(buffer);
			let str = reader.string({length:buffer.length});
			let split = str.split('\\');
			split.shift();
			let data = {};
			while(split.length) {
				let key = split.shift();
				let value = split.shift() || '';
				data[key] = value;
			}
			if(!('queryid' in data)) return;
			if(queryId && data.queryid != queryId) return;
			for(let i in data) output[i] = data[i];
			if('final' in output) {
				delete output.final;
				delete output.queryid;
				callback(output);
				return true;
			}
		});
	}
});
