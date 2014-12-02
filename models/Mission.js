var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * Mission Model
 * ==========
 */

var Mission = new keystone.List('Mission', {
	map: { name: 'missionId' },
	autokey: { path: 'slug', from: 'missionId', unique: true }
});

Mission.add({
	title: { type: String, required: false },
	missionId: { type: String, required: true },
	authorizedUsers: { type: Types.Relationship, ref: 'User', index: true, many: true},
	TAPHeader: {type: Types.TextArray},
	CAPHeader: {type: Types.TextArray}
});

Mission.relationship({ path: 'taps', ref: 'TAP', refPath: 'missionId'});

Mission.schema.methods.taps = function(cb){
  return keystone.list('TAP').model.find()
    .where('missionId', this.id )
    .exec(cb);
};

Mission.defaultColumns = 'missionId, title';
Mission.register();
