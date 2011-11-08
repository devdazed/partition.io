/*!
 * partition.io
 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
 * MIT Licensed
 */

/**
* Module dependencies
*/
var util = require('./util');

/**
 * Namespace constant prevents conflicts in emit events
 */
var REQUEST_NAMESPACE = 'PIO::REQUEST::',
    RESPONSE_NAMESPACE = 'PIO::RESPONSE::';

/**
 * Worker constructor
 *
 * @param {Servent} servent The servent that distributes the work
 * @param {String} name The name of the worker (ie, doMath)
 * @param {Function} func The acctual work to be done
 *    Will send the following parameters to func:
 *      index: A 1-n number where n is the number of peers the work is distributed
 *      params: The set of params you send to the worker
 * @constructor
 */
var Worker = function(servent, name, func, reduce){
  var self = this;
  
  this.name = name;
  this.servent = servent;
  this.func = func || util.noop;  
  this.incomplete = {};
  
  /**
   * Called when a request for work comes in
   */
  function onRequest(){
    self.work.apply(self, arguments);
  }
  
  /**
   * Called when a response comes in
   */
  function onResponse(){
    self.reduce.apply(self, arguments);
  }
  
  servent.on(RESPONSE_NAMESPACE + name, onResponse);
  servent.on(REQUEST_NAMESPACE + name, onRequest);
};

/**
 * Performs work the first two params are id and peer, the last is always a callback
 * everything in between is the user params;
 */
Worker.prototype.work = function(peer, id){
  var args = Array.prototype.slice.call(arguments, 2),
      self = this,
      callback = args.pop();
  
  function afterWork(data){
    peer.emit(RESPONSE_NAMESPACE + self.name, id, data);
  }
  
  //the final argument is always the callback
  args.push(afterWork);
  this.func.apply(this, args);
};

/**
 * Performs a reduction, gets called once for each response from a peer
 *
 */
Worker.prototype.reduce = function(peer, id){
  if(this.incomplete[id]){
    var args = Array.prototype.slice.call(arguments, 1);
    
    this.incomplete[id].responses.push(args);  
    
    if (this.incomplete[id].responses.length === this.incomplete[id].peers){
      //this.reduce(this.incomplete[id].responses);
    }
  }
};

/**
 * Distributes the work among the nodes
 */
Worker.prototype.distribute = function(){
  var args = Array.prototype.slice.call(arguments, 0),
      id = util.uid(), peers;
      
  args.unshift(id);
  args.unshift(REQUEST_NAMESPACE + this.name);
  
  //broadcast the message  
  peers = this.servent.broadcast.apply(this.servent, args);

  this.incomplete[id] = { peers: peers, responses:[] };
};
 
 
module.exports = Worker;