
# partition.io

Partition.IO is a P2P Distributed workload for NodeJS.  Partition.IO allows 
you to create a homogeneous system that is shared-nothing and partition 
tolerant.

To install just use npm

    $ npm install partition.io 

## API

The api has 3 main components.  The Servent, the Worker, and the Job.  
The servent acts as the communication layer for the P2P system, the worker is
a template that defines work to be done. The job is a representation of work
being done by a worker.

### Servent

Getting going with a distributed system using Partition.IO is easy.  

```javascript
    var Servent = require('partition.io').Servent,
        servent = new Servent(),
        port = 8888;
    
    servent.on('listening', function(){
      /**
       * If we aren't on our default port then we weren't
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
```

### Worker

Creating a worker is also easy, just call `servent.createWorker` and
be sure to set the last parameter taken as callback, this is how data gets
back to Partition.IO.

```javascript
    /**
     * Create our worker
     * params will be passed in directly from your function definition
     * callback set as the last param
     */
    var worker = servent.createWorker('random', function(max, callback){
      callback(null, Math.floor(Math.random()*max));
    });

    /**
     * This will run the worker (as a job)
     */
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
```


## TODO

Before I add more features, first I need to write some tests.

## Contributing

If you would like to contribute, just drop me a line or a pull request.

## License 

(The MIT License)

Copyright (c) 2011 Russell Bradberry &lt;rbradberry@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.