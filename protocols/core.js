let EventEmitter = require('events').EventEmitter,
	dns = require('dns'),
	net = require('net'),
	async = require('async'),
	Class = require('../lib/extend'),
	Reader = require('../lib/reader');

module.exports = Class.extend(EventEmitter,{
	init: function() {
		this._super();
		this.options = {
			tcpTimeout: 1000,
			udpTimeout: 1000
		};
		this.maxAttempts = 1;
		this.attempt = 1;
		this.finished = false;
		this.encoding = 'utf8';
		this.byteorder = 'le';
		this.delimiter = '\0';

		const self = this;
		this.globalTimeoutTimer = setTimeout(() => {
			self.fatal('timeout');
		},10000);
	},

	fatal: function(err,noretry) {
		if(!noretry && this.attempt < this.maxAttempts) {
			this.attempt++;
			this.start();
			return;
		}

		this.done({error: err.toString()});
	},
	initState: function() {
		return {
			name: '',
			map: '',
			password: false,

			raw: {},

			maxplayers: 0,
			players: [],
			bots: []
		};
	},
	finalizeState: function(state) {},

	finish: function(state) {
		this.finalizeState(state);
		this.done(state);
	},

	done: function(state) {
		if(this.finished) {return;}
		clearTimeout(this.globalTimeoutTimer);

		if(this.options.notes)
			{state.notes = this.options.notes;}

		state.query = {};
		if('host' in this.options) {state.query.host = this.options.host;}
		if('address' in this.options) {state.query.address = this.options.address;}
		if('port' in this.options) {state.query.port = this.options.port;}
		if('port_query' in this.options) {state.query.port_query = this.options.port_query;}
		state.query.type = this.type;
		if('pretty' in this) {state.query.pretty = this.pretty;}

		this.reset();
		this.finished = true;
		this.emit('finished',state);
		if(this.options.callback) {this.options.callback(state);}
	},

	reset: function() {
		if(this.timers) {
			this.timers.forEach((timer) => {
				clearTimeout(timer);
			});
		}
		this.timers = [];

		if(this.tcpSocket) {
			this.tcpSocket.destroy();
			delete this.tcpSocket;
		}

		this.udpTimeoutTimer = false;
		this.udpCallback = false;
	},
	start: function() {
		const self = this;
		const options = self.options;
		this.reset();

		async.series([
			function(c) {
				// resolve host names
				if(!('host' in options)) {return c();}
				if(options.host.match(/\d+\.\d+\.\d+\.\d+/)) {
					options.address = options.host;
					c();
				} else {
					self.parseDns(options.host,c);
				}
			},
			function(c) {
				// calculate query port if needed
				if(!('port_query' in options) && 'port' in options) {
					const offset = options.port_query_offset || 0;
					options.port_query = options.port + offset;
				}
				c();
			},
			function(c) {
				// run
				self.run(self.initState());
			}

		]);
	},
	parseDns: function(host,c) {
		const self = this;

		function resolveStandard(host,c) {
			dns.lookup(host, (err,address,family) => {
				if(err) {return self.fatal(err);}
				self.options.address = address;
				c();
			});
		}
		function resolveSrv(srv,host,c) {
			dns.resolve(srv+'.'+host, 'SRV', (err,addresses) => {
				if(err) {return resolveStandard(host,c);}
				if(addresses.length >= 1) {
					const line = addresses[0];
					self.options.port = line.port;
					const srvhost = line.name;

					if(srvhost.match(/\d+\.\d+\.\d+\.\d+/)) {
						self.options.address = srvhost;
						c();
					} else {
						// resolve yet again
						resolveStandard(srvhost,c);
					}
					return;
				}
				return resolveStandard(host,c);
			});
		}

		if(this.srvRecord) {resolveSrv(this.srvRecord,host,c);}
		else {resolveStandard(host,c);}
	},

	// utils
	reader: function(buffer) {
		return new Reader(this,buffer);
	},
	translate: function(obj,trans) {
		for(const from in trans) {
			const to = trans[from];
			if(from in obj) {
				if(to) {obj[to] = obj[from];}
				delete obj[from];
			}
		}
	},
	setTimeout: function(c,t) {
		if(this.finished) {return 0;}
		const id = setTimeout(c,t);
		this.timers.push(id);
		return id;
	},



	trueTest: function(str) {
		if(typeof str === 'boolean') {return str;}
		if(typeof str === 'number') {return str !== 0;}
		if(typeof str === 'string') {
			if(str.toLowerCase() === 'true') {return true;}
			if(str === 'yes') {return true;}
			if(str === '1') {return true;}
		}
		return false;
	},
	debugBuffer: function(buffer) {
		let out = '';
		let out2 = '';
		for(let i = 0; i < buffer.length; i++) {
			const sliced = buffer.slice(i,i+1);
			out += sliced.toString('hex')+' ';
			let chr = sliced.toString();
			if(chr < ' ' || chr > '~') {chr = ' ';}
			out2 += chr+'  ';
			if(out.length > 60) {
				console.log(out);
				console.log(out2);
				out = out2 = '';
			}
		}
		console.log(out);
		console.log(out2);
	},




	_tcpConnect: function(c) {
		const self = this;
		if(this.tcpSocket) {return c(this.tcpSocket);}

		let connected = false;
		let received = new Buffer(0);
		const address = this.options.address;
		const port = this.options.port_query;

		const socket = this.tcpSocket = net.connect(port,address,() => {
			if(self.debug) {console.log(address+':'+port+" TCPCONNECTED");}
			connected = true;
			c(socket);
		});
		socket.setTimeout(10000);
		socket.setNoDelay(true);
		if(this.debug) {console.log(address+':'+port+" TCPCONNECT");}

		const writeHook = socket.write;
		socket.write = function(data) {
			if(self.debug) {console.log(address+':'+port+" TCP--> "+data.toString('hex'));}
			writeHook.apply(this,arguments);
		}

		socket.on('error', () => {});
		socket.on('close', () => {
			if(!self.tcpCallback) {return;}
			if(connected) {return self.fatal('Socket closed while waiting on TCP');}
			else {return self.fatal('TCP Connection Refused');}
		});
		socket.on('data', (data) => {
			if(!self.tcpCallback) {return;}
			if(self.debug) {console.log(address+':'+port+" <--TCP "+data.toString('hex'));}
			received = Buffer.concat([received,data]);
			if(self.tcpCallback(received)) {
				clearTimeout(self.tcpTimeoutTimer);
				self.tcpCallback = false;
				received = new Buffer(0);
			}
		});
	},
	tcpSend: function(buffer,ondata) {
		const self = this;
		process.nextTick(() => {
			if(self.tcpCallback) {return self.fatal('Attempted to send TCP packet while still waiting on a managed response');}
			self._tcpConnect((socket) => {
				socket.write(buffer);
			});
			if(!ondata) {return;}

			self.tcpTimeoutTimer = self.setTimeout(() => {
				self.tcpCallback = false;
				self.fatal('TCP Watchdog Timeout');
			},self.options.tcpTimeout);
			self.tcpCallback = ondata;
		});
	},



	udpSend: function(buffer,onpacket,ontimeout) {
		const self = this;
		process.nextTick(() => {
			if(self.udpCallback) {return self.fatal('Attempted to send UDP packet while still waiting on a managed response');}
			self._udpSendNow(buffer);
			if(!onpacket) {return;}

			self.udpTimeoutTimer = self.setTimeout(() => {
				self.udpCallback = false;
				let timeout = false;
				if(!ontimeout || ontimeout() !== true) {timeout = true;}
				if(timeout) {self.fatal('UDP Watchdog Timeout');}
			},self.options.udpTimeout);
			self.udpCallback = onpacket;
		});
	},
	_udpSendNow: function(buffer) {
		if(!('port_query' in this.options)) {return this.fatal('Attempted to send without setting a port');}
		if(!('address' in this.options)) {return this.fatal('Attempted to send without setting an address');}

		if(typeof buffer === 'string') {buffer = new Buffer(buffer,'binary');}

		if(this.debug) {console.log(this.options.address+':'+this.options.port_query+" UDP--> "+buffer.toString('hex'));}
		this.udpSocket.send(buffer,0,buffer.length,this.options.port_query,this.options.address);
	},
	_udpResponse: function(buffer) {
		if(this.udpCallback) {
			const result = this.udpCallback(buffer);
			if(result === true) {
				// we're done with this udp session
				clearTimeout(this.udpTimeoutTimer);
				this.udpCallback = false;
			}
		} else {
			this.udpResponse(buffer);
		}
	},
	udpResponse: function() {}
});
