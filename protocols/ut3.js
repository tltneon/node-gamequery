module.exports = require('./gamespy3').extend({
	finalizeState: function(state) {
		this._super(state);

		this.translate(state.raw,{
			'mapname': false,
			'p1073741825': 'map',
			'p1073741826': 'gametype',
			'p1073741827': 'servername',
			'p1073741828': 'custom_mutators',
			'gamemode': 'joininprogress',
			's32779': 'gamemode',
			's0': 'bot_skill',
			's6': 'pure_server',
			's7': 'password',
			's8': 'vs_bots',
			's10': 'force_respawn',
			'p268435704': 'frag_limit',
			'p268435705': 'time_limit',
			'p268435703': 'numbots',
			'p268435717': 'stock_mutators',
			'p1073741829': 'stock_mutators',
			's1': false,
			's9': false,
			's11': false,
			's12': false,
			's13': false,
			's14': false,
			'p268435706': false,
			'p268435968': false,
			'p268435969': false
		});

		function split(a) {
			let s = a.split('\x1c');
			s = s.filter(function(e) { return e });
			return s;
		}
		if('custom_mutators' in state.raw) state.raw['custom_mutators'] = split(state.raw['custom_mutators']);
		if('stock_mutators' in state.raw) state.raw['stock_mutators'] = split(state.raw['stock_mutators']);
		if('map' in state.raw) state.map = state.raw.map;
	}
});
