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
	missionId: { type: String, required: true, initial: true},
	name: { type: String, required: false },
	authorizedUsers: { type: Types.Relationship, ref: 'User', index: true, many: true},
	TAPHeader: {type: Types.TextArray},
	CAPHeader: {type: Types.TextArray},
});

Mission.relationship({ path: 'taps', ref: 'TAP', refPath: 'missionId'});
Mission.relationship({ path: 'caps', ref: 'CAP', refPath: 'missionId'});
Mission.schema.post('save', function(mission) {
	keystone.list('TAP').model.where('missionId', mission._id).exec( function(err, taps) {
		for (var k in taps) {
			taps[k] = taps[k].toObject();
			delete keystone.mongoose.connection.models[mission.missionId + '-' + taps[k].ID];
		}
		keystone.mongoose.connection.funcs.loadPacketModel(mission.missionId + '-' + taps[0].ID.split('_')[0]);
	});
	keystone.list('CAP').model.where('missionId', mission._id).exec( function(err, caps) {
		for (var k in caps) {
			caps[k] = caps[k].toObject();
			delete keystone.mongoose.connection.models[mission.missionId + '-' + caps[k].ID];
		}
		keystone.mongoose.connection.funcs.loadPacketModel(mission.missionId + '-' + caps[0].ID.split('_')[0]);
	});
});
Mission.schema.methods.taps = function(cb){
  return keystone.list('TAP').model.find()
    .where('missionId', this.id )
    .exec(cb);
};

Mission.defaultColumns = 'missionId|20%, name|20%, authorizedUsers';
Mission.register();
