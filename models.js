var mongoose = require('mongoose'),
	ObjectId = require('mongoose').Schema.Types.ObjectId,
	textSearchPlugin = require('mongoose-text-search');

var options = { 
	toJSON: { 
		transform: function (doc, ret, options) {
			ret.id = ret._id;
			delete ret._id;
		}
	}
};

var itemSchema = mongoose.Schema({
	title: String,
	body: String,
	tags: [String]
}, options);

itemSchema.plugin(textSearchPlugin); // Query with Item.textSearch('ciao', function (err, ret) {});

itemSchema.index({ tags: 'text', title: 'text', body: 'text' }, { name: 'itemTextIndex', weights: { tags: 10, title: 5, body: 1 } });

exports.Item = mongoose.model('Item', itemSchema);

var commentSchema = mongoose.Schema({
	itemId: ObjectId,
	timestamp: Date,
	body: String
}, options);

exports.Comment = mongoose.model('Comment', commentSchema);
