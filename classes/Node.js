var node = function() {};
node.test = function (node) {
	node = node || {};
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	return format.test(node.client) && node.ip && node.port;
};

node.format = function (node) {
	var rs = {};
	node = node || {};
	rs.client = node.client;
	rs.ip = node.ip;
	rs.port = node.port;
	return rs;
};

node.encode = function (node) {
	node = node || {};
	var rs;
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	if(Array.isArray(node)) {
		rs = [];
		for(var i = 0; i < node.length; i++) {
			var code = this.encode(node[i]);
			if(code) { rs.push(code); }
		}
	}
	else if(format.test(node.client) && node.ip && node.port) {
		rs = node.ip + ":" + node.port + ":" + node.client;
	}
	else {}

	return rs;
};

node.decode = function (data) {
	var rs, tmp;
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

node.clone = function (obj) {
	var rs;

	if(typeof obj == 'object') {
		rs = Array.isArray(obj)? []: {};
		for(var k in obj) {
			rs[k] = this.clone(obj[k]);
		}
	}
	else {
		rs = obj;
	}

	return rs;
};

node.randomPick = function(arr, n) {
	if(!Array.isArray(arr)) { return []; }
	var tmp = this.clone(arr);
	var rs = [];
	while(tmp.length > 0 && rs.length < n) {
		rs.push(tmp.splice(Math.floor(Math.random() * tmp.length), 1)[0]);
	}

	return rs;
};

node.merge = function () {
	var rs = [];
	for(var k in arguments) {
		if(Array.isArray(arguments[k])) { arguments[k].map(function (v, i) { if(typeof(v) != 'undefined') { rs.push(v); } }); }
		else if(typeof(arguments[k]) != 'undefined') { rs.push(arguments[k]); }
	}
	return rs;
};

node.default = function(config, defaultConfig) {
	if(typeof(defaultConfig) == 'object') {
		if(config == undefined) { config = Array.isArray(defaultConfig)? []: {}; }
		for(var k in defaultConfig) {
			var v = defaultConfig[k];
			if(typeof(v) == 'object') { config[k] = this.default(config[k], v); }
			else if(config[k] === undefined) { config[k] = v; }
		}
	}
	else {
		if(config == undefined) { config = defaultConfig; }
	}

	return config;
};

module.exports = node;
