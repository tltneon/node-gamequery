const dgram = require('dgram');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const dns = require('dns');
const TypeResolver = require('./typeresolver');

// Currently active queries
const activeQueries = [];

// Create socket
const udpSocket = dgram.createSocket('udp4');
udpSocket.unref();
udpSocket.bind(21943);
udpSocket.on('message', (buffer, rinfo) => {
	if(gamequery.debug) {console.log(rinfo.address+':'+rinfo.port+" <--UDP "+buffer.toString('hex'));}
	for(let i = 0; i < activeQueries.length; i++) {
		const query = activeQueries[i];
		if(
			query.options.address !== rinfo.address
			&& query.options.altaddress !== rinfo.address
		) {continue;}
		if(query.options.port_query !== rinfo.port) {continue;}
		query._udpResponse(buffer);
		break;
	}
});
udpSocket.on('error', (e) => {
	if(gamequery.debug) {console.log("UDP ERROR: "+e);}
});

// Library
gamequery = {

	query: function(options,callback) {
		const promise = new Promise((resolve,reject) => {
			options.callback = (state) => {
				if (state.error) {reject(state.error);}
				else {resolve(state);}
			};

			let query;
			try {
				query = TypeResolver.lookup(options.type);
			} catch(e) {
				process.nextTick(() => {
					options.callback({error:e.message});
				});
				return;
			}
			query.debug = gamequery.debug;
			query.udpSocket = udpSocket;
			query.type = options.type;

			if(!('port' in query.options) && ('port_query' in query.options)) {
				if(gamequery.isCommandLine) {
					process.stderr.write(
						"Warning! This game is so old, that we don't know"
						+" what the server's connection port is. We've guessed that"
						+" the query port for "+query.type+" is "+query.options.port_query+"."
						+" If you know the connection port for this type of server, please let"
						+" us know on the gamequery issue tracker, thanks!\n"
					);
				}
				query.options.port = query.options.port_query;
				delete query.options.port_query;
			}

			// copy over options
			for(const i in options) {query.options[i] = options[i];}

			activeQueries.push(query);

			query.on('finished',(state) => {
				const i = activeQueries.indexOf(query);
				if(i >= 0) {activeQueries.splice(i, 1);}
			});

			process.nextTick(() => {
				query.start();
			});
		});

		if (callback && callback instanceof Function) {
			if(callback.length === 2) {
				promise
					.then((state) => callback(null,state))
					.catch((error) => callback(error));
			} else if (callback.length === 1) {
				promise
					.then((state) => callback(state))
					.catch((error) => callback({error:error}));
			}
		}

		return promise;
	}

};

module.exports = gamequery;
