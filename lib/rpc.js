var events = require('events');

var util = require('util');
var fs = require('fs');
//
var Exposed = require('./exposed');
var keyGen = require('./util').uid;

var globalFunctions = module.exports.globalFunctions = {}
//

module.exports.globalFunctions



var rpc = module.exports.rpc = function(peer) {

	var self = this;
	//
	events.EventEmitter.call(self);
	//
	this.peer = peer;
	this.id = peer.id;
	this.vows = {}
	this.functions = Object.create(globalFunctions);
	//
	this.on('request', this.eventRequest);
	//

	this.on('handler', function(handler, exsosed, params) {

		handler.apply(exsosed, params)
	})

	this.expose('list', function() {
		var list = [];
		for(var key in self.functions) {
			this.set(key, 'function');
		}
		this.send();
	});
	
	//
	peer.servent.emit('rpc', this);
	
}
//
util.inherits(rpc, events.EventEmitter);

module.exports.exposeGlobal = function(mod, object) {
	if( typeof (object) === 'object') {
		var funcs = [];
		for(var funcName in object) {
			var funcObj = object[funcName];

			if( typeof (funcObj) == 'function') {

				globalFunctions[mod + '.' + funcName] = funcObj;
				funcs.push(funcName);
			} else if( typeof (funcObj) == 'object') {
				module.exports.exposeGlobal(mod + '.' + funcName, funcObj)
			}
		}
		console.log('exposing globalFunctions module: ' + mod + ' [funs: ' + funcs.join(', ') + ']')
	} else if( typeof (object) == 'function') {
		globalFunctions[mod] = object;
		console.log('exposing globalFunctions ' + mod)
	}
}
//
rpc.prototype.writeSocket = function(data) {

	this.peer.send({
		type : 'rpc',
		data : data
	});

};
rpc.prototype.expose = function(mod, object) {
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
rpc.prototype.exposeGlobal = function(mod, object) {
	if( typeof (object) === 'object') {
		var funcs = [];
		for(var funcName in object) {
			var funcObj = object[funcName];

			if( typeof (funcObj) == 'function') {

				globalFunctions[mod + '.' + funcName] = funcObj;
				this.functions[mod + '.' + funcName] = funcObj;
				funcs.push(funcName);
			} else if( typeof (funcObj) == 'object') {
				this.exposeGlobal(mod + '.' + funcName, funcObj)
			}
		}
		console.log('exposing globalFunctions module: ' + mod + ' [funs: ' + funcs.join(', ') + ']')
	} else if( typeof (object) == 'function') {
		globalFunctions[mod] = object;
		this.functions[mod] = object;
		console.log('exposing globalFunctions ' + mod)
	}

	return this;
};
//
rpc.prototype.eventRequest = function(data) {

	if((data.hasOwnProperty('result') || data.hasOwnProperty('error') ) && data.hasOwnProperty('id') && this.vows.hasOwnProperty(data.id)) {
		//NOTE: callback run
		var vow = this.runVows(data)
		return this.emit('handler', vow.handler, vow.exsosed, vow.params)
	}
	if(data.hasOwnProperty('error')) {
		return console.log('RPC: ERROR bad request')
	}
	if(!data.hasOwnProperty('id')) {
		return this.writeSocket(this.runError(32600, null));
	}
	if(!(data.hasOwnProperty('method') && typeof (data.method) === 'string')) {
		return this.writeSocket(this.runError(32600, data.id));
	}
	if(!data.hasOwnProperty('params') && Array.isArray(data.params)) {
		return this.writeSocket(this.runError(32602, data.id));
	}
	if(!this.functions.hasOwnProperty(data.method)) {
		return this.writeSocket(this.runError(32601, data.id));
	}
	var result = this.runExpose(data)
	return this.emit('handler', result.handler, result.exsosed, result.params)
};
rpc.prototype.runExpose = function(data) {
	var self = this;
	var exsosed = new Exposed(data, this.id, function(data) {
		self.writeSocket(data);
	});
	var handler = this.functions[data.method];
	//
	Logger('RPC call  with method: ' + data['method']);
	//
	this.counter++;
	//
	return {
		params : data.params,
		handler : handler,
		exsosed : exsosed
	}
}
//
rpc.prototype.runVows = function(data) {

	var vow = this.vows[data.id]
	//
	return {
		params : [data.error, data.result, data.id],
		handler : vow.callBack,
		exsosed : this
	}
}
//
rpc.prototype.runError = function(code, id) {
	var result;
	switch (code) {
		case 32700:
			result = ( {
				'result' : null,
				'error' : {
					'message' : 'Parse error',
					'code' : code
				},
				'id' : id
			})
			break;
		case 32600:
			result = ( {
				'result' : null,
				'error' : {
					'message' : 'Invalid Request',
					'code' : code
				},
				'id' : id
			})
			break;
		case 32601:
			result = ( {
				'result' : null,
				'error' : {
					'message' : 'Method not found.',
					'code' : code
				},
				'id' : id
			})
			break;
		case 32602:
			result = ( {
				'result' : null,
				'error' : {
					'message' : 'Invalid params.',
					'code' : code
				},
				'id' : id
			})
			break;
		case 32603:
			result = ( {
				'result' : null,
				'error' : {
					'message' : 'Internal error.',
					'code' : code
				},
				'id' : id
			})
			break;
		case 32000:
		default:
			result = ( {
				'result' : null,
				'error' : {
					'message' : 'Server error.',
					'code' : 32000
				},
				'id' : id
			})
	}
	return result;
}

rpc.prototype.invoke = function(method, params, callBack) {
	var id = keyGen()
	//
	this.vows[id] = {
		method : method,
		params : params,
		callBack : callBack
	}
	//

	this.writeSocket({
		id : id,
		method : method,
		params : params
	})
}