var http = require('http');
var mongoose = require('mongoose');
var Q = require('q');
var app = require('./server');
var models = require('./models');

describe('server', function () {
	var server, sockets;

	beforeEach(function (done) {
		sockets = [];

		server = http.createServer(app);

		// mongoose.set('debug', true);

		mongoose.connect('mongodb://localhost/trackr_tests', function (err) {
			if (err) { done(err); return; }

			models.Item.ensureIndexes(); // Without this, full text queries trow error

			server.listen(8090, function () { done(); });
		});

		server.on('connection', function (socket) { sockets.push(socket); });
	});

	afterEach(function (done) {
		mongoose.connection.db.dropDatabase();
		mongoose.disconnect();

		sockets.forEach(function (socket) { socket.end(); });
		server.close(function () { done(); });
	});

	it('should get all items', function (done) {
		addToCollection('items', { _id: '518e5b6d96661c4008000002', title: 'title 1', body: 'body 1', tags: ['tag1'] }).then(function () {
			return request({ path: '/api/items' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			expect(ret.data).toEqual(jasmine.any(Array));
			expect(ret.data.length).toEqual(1);
			expect(ret.data[0]).toEqual({ id: '518e5b6d96661c4008000002', title: 'title 1', body: 'body 1', tags: ['tag1'] });

			done();
		}).fail(done);
	});

	it('should get items matching text search', function (done) {
		addToCollection('items', { _id: '518e5b6d96661c4008000002', title: 'title 1', body: 'body 1', tags: ['tag1'] }).then(function () {
			return request({ path: '/api/items?text=tag1' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			expect(ret.data).toEqual(jasmine.any(Array));
			expect(ret.data.length).toEqual(1);
			expect(ret.data[0]).toEqual({ id: '518e5b6d96661c4008000002', title: 'title 1', body: 'body 1', tags: ['tag1'] });

			done();
		}).fail(done);
	});

	it('should get single item', function (done) {
		addToCollection('items', { _id: '518e5b6d96661c4008000002', title: 'title 1', body: 'body 1', tags: ['tag1'] }).then(function () {
			return request({ path: '/api/items/518e5b6d96661c4008000002' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			expect(ret.data).toEqual({ id: '518e5b6d96661c4008000002', title: 'title 1', body: 'body 1', tags: ['tag1'] });

			done();
		}).fail(done);
	});

	it('should create new item', function (done) {
		request({ method: 'POST', path: '/api/items' }, { title: 'title 1', body: 'body 1', tags: ['tag1'] }).then(function (ret) {
			expect(ret.statusCode).toBe(201);
			expect(ret.headers['location']).toMatch(/^\/api\/items\/[0-9a-f]{24}$/);
			return getCollection('items');
		}).then(function (items) {
			expect(items.length).toEqual(1);
			expect(items[0].title).toEqual('title 1');
			expect(items[0].body).toEqual('body 1');
			expect(items[0].tags).toEqual(['tag1']);

			done();
		}).fail(done);
	});

	it('should update item', function (done) {
		addToCollection('items', { _id: '518e5b6d96661c4008000002', title: 'title', body: 'body', tags: ['tag'] }).then(function () {
			return request({ method: 'PUT', path: '/api/items/518e5b6d96661c4008000002' }, { title: 'updated title', body: 'updated body', tags: ['new tag'] });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			return getCollection('items');
		}).then(function (items) {
			expect(items.length).toEqual(1);
			expect(items[0].title).toEqual('updated title');
			expect(items[0].body).toEqual('updated body');
			expect(items[0].tags).toEqual(['new tag']);

			done();
		}).fail(done);
	});

	it('should get comments', function (done) {
		addToCollection('items', { _id: '518e5b6d96661c4008000002', title: 'title', body: 'body', tags: [] }).then(function () {
			return addToCollection('comments', { itemId: mongoose.Types.ObjectId('518e5b6d96661c4008000002'), body: 'comment body' });
		}).then(function () {
			return request({ path: '/api/items/518e5b6d96661c4008000002/comments' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			expect(ret.data).toEqual(jasmine.any(Array));
			expect(ret.data.length).toEqual(1);
			expect(ret.data[0].body).toEqual('comment body');

			done();
		}).fail(done);
	});

	it('should add comment', function (done) {
		addToCollection('items', { _id: '518e5b6d96661c4008000002', title: 'title', body: 'body', tags: [] }).then(function () {
			return request({ method: 'POST', path: '/api/items/518e5b6d96661c4008000002/comments' }, { body: 'comment body' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(201);
			expect(ret.headers['location']).toMatch(/^\/api\/items\/518e5b6d96661c4008000002\/comments\/[0-9a-f]{24}$/);

			return getCollection('comments');
		}).then(function (comments) {
			expect(comments.length).toEqual(1);
			expect(comments[0].body).toEqual('comment body');
			expect(comments[0].timestamp).toEqual(jasmine.any(Date));
			expect(comments[0].itemId).toEqual(mongoose.Types.ObjectId('518e5b6d96661c4008000002'));

			done();
		}).fail(done);
	});

	it('should get single comment', function (done) {
		addToCollection('comments', { _id: '518e5b6d96661c4008000003', itemId: mongoose.Types.ObjectId('518e5b6d96661c4008000002'), body: 'comment body', timestamp: new Date('2013-06-16T22:00:00.000Z') }).then(function () {
			return request({ path: '/api/items/518e5b6d96661c4008000002/comments/518e5b6d96661c4008000003' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			expect(ret.data).toEqual({ id: '518e5b6d96661c4008000003', itemId: '518e5b6d96661c4008000002', body: 'comment body', timestamp: '2013-06-16T22:00:00.000Z' });

			done();
		}).fail(done);
	});

	it('should get tags', function (done) {
		addToCollection('items', [{ tags: ['1', '2'] }, { tags: ['3', '4'] }, { tags: ['1', '3'] }]).then(function () {
			return request({ path: '/api/tags' });
		}).then(function (ret) {
			expect(ret.statusCode).toBe(200);
			expect(ret.data).toEqual(['3', '1', '4', '2']);

			done();
		}).fail(done);
	});

	function getCollection(name) {
		var deferred = Q.defer();

		mongoose.connection.db.collection(name, function (err, coll) {
			if (err) { deferred.reject(err); return; }

			coll.find().toArray(function (err, ary) {
				if (err) { deferred.reject(err); return; }

				deferred.resolve(ary);
			});
		});

		return deferred.promise;
	}

	function addToCollection(name, docs) {
		var deferred = Q.defer();

		docs = Array.isArray(docs) ? docs : [docs];

		docs.forEach(function (doc) {
			if (doc._id) { 
				doc._id = mongoose.Types.ObjectId(doc._id) 
			}
		});

		mongoose.connection.db.collection(name, function (err, coll) {
			if (err) { 
				deferred.reject(err); 
				return;
			}

			coll.insert(docs, {safe: true}, function(err, docs) {
				if (err) { 
					deferred.reject(err); 
					return;
				}

				deferred.resolve(docs.length == 1 ? docs[0] : docs);
			});
		});

		return deferred.promise;
	}

	function request(options, reqData) {
		var deferred = Q.defer();

		options.port = 8090;
		if (reqData) {
			options.headers = {'content-type': 'application/json'};
		}

		var req = http.request(options, function (res) {
			var contentType = res.headers['content-type'].split(';')[0],
				resData = '';

			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				resData += chunk;
			});

			res.on('end', function() {
				if (contentType == 'application/json') {
					try {
						resData = JSON.parse(resData);
					} catch (e) {
						deferred.reject(err);
						return;
					}
				}
				deferred.resolve({
					statusCode: res.statusCode, 
					headers: res.headers,
					data: resData
				});
			});
		});

		if (reqData) {
			req.write(JSON.stringify(reqData));
		}

		req.end();

		return deferred.promise;
	}
});
