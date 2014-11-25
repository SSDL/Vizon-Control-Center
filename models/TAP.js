var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * TAP Model
 * ==========
 */

var TAP = new keystone.List('TAP', {
	map: { name: 'ID' },
	autokey: { path: 'slug', from: 'ID', unique: true }
});

TAP.add({
	ID: { type: String, required: true },
	missionId: { type: Types.Relationship, ref: 'Mission', index: true, many: true, initial: true , required: true},
	name: { type: String },
	length: { type: Number, required: true, initial: true },
	header: { type: Types.TextArray, required: true, initial: true},
	package: {type: Types.TextArray, required: true, initial: true}
});

TAP.defaultColumns = 'ID, name, length, missionId|20%';
TAP.register();
