var port = 8888, app = {}, pio = require('../'), os = require('./modules/os.js'), servent = new pio.Servent();

servent.on('listening', function() {
	/**
	 * If we arent on our default port then we weren't
	 * the first node, so connect to that one
	 */
	if(servent.address().port !== port) {
		servent.connect(port);
	}
});
/**
 * First bind to our default port, if we can't then use
 * an ephemeral port instead
 */
servent.on('error', function(err) {
	if(err.code === 'EADDRINUSE') {
		servent.listen(0);
	}
});
/***
 *
 */
servent.expose('test', function(max) {
	this.set('number', Math.floor(Math.random() * max));
	this.set('object', {
		test : true
	});
	this.send();
});
/***
 *
 */
servent.expose('willHave', {
	anError : function() {
		//error take message and error code
		this.error('You have an error!', 4565455);

		//NOTE: will throw an error on call of error it send at the same time.
		this.send();
	}
});
/***
 *
 */
servent.on('peer', function(peer) {

	os(peer);


	peer.invoke('test', [1000], function(err, result) {
		console.log(err);
		console.log(result);
	});

	servent.broadcastInvoke('test', [], function(err, result) {

		console.log(err);
		// null
		console.log(result);
		// "value"
	});
	setTimeout(function() {

		peer.invoke('list', [], function(err, result) {

			peer.invoke('os.cpus', [], function(err, result) {
				console.log('<---- Remote peers cpu info ---->')
				console.log(result.value)
				console.log('<---- END ---->')
			});
		});
	}, 5000);
});

servent.listen(port);
