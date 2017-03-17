module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.encoding = 'latin1';
		this.delimiter = '\n';
		this.sendHeader = 'status';
		this.responseHeader = 'print';
		this.isQuake1 = false;
	},
	run: function(state) {
		let self = this;

		this.udpSend('\xff\xff\xff\xff'+this.sendHeader+'\x00',function(buffer) {
			let reader = self.reader(buffer);

			let header = reader.string({length:4});
			if(header != '\xff\xff\xff\xff') return;

			let response;
			if(this.isQuake1) {
				response = reader.string({length:1});
			} else {
				response = reader.string();
			}
			if(response != this.responseHeader) return;

			let info = reader.string().split('\\');
			if(info[0] == '') info.shift();

			while(true) {
				let key = info.shift();
				let value = info.shift();
				if(typeof value == 'undefined') break;
				state.raw[key] = value;
			}

			while(!reader.done()) {
				let line = reader.string();
				if(!line || line.charAt(0) == '\0') break;

				let args = [];
				let split = line.split('"');
				let inQuote = false;
				split.forEach(function(part,i) {
					let inQuote = (i%2 == 1);
					if(inQuote) {
						args.push(part);
					} else {
						let splitSpace = part.split(' ');
						splitSpace.forEach(function(subpart) {
							if(subpart) args.push(subpart);
						});
					}
				});

				let player = {};
				if(self.isQuake1) {
					player.id = parseInt(args.shift());
					player.score = parseInt(args.shift());
					player.time = parseInt(args.shift());
					player.ping = parseInt(args.shift());
					player.name = args.shift();
					player.skin = args.shift();
					player.color1 = parseInt(args.shift());
					player.color2 = parseInt(args.shift());
				} else {
					player.frags = parseInt(args.shift());
					player.ping = parseInt(args.shift());
					player.name = args.shift() || '';
					player.address = args.shift() || '';
				}

				(player.ping ? state.players : state.bots).push(player);
			}

			if('g_needpass' in state.raw) state.password = state.raw.g_needpass;
			if('mapname' in state.raw) state.map = state.raw.mapname;
			if('sv_maxclients' in state.raw) state.maxplayers = state.raw.sv_maxclients;
			if('maxclients' in state.raw) state.maxplayers = state.raw.maxclients;
			if('sv_hostname' in state.raw) state.name = state.raw.sv_hostname;
			if('hostname' in state.raw) state.name = state.raw.hostname;

			self.finish(state);
			return true;
		});
	}
});
