require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatEnquiryUuid, normalizeEnquirySectorCode } = require('../../lib/enquiries/enquiry-uuid.ts');

test('enquiry UUID includes the normalized Project Sector code', () => {
  const date = new Date(2026, 8, 17);
  assert.equal(formatEnquiryUuid('UAE', 'hos', date, 3), 'UAE-HOS-17092026-3');
  assert.equal(formatEnquiryUuid('KSA-CR', 'work force', date, 12), 'KSA-CR-WORK-FORCE-17092026-12');
  assert.equal(normalizeEnquirySectorCode('  HOS-03  '), 'HOS-03');
});

test('legacy unclassified Facilities retain the previous UUID structure', () => {
  assert.equal(formatEnquiryUuid('OMN', '', new Date(2026, 8, 17), 1), 'OMN-17092026-1');
});
