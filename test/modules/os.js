var os = require('os')

module.exports = function(peer) {
	peer.expose('os', {
		uptime : function() {
			this.set('value', os.uptime()).send();
		},
		loadavg : function() {
			this.set('value', os.loadavg()).send();
		},
		totalmem : function() {
			this.set('value', os.totalmem()).send();
		},
		freemem : function() {
			this.set('value', os.freemem()).send();
		},
		cpus : function() {
			this.set('value', os.cpus()).send();
		},
		networkInterfaces : function() {
			this.set('value', os.networkInterfaces()).send();
		}
	})
}