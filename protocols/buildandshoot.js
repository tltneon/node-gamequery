const request = require('request');

module.exports = require('./core').extend({
	run: function(state) {
		const self = this;
		request({
			uri: 'http://'+this.options.address+':'+this.options.port_query+'/',
			timeout: 3000,
		}, (e,r,body) => {
			if(e) {return self.fatal('HTTP error');}

			let m = body.match(/status server for (.*?)\r|\n/);
			if(m) {state.name = m[1];}

			let m = body.match(/Current uptime: (\d+)/);
			if(m) {state.raw.uptime = m[1];}
			
			let m = body.match(/currently running (.*?) by /);
			if(m) {state.map = m[1];}
			
			let m = body.match(/Current players: (\d+)\/(\d+)/);
			if(m) {
				state.raw.numplayers = m[1];
				state.maxplayers = m[2];
			}

			let m = body.match(/class="playerlist"([^]+?)\/table/);
			if(m) {
				const table = m[1];
				const pre = /<tr>[^]*<td>([^]*)<\/td>[^]*<td>([^]*)<\/td>[^]*<td>([^]*)<\/td>[^]*<td>([^]*)<\/td>/g;
				while(pm = pre.exec(table)) {
					if(pm[2] == 'Ping') {continue;}
					state.players.push({
						name: pm[1],
						ping: pm[2],
						team: pm[3],
						score: pm[4]
					});
				}
			}
			
			self.finish(state);
		});
	}
});
