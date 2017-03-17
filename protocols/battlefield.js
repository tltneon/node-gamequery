let async = require('async');

module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.encoding = 'latin1';
	},
	run: function(state) {
		let self = this;
		let decoded;

		async.series([
			function(c) {
				self.query(['serverInfo'], function(data) {
					if(self.debug) console.log(data);
					if(data.shift() != 'OK') return self.fatal('Missing OK');

					state.raw.name = data.shift();
					state.raw.numplayers = parseInt(data.shift());
					state.maxplayers = parseInt(data.shift());
					state.raw.gametype = data.shift();
					state.map = data.shift();
					state.raw.roundsplayed = parseInt(data.shift());
					state.raw.roundstotal = parseInt(data.shift());
					
					let teamCount = data.shift();
					state.raw.teams = [];
					for(let i = 0; i < teamCount; i++) {
						let tickets = parseFloat(data.shift());
						state.raw.teams.push({
							tickets:tickets
						});
					}
					
					state.raw.targetscore = parseInt(data.shift());
					data.shift();
					state.raw.ranked = (data.shift() == 'true');
					state.raw.punkbuster = (data.shift() == 'true');
					state.password = (data.shift() == 'true');
					state.raw.uptime = parseInt(data.shift());
					state.raw.roundtime = parseInt(data.shift());
					if(self.isBadCompany2) {
						data.shift();
						data.shift();
					}
					state.raw.ip = data.shift();
					state.raw.punkbusterversion = data.shift();
					state.raw.joinqueue = (data.shift() == 'true');
					state.raw.region = data.shift();
					if(!self.isBadCompany2) {
						state.raw.pingsite = data.shift();
						state.raw.country = data.shift();
						state.raw.quickmatch = (data.shift() == 'true');
					}
					
					c();
				});
			},
			function(c) {
				self.query(['version'], function(data) {
					if(self.debug) console.log(data);
					if(data[0] != 'OK') return self.fatal('Missing OK');
					
					state.raw.version = data[2];
					
					c();
				});
			},
			function(c) {
				self.query(['listPlayers','all'], function(data) {
					if(self.debug) console.log(data);
					if(data.shift() != 'OK') return self.fatal('Missing OK');

					let fieldCount = parseInt(data.shift());
					let fields = [];
					for(let i = 0; i < fieldCount; i++) {
						fields.push(data.shift());
					}
					let numplayers = data.shift();
					for(let i = 0; i < numplayers; i++) {
						let player = {};
						fields.forEach(function(key) {
							let value = data.shift();

							if(key == 'teamId') key = 'team';
							else if(key == 'squadId') key = 'squad';

							if(
								key == 'kills'
								|| key == 'deaths'
								|| key == 'score'
								|| key == 'rank'
								|| key == 'team'
								|| key == 'squad'
								|| key == 'ping'
								|| key == 'type'
							) {
								value = parseInt(value);
							}

							player[key] = value;
						});
						state.players.push(player);
					}

					self.finish(state);
				});
			}
		]);
	},
	query: function(params,c) {
		let self = this;
		this.tcpSend(buildPacket(params), function(data) {
			let decoded = self.decodePacket(data);
			if(!decoded) return false;
			c(decoded);
			return true;
		});
	},
	decodePacket: function(buffer) {
		if(buffer.length < 8) return false;
		let reader = this.reader(buffer);
		let header = reader.uint(4);
		let totalLength = reader.uint(4);
		if(buffer.length < totalLength) return false;
		
		let paramCount = reader.uint(4);
		let params = [];
		for(let i = 0; i < paramCount; i++) {
			let len = reader.uint(4);
			params.push(reader.string({length:len}));
			let strNull = reader.uint(1);
		}
		return params;
	}
});

function buildPacket(params) {
	let self = this;
	
	let paramBuffers = [];
	params.forEach(function(param) {
		paramBuffers.push(new Buffer(param,'utf8'));
	});

	let totalLength = 12;
	paramBuffers.forEach(function(paramBuffer) {
		totalLength += paramBuffer.length+1+4;
	});

	let b = new Buffer(totalLength);
	b.writeUInt32LE(0,0);
	b.writeUInt32LE(totalLength,4);
	b.writeUInt32LE(params.length,8);
	let offset = 12;
	paramBuffers.forEach(function(paramBuffer) {
		b.writeUInt32LE(paramBuffer.length, offset); offset += 4;
		paramBuffer.copy(b, offset); offset += paramBuffer.length;
		b.writeUInt8(0, offset); offset += 1;
	});

	return b;
}
