module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.encoding = 'latin1';
	},
	run: function(state) {
		let self = this;

		this.udpSend('M2MP',function(buffer) {
			let reader = self.reader(buffer);
			
			let header = reader.string({length:4});
			if(header != 'M2MP') return;
			
			state.name = self.readString(reader);
			state.raw.numplayers = self.readString(reader);
			state.maxplayers = self.readString(reader);
			state.raw.gamemode = self.readString(reader);
			state.password = !!reader.uint(1);
			
			while(!reader.done()) {
				let name = self.readString(reader);
				if(!name) break;
				state.players.push({
					name:name
				});
			}
			
			self.finish(state);
			return true;
		});
	},
	readString: function(reader) {
		let length = reader.uint(1);
		return reader.string({length:length-1});
	},
});
