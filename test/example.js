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
var worker = servent.createWorker('random', function(callback){
  callback(null, Math.floor(Math.random()*100000));
});

app.getSome = function(){
  worker.distribute(function(job){
    var numbers = [];

    job.setTTL(5000); //wait a max of 5 seconds for all nodes to respond
    job.on('data', function(data){
      numbers.push(data);
    });

    //push the random number on to the data
    job.on('end', function(){
      console.log(numbers);
    });

    job.run();
  });
};



module.exports = app;