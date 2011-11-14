/*!
 * partition.io
 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
 * MIT Licensed
 */

/**
* Module dependencies
*/
var util = require('./util'),
    net = require('net'),
    Peer = require('./peer'),
    Worker = require('./worker'),
    exposeGlobal = require('./rpc').exposeGlobal;

/**
 * Servent constructor
 *
 * @constructor
 */
var Servent = function(){
  var self = this;

  /**
   * Listens for new connections and adds a peer for each one
   */
  function onConnection(socket){
    util.info('Peer connection request received');
    self.addPeer(socket);
  }

  /**
   * Print some info once we are listening
   */
  function onListen(){
    util.info('Servent listening on: ' + JSON.stringify(self.address()));
  }

  this.peers = {};
  this.id = util.uid();
  this.on('connection', onConnection);
  this.on('listening', onListen);
};

/**
 * Inherits from net.Server
 */
util.inherits(Servent, net.Server);

/**
 * Adds an instance of a peer to out peers cache
 *
 * @param {Socket} socket The socket connection of the peer
 */
Servent.prototype.addPeer = function(socket){
  var self = this,
      peer = new Peer(null, socket, this);

  socket.setNoDelay();
  peer.discover();

  /**
   * Once the discovery is finished, we can add it to the peers
   */
  function onDiscovered(){
    util.info('Peer with id:' + peer.id + ' discovered');
    self.peers[peer.id] = peer;
    self.sendPeerInfo(peer);
  }

  /**
   * If the socket suddenyl ends, then remove it immediately
   */
  function onEnd(){
    util.info('Removing peer with id:' + peer.id + ' due to disconnect');
    delete self.peers[peer.id];
  }

  peer.on('end', onEnd);
  peer.once('discovered', onDiscovered);
};

/**
 * Removes a peer from the cache
 *
 * @param {String} id The unique peer id
 */
Servent.prototype.removePeer = function(id){
  util.info('Removing peer with id:' + id);
  this.peers[id].destroy();
  delete this.peers[id];
};

/**
 * Sends current servent peers information about the new peer
 *
 * @param {Peer} current The peer to send the information to
 */
Servent.prototype.sendPeerInfo = function(current){
  var i = 0, peer,
      peerKeys = Object.keys(this.peers),
      peerLength = peerKeys.length;

  for(; i < peerLength; i += 1){
    peer = this.peers[peerKeys[i]];
    if(peer.id === this.id || peer.id === current.id){
      continue;
    }

    util.info('Sending peer information about peer: ' + current.id + ' to: ' + peer.id);
    peer.send({
      type:'newPeer',
      id:current.id,
      port:current.port,
      host:current.host
    });
  }
  this.emit('peer', current);
};

/**
 * Connects to a peer with the given address or path
 *
 * @param {Number} port The ports of the host to connect to
 * @param {String} host The hostname to connect to
 */
Servent.prototype.connect = function(port, host){
  var socket, i = 0, peerKeys = Object.keys(this.peers),
      peerLength = peerKeys.length, peer,
      self = this;

  util.info('Connecting to new peer on port:' + port + ' with host:' + host);

  for(; i < peerLength; i += 1){
    peer = this.peers[peerKeys[i]];
    if (peer.host === host && peer.port === port){
      util.warn('Already connected to peer on port:' + port + ' with host:' + host + '. Ignoring.');
      return;
    }
  }

  socket = net.connect(port, host);
  /**
   * When we connect, register the socket as a peer
   */
  function onConnect(){
    util.info('Peer connected on port:' + port + ' with host:' + host);
    self.addPeer(socket);
  }
  socket.on('connect', onConnect);
};

/**
 * Destroys connection with all peers
 */
Servent.prototype.destroy = function(){
  var keys = Object.keys(this.peers),
      len = keys.length,
      i = 0;

  //remove all the peers
  util.info('Removing ' + len + ' peers');
  for(; i < len; i += 1){
    this.removePeer(keys[i]);
  }

  //stop listening
  this.close();
};

/**
 * Broadcasts a message to all peers registered with the server
 *
 * @param {String} evt The event to broadcast
 *
 * @return {Number} The number of peers the request was sent to
 */
Servent.prototype.broadcast = function(evt){
  var keys = Object.keys(this.peers),
      len = keys.length, peer,
      i = 0;

  util.info('Broadcasting event ' + evt + ' to ' + len + ' peers');
  for(; i < len; i += 1){
    peer = this.peers[keys[i]];
    peer.emit.apply(peer, arguments);
  }

  return len;
};

/**
 * Creates a worker object for this servent
 */
Servent.prototype.createWorker = function(name, func){
  return new Worker(this, name, func);
};

/**
 * Expose modules to all peers
 */
Servent.prototype.expose = function(mod, object){
  return exposeGlobal(mod, object)
};
/**
 * Expose modules to all peers
 */
Servent.prototype.broadcastInvoke = function(method, parmas, callBack){
   var keys = Object.keys(this.peers),
      len = keys.length, peer,
      i = 0;

  util.info('Broadcasting rpc event ' + method + ' to ' + len + ' peers');
  for(; i < len; i += 1){
    this.peers[keys[i]].invoke(method, parmas, callBack);
  }

  return len;
};


module.exports = Servent;