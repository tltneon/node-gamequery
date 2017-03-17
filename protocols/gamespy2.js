module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.sessionId = 1;
		this.encoding = 'latin1';
		this.byteorder = 'be';
	},
	run: function(state) {
		let self = this;

		let request = new Buffer([0xfe,0xfd,0x00,0x00,0x00,0x00,0x01,0xff,0xff,0xff]);
		let packets = [];
		this.udpSend(request,
			function(buffer) {
				if(packets.length && buffer.readUInt8(0) == 0)
					buffer = buffer.slice(1);
				packets.push(buffer);
			},
			function() {
				let buffer = Buffer.concat(packets);
				let reader = self.reader(buffer);
				let header = reader.uint(1);
				if(header != 0) return;
				let pingId = reader.uint(4);
				if(pingId != 1) return;
				
				while(!reader.done()) {
					let key = reader.string();
					let value = reader.string();
					if(!key) break;
					state.raw[key] = value;
				}
				
				if('hostname' in state.raw) state.name = state.raw.hostname;
				if('mapname' in state.raw) state.map = state.raw.mapname;
				if(self.trueTest(state.raw.password)) state.password = true;
				if('maxplayers' in state.raw) state.maxplayers = parseInt(state.raw.maxplayers);

				state.players = self.readFieldData(reader);
				state.raw.teams = self.readFieldData(reader);

				self.finish(state);
				return true;
			}
		);
	},
	readFieldData: function(reader) {
		let count = reader.uint(1);
		// count is unreliable (often it's wrong), so we don't use it.
		// read until we hit an empty first field string
		
		if(this.debug) console.log("Reading fields, starting at: "+reader.rest());

		let fields = [];
		while(!reader.done()) {
			let field = reader.string();
			if(!field) break;
			if(field.charCodeAt(0) <= 2) field = field.substring(1);
			fields.push(field);
			if(this.debug) console.log("field:"+field);
		}

		let units = [];
		outer: while(!reader.done()) {
			let unit = {};
			for(let iField = 0; iField < fields.length; iField++) {
				let key = fields[iField];
				let value = reader.string();
				if(!value && iField == 0) break outer;
				if(this.debug) console.log("value:"+value);
				if(key == 'player_') key = 'name';
				else if(key == 'score_') key = 'score';
				else if(key == 'deaths_') key = 'deaths';
				else if(key == 'ping_') key = 'ping';
				else if(key == 'team_') key = 'team';
				else if(key == 'kills_') key = 'kills';
				else if(key == 'team_t') key = 'name';
				else if(key == 'tickets_t') key = 'tickets';
				
				if(
					key == 'score' || key == 'deaths'
					|| key == 'ping' || key == 'team'
					|| key == 'kills' || key == 'tickets'
				) {
					if(value === '') continue;
					value = parseInt(value);
				}

				unit[key] = value;
			}
			units.push(unit);
		}

		return units;
	}
});
