module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.encoding = 'latin1';
		this.byteorder = 'be';
	},
	run: function(state) {
		let self = this;

		let b = new Buffer([0,0x35,0,0,0,0,0,0x11]);

		this.udpSend(b,function(buffer) {
			let reader = self.reader(buffer);

			reader.skip(6);

			state.raw.port = self.readUInt(reader);
			state.raw.hostname = self.readString(reader,buffer);
			state.name = self.stripColorCodes(self.readString(reader,buffer));
			state.raw.numplayers = self.readUInt(reader);
			state.raw.versionmin = self.readUInt(reader);
			state.raw.versionmax = self.readUInt(reader);
			state.raw.version = self.readString(reader,buffer);
			state.maxplayers = self.readUInt(reader);

			let players = self.readString(reader,buffer);
			let list = players.split('\n');
			for(let i = 0; i < list.length; i++) {
				if(!list[i]) continue;
				state.players.push({
					name:self.stripColorCodes(list[i])
				});
			}

			state.raw.options = self.stripColorCodes(self.readString(reader,buffer));
			state.raw.uri = self.readString(reader,buffer);
			state.raw.globalids = self.readString(reader,buffer);
			self.finish(state);
			return true;
		});
	},
	readUInt: function(reader) {
		let a = reader.uint(2);
		let b = reader.uint(2);
		return (b<<16) + a;
	},
	readString: function(reader,b) {
		let len = reader.uint(2);
		if(!len) return '';

		let out = '';
		for(let i = 0; i < len; i+=2) {
			let hi = reader.uint(1);
			let lo = reader.uint(1);
			if(i+1<len) out += String.fromCharCode(lo);
			if(i+2<len) out += String.fromCharCode(hi);
		}

		return out;
	},
	stripColorCodes: function(str) {
		return str.replace(/0x[0-9a-f]{6}/g,'');
	}
});
