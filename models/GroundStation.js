var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * Mission Model
 * ==========
 */

var GroundStation = new keystone.List('GroundStation', {
	track: true,
	map: { name: 'groundStationId' },
	autokey: { path: 'slug', from: 'groundStationId', unique: true }
});

GroundStation.add({
	groundStationId: { type: String, required: true, initial: true},
	title: { type: String, required: true},
	key: { type: String },
	isActive: { type: Boolean },
	AuthorizedUsers: { type: Types.Relationship, ref: 'User', index: true, many: true},
	content: {
		summary: { type: Types.Html, wysiwyg: true, height: 150 },
		extended: { type: Types.Html, wysiwyg: true, height: 400 }
	},
});

GroundStation.schema.virtual('content.full').get(function() {
	return this.content.extended || this.content.brief;
});

GroundStation.defaultColumns = 'title, missionId|20%';
GroundStation.register();
