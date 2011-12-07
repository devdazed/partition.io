/*!
 * partition.io
 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
 * MIT Licensed
 */

/**
* Module dependencies
*/
var util = require('./util'),
    EventEmitter = process.EventEmitter;

/**
 * Job constructor, represents a current job in progress
 *
 * @constructor
 */
var Job = function(worker, id){
  this.id = id;
  this.peers = 1;
  this.responses = 0;
  this.worker = worker;
};
util.inherits(Job, EventEmitter);

/**
 * Receives data for the job
 */
Job.prototype.data = function(data){
  if (data instanceof Error){
    this.emit('error', data);
  } else {
    this.emit('data', data);
  }

  this.responses += 1;

  if (this.responses === this.peers){
    this.end();
  }
};

/**
 * Runs the job
 * Passes arguments to the worker func
 */
Job.prototype.run = function(){
  var args = Array.prototype.slice.call(arguments, 0),
      self = this;

  args.unshift(this.id);
  args.unshift(this.worker.REQUEST_NAMESPACE + this.worker.name);

  //set the object for the awaiting responses
  this.worker.incomplete[this.id] = this;
  this.peers += this.worker.servent.broadcast.apply(this.worker.servent, args);
  this.emit('start');
  
  //do the work locally now
  function afterWork(error, data){
    self.data(error || data);
  }
  
  var args2 = Array.prototype.slice.call(arguments, 0);
  args2.push(afterWork);
  this.worker.func.apply(this.worker, args2);
};

/**
 * Finishes the job up
 */
Job.prototype.end = function(){
  if (this.worker.incomplete[this.id]){
    delete this.worker.incomplete[this.id];
  }

  if (this.timeout){
    clearTimeout(this.timeout);
  }
  
  this.emit('end');
};

/**
 * Sets the TTL for the Job, will end the job even if all responses have not been received
 */
Job.prototype.setTTL = function(ttl){
  var self = this;

  this.on('start', function(){
    function onTimeout(){
      self.end();
    }
    self.timeout = setTimeout(onTimeout, ttl);
  });
};

/**
 * Inspect Method for Easier Debugging
 */
Job.prototype.inspect = Job.prototype.toString = function(){
  return "[Job: " + this.id + "]";
};
module.exports = Job;