"use strict";

var mongoose = require('mongoose'),
	models = require('./models');

exports.getItems = function (req, res) {
	var text = req.param('text');

	if (!text) {
		models.Item.find(function (err, items) {
			if (err) {
				res.send(500, err.message);
			} else {
				res.json(items);
			}
		});
	} else {
		models.Item.textSearch(text, function (err, searchResult) {
			if (err) {
				res.send(500, err.message);
			} else {
				searchResult.results.forEach(function (result, index, results) { results[index] = result.obj; });
				res.json(searchResult.results);
			}
		});
	}
};

exports.getItem = function (req, res) {
	var id = req.param('id');

	models.Item.findById(id, function (err, item) {
		if (err) {
			res.send(500, err.message);
		} else if (item) {
			res.json(item);
		} else {
			res.send(404);
		}
	});
};

exports.postItem = function (req, res) {
	new models.Item(req.body).save(function (err, item) {
		if (err) {
			res.send(500, err.message);
		} else {
			res.location('/api/items/' + item.id);
			res.send(201);
		}
	});
};

exports.putItem = function (req, res) {
	var id = req.param('id'),
		newItem = req.body;

	models.Item.findById(id, function (err, item) {
		if (err) {
			res.send(500, err.message);
		} else if (item) {
			item.title = newItem.title;
			item.tags = newItem.tags;
			item.body = newItem.body;
			item.save(function (err, item) {
				if (err) {
					res.send(500, err);
				} else {
					res.send(200);
				}
			});
		} else {
			res.send(404);
		}
	});
};

exports.getComments = function (req, res) {
	var id = req.param('id');

	models.Item.findById(id, function (err, item) {
		if (err) {
			res.send(500, err.message);
		} else if (item) {
			models.Comment.find({ itemId: item.id }, function (err, comments) {
				if (err) {
					res.json(500, err);
				} else {
					res.json(comments);
				}
			});
		} else {
			res.send(404);
		}
	});
};

exports.getComment = function (req, res) {
	var itemId = req.param('itemId'),
		commentId = req.param('commentId');

	models.Comment.findOne({ _id: commentId, itemId: itemId }, function (err, comment) {
		if (err) {
			res.send(500, err.message);
		} else if (comment) {
			res.json(comment);
		} else {
			res.send(404);
		}
	});
};


exports.postComment = function (req, res) {
	var itemId = req.param('id');

	models.Item.findById(itemId, function (err, item) {
		if (err) {
			res.send(500, err.message);
		} else if (item) {
			var comment = new models.Comment(req.body);
			comment.timestamp = new Date();
			comment.itemId = item.id;
			comment.save(function (err, comment) {
				if (err) {
					res.send(500, err);
				} else {
					res.location('/api/items/' + comment.itemId + '/comments/' + comment.id);
					res.send(201);
				}
			});
		} else {
			res.send(404);
		}
	});
};

exports.getTags = function (req, res) {
	models.Item.aggregate(
		{ $project: { _id: 0, tags: 1 } },
		{ $unwind: '$tags' },
		{ $group: { _id: '$tags', count: { $sum: 1 } } },
		{ $sort: { count: -1 } },
		{ $limit: 10 },
		function (err, tags) {
			if (err) {
				res.send(500, err.message);
			} else {
				tags.forEach(function (tag, index, tags) { tags[index] = tag._id; });
				res.json(tags);
			}
		});
};