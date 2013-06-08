'use strict';

angular.module('app').factory('appServerSvc', ['$q', '$http', function (q, http) {
	return {
		findItems: function (query) {
			return http.get('/api/items', { params: { text: query } }).then(function(ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return ret.data;
			});
		},

		createItem: function (item) {
			return http.post('/api/items', item).then(function(ret) {
				if (ret.status !== 201) {
					throw new Error('HTTP ' + ret.status);
				}
				var headers = ret.headers();
				return http.get(headers.location);
			}).then(function(ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return ret.data;
			});
		},

		updateItem: function (item) {
			return http.put('/api/items/' + item.id, item).then(function (ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return item;
			});
		},

		getItem: function (id) {
			return http.get('/api/items/' + id).then(function (ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return ret.data;
			});
		},

		getComments: function (itemId) {
			return http.get('/api/items/' + itemId + '/comments').then(function (ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return ret.data;
			});
		},

		createComment: function (itemId, body) {
			return http.post('/api/items/' + itemId + '/comments', { body: body }).then(function(ret) {
				if (ret.status !== 201) {
					throw new Error('HTTP ' + ret.status);
				}
				var headers = ret.headers();
				return http.get(headers.location);
			}).then(function (ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return ret.data;
			});
		},

		findTags: function () {
			return http.get('/api/tags').then(function (ret) {
				if (ret.status !== 200) {
					throw new Error('HTTP ' + ret.status);
				}
				return ret.data;
			});
		}
	};
}]);
