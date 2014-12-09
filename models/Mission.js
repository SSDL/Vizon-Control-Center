var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * Mission Model
 * ==========
 */

var Mission = new keystone.List('Mission', {
	track: true,
	map: { name: 'missionId' },
	autokey: { path: 'slug', from: 'missionId', unique: true }
});

Mission.add({
	missionId: { type: Number, required: true, initial: true},
	name: { type: String, required: false },
	authorizedUsers: { type: Types.Relationship, ref: 'User', index: true, many: true},
	TAPHeader: {type: Types.TextArray},
	CAPHeader: {type: Types.TextArray},
});

Mission.relationship({ path: 'taps', ref: 'TAP', refPath: 'missionId'});

Mission.schema.methods.taps = function(cb){
  return keystone.list('TAP').model.find()
    .where('missionId', this.id )
    .exec(cb);
};

Mission.defaultColumns = 'missionId|20%, name|20%, authorizedUsers';
Mission.register();
