var port = 8888,
    app = {},
    pio = require('../'),
    servent = new pio.Servent();

servent.on('listening', function(){
  /**
   * If we arent on our default port then we weren't
   * the first node, so connect to that one
   */
  if (servent.address().port !== port){
    servent.connect(port);
  }
});

/**
 * First bind to our default port, if we can't then use
 * an ephemeral port instead
 */
servent.on('error', function(err){
  if(err.code === 'EADDRINUSE'){
    servent.listen(0);
  }
});
servent.listen(port);

/**
 * Create our worker
 * params will be passed in directly from your function definition
 * callback set as the last param
 */
var worker = servent.createWorker('random', function(max, callback){
  callback(null, Math.floor(Math.random()*max));
});

app.getSome = function(){
  worker.distribute(function(job){
    var numbers = [];

    /**
     * If all our node don't respond in 5000ms, just get on with what data we
     * have (useful if accuracy doesn't need to be 100%)
     */
    job.setTTL(5000);

    /**
     * Data is called once for each node that responds
     */
    job.on('data', function(data){
      numbers.push(data);
    });
    
    /**
     * Error is emitted if one of the callbacks calls back with error
     */
    job.on('error', console.error);

    //push the random number on to the data
    job.on('end', function(){
      console.log(numbers);
    });

    //returns a list of random numbers between 0 and 1000
    job.run(1000);
  });
};



module.exports = app;