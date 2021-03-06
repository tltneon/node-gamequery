let async = require('async');

module.exports = require('./core').extend({
	run: function(state) {
		let self = this;

		async.series([
			function(c) {
				self.sendCommand('sel '+self.options.port, function(data) {
					if(data != '[TS]') self.fatal('Invalid header');
					c();
				});
			},
			function(c) {
				self.sendCommand('si', function(data) {
					let split = data.split('\r\n');
					split.forEach(function(line) {
						let equals = line.indexOf('=');
						let key = equals == -1 ? line : line.substr(0,equals);
						let value = equals == -1 ? '' : line.substr(equals+1);
						state.raw[key] = value;
					});
					c();
				});
			},
			function(c) {
				self.sendCommand('pl', function(data) {
					let split = data.split('\r\n');
					let fields = split.shift().split('\t');
					split.forEach(function(line) {
						let split2 = line.split('\t');
						let player = {};
						split2.forEach(function(value,i) {
							let key = fields[i];
							if(!key) return;
							if(key == 'nick') key = 'name';
							if(m = value.match(/^"(.*)"$/)) value = m[1];
							player[key] = value;
						});
						state.players.push(player);
					});
					c();
				});
			},
			function(c) {
				self.sendCommand('cl', function(data) {
					let split = data.split('\r\n');
					let fields = split.shift().split('\t');
					state.raw.channels = [];
					split.forEach(function(line) {
						let split2 = line.split('\t');
						let channel = {};
						split2.forEach(function(value,i) {
							let key = fields[i];
							if(!key) return;
							if(m = value.match(/^"(.*)"$/)) value = m[1];
							channel[key] = value;
						});
						state.raw.channels.push(channel);
					});
					c();
				});
			},
			function(c) {
				self.finish(state);
			}
		]);
	},
	sendCommand: function(cmd,c) {
		this.tcpSend(cmd+'\x0A', function(buffer) {
			if(buffer.length < 6) return;
			if(buffer.slice(-6).toString() != '\r\nOK\r\n') return;
			c(buffer.slice(0,-6).toString());
			return true;
		});
	}
});
