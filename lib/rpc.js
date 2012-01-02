/***
 * Node modules
 */
var events = require('events');
var util = require('util');
var fs = require('fs');

/***
 * Local modules
 */
var Exposed = require('./exposed');
var uid = require('./util').uid;

/***
 * Global functions
 */
var globalFunctions = module.exports.globalFunctions = {}

/***
 * Expose modules to every peer
 * @param {String} Base name to the module
 * @param {Object|Function} The module. Can be a function for the
 * module to have onlt one method, or an Object for mulit methods.
 */
module.exports.exposeGlobal = function(mod, object) {
	if( typeof (object) === 'object') {
		var funcs = [];
		for(var funcName in object) {
			var funcObj = object[funcName];
			if( typeof (funcObj) == 'function') {
				globalFunctions[mod + '.' + funcName] = funcObj;
				funcs.push(funcName);
			} else if( typeof (funcObj) == 'object') {
				module.exports.exposeGlobal(mod + '.' + funcName, funcObj);
			}
		}
		console.log('exposing globalFunctions module: ' + mod + ' [funs: ' + funcs.join(', ') + ']')
	} else if( typeof (object) == 'function') {
		globalFunctions[mod] = object;
		console.log('exposing globalFunctions ' + mod);
	}
}
/**
 * RPC-JSON style calls for partition.io
 * Originally taken from rpc-socket
 *
 * @param {Object} initialized peer
 *
 * @return {Object}
 */
var RpcModule = module.exports.RpcModule = function(peer) {

	var self = this;

	events.EventEmitter.call(this);

	this.peer = peer;
	this.id = peer.id;
	this.vows = {}
	this.functions = Object.create(globalFunctions);

	this.on('request', this.requestEvent);

	this.on('handler', function(handler, exsosed, params) {
		handler.apply(exsosed, params);
	});
	this.expose('list', function() {
		var list = [];
		for(var key in self.functions) {
			this.set(key, 'function');
		}
		this.set('Array', Object.keys(self.functions));
		this.send();
	});
	peer.servent.emit('rpc', this)
}
/***
 * Make it an event
 */
util.inherits(RpcModule, events.EventEmitter);

/***
 * Write to the peer
 */
RpcModule.prototype.write = function(data) {
	this.peer.send({
		type : 'rpc',
		data : data
	});
};
/***
 * Expose modules to every peer
 * @param {String} Base name to the module
 * @param {Object|Function} The module. Can be a function for the
 * module to have onlt one method, or an Object for mulit methods.
 */
RpcModule.prototype.expose = function(mod, object) {
	if( typeof (object) === 'object') {
		var funcs = [];
		var keys = Object.keys(object);
		for(var i = keys.length - 1; i >= 0; i--) {

			var funcObj = object[keys[i]];
			var funcName = keys[i]
			if( typeof (funcObj) == 'function') {

				this.functions[mod + '.' + funcName] = funcObj;
				funcs.push(funcName);
			} else if( typeof (funcObj) == 'object') {
				this.expose(mod + '.' + funcName, funcObj);
			}
		}

		console.log('exposing module: ' + mod + ' [funs: ' + funcs.join(', ') + ']');
	} else if( typeof (object) == 'function') {
		this.functions[mod] = object;
		console.log('exposing ' + mod);
	}

	return this;
};
/***
 * Request event entry point for data
 */
RpcModule.prototype.requestEvent = function(data) {
	//console.log(data)
	if((data.hasOwnProperty('result') || data.hasOwnProperty('error') ) && data.hasOwnProperty('id') && this.vows.hasOwnProperty(data.id)) {
		var vow = this.runVows(data);
		console.log(vow)
		return this.emit('handler', vow.handler, vow.exsosed, vow.params);
	}
	if(data.hasOwnProperty('error')) {
		throw data.method;
	}
	if(!data.hasOwnProperty('id')) {
		return this.write(this.runError(32600, null));
	}
	if(!(data.hasOwnProperty('method') && typeof (data.method) === 'string')) {
		return this.write(this.runError(32600, data.id));
	}
	if(!data.hasOwnProperty('params') && Array.isArray(data.params)) {
		return this.write(this.runError(32602, data.id));
	}
	if(!this.functions.hasOwnProperty(data.method)) {
		return this.write(this.runError(32601, data.id));
	}
	var result = this.runExpose(data);
	return this.emit('handler', result.handler, result.exsosed, result.params);
};
/***
 * Ready for the exposed methods to be called
 */
RpcModule.prototype.runExpose = function(data) {
	var exsosed = new Exposed(data, this.id, this.peer);
	var handler = this.functions[data.method];
	console.log('RPC call  with method: ' + data['method']);
	this.counter++;
	return {
		params : data.params,
		handler : handler,
		exsosed : exsosed
	};
};
/***
 * We have a request return so deal with it.
 */
RpcModule.prototype.runVows = function(data) {

	var vow = this.vows[data.id];
	//
	return {
		params : [data.error, data.result, data.id],
		handler : vow.callBack,
		exsosed : this
	};
};
/***
 * An error so just return it.
 */
RpcModule.prototype.runError = function(code, id) {
	switch (code) {
		case 32700:
			return {
				'result' : null,
				'error' : {
					'message' : 'Parse error',
					'code' : code
				},
				'id' : id
			};
		case 32600:
			return {
				'result' : null,
				'error' : {
					'message' : 'Invalid Request',
					'code' : code
				},
				'id' : id
			};
		case 32601:
			return {
				'result' : null,
				'error' : {
					'message' : 'Method not found.',
					'code' : code
				},
				'id' : id
			};
		case 32602:
			return {
				'result' : null,
				'error' : {
					'message' : 'Invalid params.',
					'code' : code
				},
				'id' : id
			};
		case 32603:
			return {
				'result' : null,
				'error' : {
					'message' : 'Internal error.',
					'code' : code
				},
				'id' : id
			};
		default:
			return {
				'result' : null,
				'error' : {
					'message' : 'Server error.',
					'code' : 32000
				},
				'id' : id
			};
	}
};
/***
 * Invoke a method on the remote peer.
 */
RpcModule.prototype.invoke = function(method, params, callBack) {
	var id = uid();
	this.vows[id] = {
		method : method,
		params : params,
		callBack : callBack
	};
	//console.log(this.vows[id])
	this.write({
		id : id,
		method : method,
		params : params
	});
	return this;
};
