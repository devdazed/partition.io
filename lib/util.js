/*!
 * partition.io
 * Copyright(c) 2011 Russell Bradberry <rbradberry@gmail.com>
 * MIT Licensed
 */
 
/**
 * Module dependencies
 */
var util = require('util');
 
/**
 * reference the node-util methods we use so that we dont have to require 
 * the node-util as well
 *
 * @static
 */
exports.inherits = util.inherits;
exports.log = exports.info = util.log;
exports.error = exports.warn = util.log;
exports.inspect = util.inspect;


/**
 * A no-op function used for default callbacks and such
 *
 * @static
 */
exports.noop = function(){};

/**
 * Left pads a string with a specific character to a specific length
 * Method originally from socket.io LearnBoost <dev@learnboost.com>
 * 
 * @param {String} string The string to pad
 * @param {Number} length The final length of the string
 * @param {String} character The character to pad the string with
 * @static
 */
exports.lpad = function(string, length, character){
  return new Array(1 + length - string.length).join(character) + string;
};

/**
 * Creates a 12-byte (24 Byte Hex) Unique string comprised of time, pid and
 * a random number
 *
 * @static
 */
exports.uid = function(){
  var epoch = Math.floor(new Date().getTime()/1000),
      pid = process.pid,
      rand = Math.floor(parseFloat(Math.random().toPrecision(10), 10) * 0xFFFFFFFFFFFF);
  
  epoch = exports.lpad(epoch.toString(16), 8, '0');
  rand = exports.lpad(rand.toString(16), 12, '0');
  pid = exports.lpad(pid.toString(16), 4, '0');
  
  return (epoch + pid + rand).toUpperCase();
};