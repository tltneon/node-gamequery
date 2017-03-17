let async = require('async');

module.exports = require('./core').extend({
	init: function() {
		this._super();
		this.options.tcpTimeout = 5000;
	},
	run: function(state) {
		let self = this;
		
		this.tcpSend('json', function(buffer) {
			if(buffer.length < 10) return;
			let str = buffer.toString();
			let json;
			try {
				json = JSON.parse(str);
			} catch(e) {
				// probably not all here yet
				return;
			}
			
			state.raw = json;
			state.name = json.name;
			
			let channelStack = [state.raw.root];
			while(channelStack.length) {
				let channel = channelStack.shift();
				channel.description = self.cleanComment(channel.description);
				channelStack = channelStack.concat(channel.channels);
				for(let i = 0; i < channel.users.length; i++) {
					let user = channel.users[i];
					user.comment = self.cleanComment(user.comment);
					state.players.push(user);
				}
			}
			
			self.finish(state);
			return true;
		});
	},
	cleanComment: function(str) {
		return str.replace(/<.*>/g,'');
	}
});
