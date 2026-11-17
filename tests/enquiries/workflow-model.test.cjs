require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

test('workflow model refreshes a cached schema that predates role colors', () => {
  // Next.js hot reload retains compiled Mongoose models across source edits.
  const legacy = mongoose.model('eq_enquiry_workflow', new mongoose.Schema({
    client_id: mongoose.Schema.Types.ObjectId,
    revision: Number,
    roles: [{ subname: String, name: String }],
    stages: [{ name: String, role_id: mongoose.Schema.Types.ObjectId }],
  }));
  assert.equal(legacy.schema.path('roles').schema.path('color_code'), undefined);
  const Workflow = require('../../models/eq_enquiry_workflow.model.ts').default;
  assert.ok(Workflow.schema.path('roles').schema.path('color_code'));
  const now = new Date();
  const doc = new Workflow({ client_id: new mongoose.Types.ObjectId(), roles: [
    { subname: 'AM', name: 'Account Manager', color_code: '#FBBF24', createdAt: now, updatedAt: now },
    { subname: 'CD', name: 'Coordinator', color_code: '#A78BFA', createdAt: now, updatedAt: now },
  ] });
  assert.ifError(doc.validateSync());
  assert.deepEqual(doc.toObject().roles.map(role => role.color_code), ['#fbbf24', '#a78bfa']);
});
