#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

const debug = argv.debug;
delete argv.debug;
const outputFormat = argv.output;
delete argv.output;

const options = {};
for (const key in argv) {
	const value = argv[key];
	if (key === '_' || key.charAt(0) === '$' || (typeof value !== 'string' && typeof value !== 'number')) {
		continue;
	}
	options[key] = value;
}

const gamequery = require('../lib/index');
if (debug) {
	gamequery.debug = true;
}
gamequery.isCommandLine = true;

gamequery.query(options)
	.then((state) => {
		if (outputFormat === 'pretty') {
			console.log(JSON.stringify(state, null, '  '));
		} else {
			console.log(JSON.stringify(state));
		}
	})
	.catch((error) => {
		if (outputFormat === 'pretty') {
			console.log(JSON.stringify({
				error: error
			}, null, '  '));
		} else {
			console.log(JSON.stringify({
				error: error
			}));
		}
	});