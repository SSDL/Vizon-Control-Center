var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * CAP Model
 * ==========
 */

var CAP = new keystone.List('CAP', {
	track: true,
	map: { name: 'ID' },
	autokey: { path: 'slug', from: 'ID missionId ', unique: true }
});

CAP.add({
	ID: { type: String, required: true },
	missionId: { type: Types.Relationship, ref: 'Mission', index: true, many: true, initial: true , required: true},
	name: { type: String, initial : true },
	length: { type: Number, required: true, initial: true },
	package: {type: Types.TextArray, initial: true}
});

CAP.defaultColumns = 'ID, name, length, missionId|20%';
CAP.register();
