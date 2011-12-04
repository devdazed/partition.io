/*!
 * partition.io
 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
 * MIT Licensed
 */

/**
* Module dependencies
*/
var util = require('./util'),
    EventEmitter = process.EventEmitter,
    emit = EventEmitter.prototype.emit,
    RpcModule = require('./rpc').RpcModule;

/**
 * Peer constructor
 *
 * @param {String} id The id for this peer
 * @param {Socket} socket The socket for peer communication
 * @constructor
 */
var Peer = function(id, socket, servent){
  var buffer = [], self = this;
  /**
   * Pass socket errors on up the chain.
   * @private
   */
  function onError(error){
    emit.apply(self, ['error', error]);
  }

  /**
   * Handle our incoming data
   * @private
   */
  function onData(data){
    data = data.toString();

    if (data.indexOf('\n') > -1){
      var message = buffer.join('');

      data = data.split('\n');
      message += data.shift();
      buffer = [];
      self.recv(message);

      data = data.join('\n');
      if(data.length){
        onData(data);
      }
    } else {
      buffer.push(data);
    }
  }

  /**
   * If end is received, then destroy the socket
   */
  function onEnd(){
    self.destroy();
  }

  this.id = id;
  this.destroyed = false;
  this.socket = socket;
  this.servent = servent;
  this.isInitiator = false;

  this.socket.on('data', onData);
  this.socket.on('error', onError);
  this.socket.on('end', onEnd);
  
  this.rpc = new RpcModule(this)
  
};

/**
 * Inherits from EventEmitter
 */
util.inherits(Peer, EventEmitter);

/**
 * Sends a message across the socket
 *
 * @param {Object} data The data to send over the socket
 */
Peer.prototype.send = function(data){
  var message = JSON.stringify(data) + '\n';
  this.socket.write(message);
};

/**
 * Receives a message
 *
 * @param {String} message The data to be received
 */
Peer.prototype.recv = function(message){
  var data;
  try{
    data = JSON.parse(message);
  }catch(e){
    util.error('Could not parse message: ' + message);
  }

  if(data && data.type){
    switch(data.type){
      case 'event':  this.process(data); break; //the standard events
      case 'discovery': this.discover(data); break; //gets information about a peer
      case 'rpc': this.rpc.requestEvent(data.data); break; //Pass data onto the rpc module
      case 'newPeer': this.servent.connect(data.port, data.host); break; //connects to a new peer
      case 'destroy': this.destroy(); break; //destoys the connection
    }
  }
};

/**
 * Processes an incoming event request
 *
 * @param {Object} data The data for the incoming event
 */
Peer.prototype.process = function(data){
  util.info('Processing request with data: ' + JSON.stringify(data));
  var args = data.args || [];

  args.unshift(this);
  args.unshift(data.name);

  this.servent.emit.apply(this.servent, args);
};

/**
 * Here we overwrite the emit method to give a familar feel when using partition.io
 *
 * @param {String} evt The event to emit
 */
Peer.prototype.emit = function(evt){
  if(evt === 'newListener'){
    emit.apply(this, arguments);
    return;
  }

  var args = Array.prototype.slice.call(arguments, 1),
      message = {
        type:'event',
        name:evt,
        args:args
      };

  this.send(message);
};

/**
 * Discovers information about the peer
 *
 * @param {Object} data Incoming data from another peer
 */
Peer.prototype.discover = function(data){
  //if there is data, then this is a discovery response
  if(data){
    this.id = data.id;
    this.port = data.address.port;
    this.host = this.socket.remoteAddress;
    emit.call(this, 'discovered');
  } else {
    this.port = this.socket.remotePort;
    this.host = this.socket.remoteAddress;

    this.send({
      type: 'discovery',
      id: this.servent.id,
      address: this.servent.address()
    });
  }
};

/**
 * Destroys the socket connection
 */
Peer.prototype.destroy = function(){
  util.log('Received destroy request for peer: ' + this.id);
  this.socket.destroy();
  this.destroyed = true;
  emit.call(this, 'end');
};

/**
 * invoke the rpc call
 */
Peer.prototype.invoke = function(method, parmas, callBack){
   this.rpc.invoke(method, parmas, callBack)
};
/**
 * expose a module to rpc
 */
Peer.prototype.expose = function(mod, object){
   this.rpc.expose(mod, object)
};

/**
 * Export the constructor
 */
module.exports = Peer;