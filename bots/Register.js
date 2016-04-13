const ParentBot = require('./_Bot.js');
const util = require('util');
const net = require('net');
const http = require('http');
const url = require('url');
const BorgRing = require('borg-ring');
const dvalue = require('dvalue');
const textype = require('textype');
const natUpnp = require('nat-upnp');
const Result = require('../classes/Result.js');

var nodeEncode = function(node) {
	node = node || {};
	var rs;
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	if(Array.isArray(node)) {
		rs = [];
		for(var i = 0; i < node.length; i++) {
			var code = nodeEncode(node[i]);
			if(code) { rs.push(code); }
		}
	}
	else if(format.test(node.client) && node.ip && node.port) {
		rs = node.ip + ":" + node.port + ":" + node.client;
	}
	else {}
	return rs;
};
var nodeDecode = function(data) {
	var rs, tmp, node;
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	if(typeof data != 'string') { return false; }
	tmp = data.split(":");
	if(tmp.length != 3 || !format.test(tmp[2])) { return false; }
	node = {
		ip: tmp[0],
		port: tmp[1],
		client: tmp[2]
	};
	return node;
};

var randomPort = function () {
	return 30000 + parseInt(Math.random() * 35535);
};

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
	this.nodes = [];
	this.nodeIndex = {};
	this.network = {internal: {host: '0.0.0.0', port: 0}, external: {host: '0.0.0.0', port: 0}};
};

util.inherits(Bot, ParentBot);

Bot.prototype.start = function() {
	Bot.super_.prototype.start.apply(this);
};

Bot.prototype.getIP = function (cb) {
	var self = this;
	var client = new net.Socket();
	var network = {host: '0.0.0.0', port: 0};
	network.port = this.getBot('Receptor').listening;
	client.connect(80, 'laria.space', function() {
		var ip = client.address().address;
		network.host = ip;
		self.network.internal = network;
		cb(null, network);
		client.destroy();
	});
};

Bot.prototype.identify = function (code) {
	var rs = {};
	if(code) {
		rs.identify = this.config.UUID;
	}
	else {
		rs.identify = this.config.UUID;
	}
	return rs;
};

Bot.prototype.upnpPortMapping = function (cb) {
	var self = this;
	var client = natUpnp.createClient();
	var network = {host: '0.0.0.0', port: 0};
	var externalPort = randomPort();
	client.portMapping({public: externalPort, private: this.network.internal, ttl: 10}, function(err) {
		if(err) { setTimeout(function () { self.upnpPortMapping(cb); }, 3000); }
		else {
			client.externalIp(function(err, ip) {
				network.host = ip;
				network.port = externalPort;
				self.network.external = network;
				cb(null, self.network);
			});
		}
	});
};

Bot.prototype.assignDomain = function (domain, server, cb) {
	if(domain === undefined || !(/^[a-zA-Z0-9]+$/.test(domain))) { domain = dvalue.randomID(5); }
	if(typeof(cb) != 'function') { cb = function () {}; }

	var self = this;
	var postData = JSON.stringify({
		UUID: this.config.UUID,
		domain: domain,
		ip: this.network.external.host,
		port: this.network.external.port
	});
	var options = {
		hostname: server.host,
		port: server.port,
		path: '/subdomain/',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': postData.length
		}
	};
	var req = http.request(options, function(res) {
		var result = "";

		// something wrong
		res.on('error', function(e) { cb(e); });

		// result data
		res.on('data', function(d) {
			if(d) result += d;
		});
		res.on('end', function() {
			try {
				var rs = JSON.parse(result);
				cb(null, rs);
			}
			catch(e) {
				// something wrong
				cb(e);
			}
		});
	});
	req.on('error', function (e) {
		// something wrong
		cb(e);
	});

	// write data to request body
	req.write(postData);
	req.end();
};

module.exports = Bot;
