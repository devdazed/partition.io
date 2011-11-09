/*!
 * partition.io
 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
 * MIT Licensed
 */

/**
* Module dependencies
*/
var util = require('./util'),
    Job = require('./job');

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
var Worker = function(servent, name, func){
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
  function onResponse(peer, id, error, data){
    if (self.incomplete[id]){
      self.incomplete[id].data(error || data);
    }
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
      self = this;

  function afterWork(error, data){
    peer.emit(RESPONSE_NAMESPACE + self.name, id, error, data);
  }

  //the final argument is always the callback
  args.push(afterWork);
  this.func.apply(this, args);
};

/**
 * Distributes the work among the nodes
 */
Worker.prototype.distribute = function(callback){
  var job = new Job(this, util.uid());

  //call back with the job
  callback(job);
  return job;
};

/**
 * Inspect Method for Easier Debugging
 */
Worker.prototype.inspect = Worker.prototype.toString = function(){
  return "[Worker: " + this.name + "]";
};

/**
 * Export our constants
 */
Worker.REQUEST_NAMESPACE = Worker.prototype.REQUEST_NAMESPACE = REQUEST_NAMESPACE;
Worker.RESPONSE_NAMESPACE = Worker.prototype.RESPONSE_NAMESPACE = RESPONSE_NAMESPACE;

module.exports = Worker;