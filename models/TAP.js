var keystone = require('keystone'),
	Types = keystone.Field.Types;
	

/**
 * TAP Model
 * ==========
 */

var TAP = new keystone.List('TAP', {
	track: true,
	map: { name: 'ID' },
	autokey: { path: 'slug', from: 'ID missionId ', unique: true }
});

TAP.add({
	ID: { type: String, required: true },
	missionId: { type: Types.Relationship, ref: 'Mission', index: true, many: true, initial: true , required: true},
	name: { type: String, required: true, initial: true },
	length: { type: Number, required: true, initial: true },
	package: {type: Types.TextArray, required: true, initial: true}
});

TAP.schema.post('save', function(tap) {
	TAP.model.populate(tap, 'missionId', function(err, data) {
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

function validator (val, callback) {
	console.log(val);
	callback(true);
}

TAP.schema.path('missionId').validate( validator, 'validation of `{PATH}` failed with value `{VALUE}`');

TAP.defaultColumns = 'ID, name, length, missionId|20%';
TAP.register();
