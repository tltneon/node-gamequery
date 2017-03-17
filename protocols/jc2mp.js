module.exports = require('./gamespy3').extend({
	init: function () {
		this._super();
		this.useOnlySingleSplit = true;
	},
	finalizeState: function (state) {
		this._super(state);
		if (!state.players.length && parseInt(state.raw.numplayers)) {
			for (let i = 0; i < parseInt(state.raw.numplayers); i++) {
				state.players.push({});
			}
		}
	}
});