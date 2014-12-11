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

CAP.schema.post('save', function(tap) {
	CAP.model.populate(tap, 'missionId', function(err, data) {
		data = data.toObject();
		for (var k in data.missionId) {
			//console.log("In here!", data.missionId[k]);
			delete keystone.mongoose.connection.models[data.missionId[k].missionId + '-' + data.ID];
		}
		for (var k in data.missionId) {
			keystone.mongoose.connection.funcs.loadPacketModel(data.missionId[k].missionId + '-' + data.ID);
		}
	});
});

CAP.defaultColumns = 'ID, name, length, missionId|20%';
CAP.register();
