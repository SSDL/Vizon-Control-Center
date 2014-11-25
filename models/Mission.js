var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * Mission Model
 * ==========
 */

var Mission = new keystone.List('Mission', {
	map: { name: 'title' },
	autokey: { path: 'slug', from: 'title', unique: true }
});

Mission.add({
	title: { type: String, required: true },
	missionId: { type: String },
	authorizedUsers: { type: Types.Relationship, ref: 'User', index: true, many: true},
});
Mission.relationship({ path: 'taps', ref: 'TAP', refPath: 'missionId'});

Mission.schema.virtual('content.full').get(function() {
	return this.content.extended || this.content.brief;
});

Mission.defaultColumns = 'title, missionId|20%';
Mission.register();
