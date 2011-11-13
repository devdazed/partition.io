var port = 8888, app = {}, pio = require('../'), servent = new pio.Servent();

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

servent.expose('test', function() {

	this.set('key', 'value');
	this.set('object', {
		test : true
	});

	this.send();
});
servent.expose('willHave', {
	anError : function() {

		//error take message and error code
		this.error('You have an error!', 4565455);

		//NOTE: will throw an error on call of error it send at the same time.
		this.send();
	},
	somethingGood : function(err, result) {

		this.set('key', 'value');
		this.send();
	}
});

servent.on('peer', function(peer) {
	peer.invoke('willHave.anError', [], function(err, result) {
		console.log(result);// null
		console.log(err.code);// 4565455
		console.log(err.message);// "You have an error!"
	});
	peer.invoke('willHave.somethingGood', [], function(err, result) {
		console.log(err);// null
		console.log(result.key);// "value"
	});
	peer.invoke('test', [], function(err, result) {
		console.log(err);
		console.log(result);
	});
	servent.broadcastInvoke('willHave.somethingGood', [], function(err, result) {
		//will call for every peer connected.
		console.log(err);// null
		console.log(result.key);// "value"
	});
});

servent.listen(port);
