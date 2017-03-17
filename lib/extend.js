const fnTest = /xyz/.test(() => {
	xyz;
}) ? /\b_super\b/ : /.*/;

// The base Class implementation (does nothing)
const Class = function () {};

// Create a new Class that inherits from this class
Class.extend = function () {
	const args = Array.prototype.slice.call(arguments);
	let name = 'Class';
	let parent = this;
	let prop = {};
	if (typeof args[0] === 'string') {
		name = args.shift();
	}
	if (args.length >= 2) {
		parent = args.shift();
	}
	prop = args.shift();

	// Copy prototype from the parent object
	const prototype = {};
	for (let name in parent.prototype) {
		prototype[name] = parent.prototype[name];
	}

	// Copy the properties over onto the new prototype
	for (let name in prop) {
		if (typeof prop[name] === "function" && fnTest.test(prop[name])) {
			// this is a function that references _super, so we have to wrap it
			// and provide it with its super function
			prototype[name] = (function (name, fn) {
				return function () {
					const tmp = this._super;

					// Add a new ._super() method that is the same method
					// but on the super-class
					if (typeof parent.prototype[name] === 'undefined') {
						if (name === 'init') {
							this._super = parent.prototype.constructor;
						} else {
							this._super = function () {
								throw new Error('Called _super in method without a parent');
							}
						}
					} else {
						this._super = parent.prototype[name];
					}

					// The method only need to be bound temporarily, so we
					// remove it when we're done executing
					const ret = fn.apply(this, arguments);
					this._super = tmp;

					return ret;
				};
			})(name, prop[name]);
		} else {
			prototype[name] = prop[name];
		}
	}

	// The dummy class constructor
	function Class() {
		// All construction is actually done in the init method
		if (this.init) {
			this.init.apply(this, arguments);
		}
	}

	// Populate our constructed prototype object
	Class.prototype = prototype;

	// Enforce the constructor to be what we expect
	Class.prototype.constructor = Class;

	// And make this class extendable
	Class.extend = arguments.callee;

	return Class;
};

module.exports = Class;