let letint = require('letint'),
	async = require('async');

function letIntBuffer(num) {
	return new Buffer(letint.encode(num));
}
function buildPacket(id,data) {
	if(!data) data = new Buffer(0);
	let idBuffer = letIntBuffer(id);
	return Buffer.concat([
		letIntBuffer(data.length+idBuffer.length),
		idBuffer,
		data
	]);
}

module.exports = require('./core').extend({
	run: function(state) {
		let self = this;
		let receivedData;

		async.series([
			function(c) {
				// build and send handshake and status TCP packet

				let portBuf = new Buffer(2);
				portBuf.writeUInt16BE(self.options.port_query,0);

				let addressBuf = new Buffer(self.options.address,'utf8');

				let bufs = [
					letIntBuffer(4),
					letIntBuffer(addressBuf.length),
					addressBuf,
					portBuf,
					letIntBuffer(1)
				];

				let outBuffer = Buffer.concat([
					buildPacket(0,Buffer.concat(bufs)),
					buildPacket(0)
				]);

				self.tcpSend(outBuffer, function(data) {
					if(data.length < 10) return false;
					let expected = letint.decode(data);
					data = data.slice(letint.decode.bytes);
					if(data.length < expected) return false;
					receivedData = data;
					c();
					return true;
				});
			},
			function(c) {
				// parse response

				let data = receivedData;
				let packetId = letint.decode(data);
				if(self.debug) console.log("Packet ID: "+packetId);
				data = data.slice(letint.decode.bytes);

				let strLen = letint.decode(data);
				if(self.debug) console.log("String Length: "+strLen);
				data = data.slice(letint.decode.bytes);

				let str = data.toString('utf8');
				if(self.debug) {
					console.log(str);
				}

				let json;
				try {
					json = JSON.parse(str);
					delete json.favicon;
				} catch(e) {
					return self.fatal('Invalid JSON');
				}

				state.raw.version = json.version.name;
				state.maxplayers = json.players.max;
				state.raw.description = json.description.text;
				if(json.players.sample) {
					for(let i = 0; i < json.players.sample.length; i++) {
						state.players.push({
							id: json.players.sample[i].id,
							name: json.players.sample[i].name
						});
					}
				}
				while(state.players.length < json.players.online) {
					state.players.push({});
				}

				self.finish(state);
			}
		]);
	}
});
