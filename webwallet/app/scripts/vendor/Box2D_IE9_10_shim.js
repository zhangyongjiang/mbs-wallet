/*

Emulate legacy getter/setter API using ES5 APIs.
Since __defineGetter__ and __defineSetter__ are not supported any longer by IE9 or 10 or Windows 8, and Box2D for javascript v2.1a still uses them, this shim is required to run Box2D in those environments.

This is taken directly from Allen Wirfs-Brock's blog at: 
http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx

I am using this with the ImpactJS game engine. To use in that situation, just paste the code below into your
lib\plugins\box2d\lib.js file inside the module definition, right after the line: b2 = { SCALE: 0.1 };

This has been tested with dkollmann's version of box2d which can be found here: https://github.com/dkollmann/impact-box2d

*/
try {
	if(!Object.prototype.__defineGetter__ &&
	Object.defineProperty({}, "x", { get: function() { return true } }).x) {
		Object.defineProperty(Object.prototype, "__defineGetter__",
	 { enumerable: false, configurable: true,
		value: function(name, func) {
			Object.defineProperty(this, name,
			 { get: func, enumerable: true, configurable: true });
		} 
	 });
		Object.defineProperty(Object.prototype, "__defineSetter__",
	 { enumerable: false, configurable: true,
		value: function(name, func) {
			Object.defineProperty(this, name,
			 { set: func, enumerable: true, configurable: true });
		} 
	 });
	}
} catch(defPropException) { /*Do nothing if an exception occurs*/ };