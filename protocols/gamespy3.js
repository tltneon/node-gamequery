let async = require('async');

module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.sessionId = 1;
		this.encoding = 'latin1';
		this.byteorder = 'be';
		this.noChallenge = false;
		this.useOnlySingleSplit = false;
		this.isJc2mp = false;
	},
	run: function(state) {
		let self = this;
		let challenge,packets;

		async.series([
			function(c) {
				if(self.noChallenge) return c();
				self.sendPacket(9,false,false,false,function(buffer) {
					let reader = self.reader(buffer);
					challenge = parseInt(reader.string());
					c();
				});
			},
			function(c) {
				let requestPayload;
				if(self.isJc2mp) {
					// they completely alter the protocol. because why not.
					requestPayload = new Buffer([0xff,0xff,0xff,0x02]);
				} else {
					requestPayload = new Buffer([0xff,0xff,0xff,0x01]);
				}

				self.sendPacket(0,challenge,requestPayload,true,function(b) {
					packets = b;
					c();
				});
			},
			function(c) {
				// iterate over the received packets
				// the first packet will start off with k/v pairs, followed with data fields
				// the following packets will only have data fields

				state.raw.playerTeamInfo = {};

				for(let iPacket = 0; iPacket < packets.length; iPacket++) {
					let packet = packets[iPacket];
					let reader = self.reader(packet);

					if(self.debug) {
						console.log("+++"+packet.toString('hex'));
						console.log(":::"+packet.toString('ascii'));
					}

					// Parse raw server key/values

					if(iPacket == 0) {
						while(!reader.done()) {
							let key = reader.string();
							if(!key) break;
							let value = reader.string();

							// reread the next line if we hit the weird ut3 bug
							if(value == 'p1073741829') value = reader.string();

							state.raw[key] = value;
						}
					}

					// Parse player, team, item array state

					if(self.isJc2mp) {
						state.raw.numPlayers2 = reader.uint(2);
						while(!reader.done()) {
							let player = {};
							player.name = reader.string();
							player.steamid = reader.string();
							player.ping = reader.uint(2);
							state.players.push(player);
						}
					} else {
						let firstMode = true;
						while(!reader.done()) {
							let mode = reader.string();
							if(mode.charCodeAt(0) <= 2) mode = mode.substring(1);
							if(!mode) continue;
							let offset = 0;
							if(iPacket != 0 && firstMode) offset = reader.uint(1);
							reader.skip(1);
							firstMode = false;

							let modeSplit = mode.split('_');
							let modeName = modeSplit[0];
							let modeType = modeSplit.length > 1 ? modeSplit[1] : 'no_';

							if(!(modeType in state.raw.playerTeamInfo)) {
								state.raw.playerTeamInfo[modeType] = [];
							}
							let store = state.raw.playerTeamInfo[modeType];

							while(!reader.done()) {
								let item = reader.string();
								if(!item) break;

								while(store.length <= offset) { store.push({}); }
								store[offset][modeName] = item;
								offset++;
							}
						}
					}
				}

				c();
			},

			function(c) {
				// Turn all that raw state into something useful

				if('hostname' in state.raw) state.name = state.raw.hostname;
				else if('servername' in state.raw) state.name = state.raw.servername;
				if('mapname' in state.raw) state.map = state.raw.mapname;
				if(state.raw.password == '1') state.password = true;
				if('maxplayers' in state.raw) state.maxplayers = parseInt(state.raw.maxplayers);

				if('' in state.raw.playerTeamInfo) {
					state.raw.playerTeamInfo[''].forEach(function(playerInfo) {
						let player = {};
						for(let from in playerInfo) {
							let key = from;
							let value = playerInfo[from];

							if(key == 'player') key = 'name';
							if(key == 'score' || key == 'ping' || key == 'team' || key == 'deaths' || key == 'pid') value = parseInt(value);
							player[key] = value;
						}
						state.players.push(player);
					})
				}

				self.finish(state);
			}
		]);
	},
	sendPacket: function(type,challenge,payload,assemble,c) {
		let self = this;

		let challengeLength = (this.noChallenge || challenge === false) ? 0 : 4;
		let payloadLength = payload ? payload.length : 0;

		let b = new Buffer(7 + challengeLength + payloadLength);
		b.writeUInt8(0xFE, 0);
		b.writeUInt8(0xFD, 1);
		b.writeUInt8(type, 2);
		b.writeUInt32BE(this.sessionId, 3);
		if(challengeLength) b.writeInt32BE(challenge, 7);
		if(payloadLength) payload.copy(b, 7+challengeLength);

		let numPackets = 0;
		let packets = {};
		this.udpSend(b,function(buffer) {
			let reader = self.reader(buffer);
			let iType = reader.uint(1);
			if(iType != type) return;
			let iSessionId = reader.uint(4);
			if(iSessionId != self.sessionId) return;

			if(!assemble) {
				c(reader.rest());
				return true;
			}
			if(self.useOnlySingleSplit) {
				// has split headers, but they are worthless and only one packet is used
				reader.skip(11);
				c([reader.rest()]);
				return true;
			}

			reader.skip(9); // filler data -- usually set to 'splitnum\0'
			let id = reader.uint(1);
			let last = (id & 0x80);
			id = id & 0x7f;
			if(last) numPackets = id+1;

			reader.skip(1); // "another 'packet number' byte, but isn't understood."

			packets[id] = reader.rest();
			if(self.debug) {
				console.log("Received packet #"+id);
				if(last) console.log("(last)");
			}

			if(!numPackets || Object.keys(packets).length != numPackets) return;

			// assemble the parts
			let list = [];
			for(let i = 0; i < numPackets; i++) {
				if(!(i in packets)) {
					self.fatal('Missing packet #'+i);
					return true;
				}
				list.push(packets[i]);
			}
			c(list);
			return true;
		});
	}
});
