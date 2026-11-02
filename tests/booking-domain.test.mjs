import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedTransitions, statusLabels } from '../lib/booking-domain.mjs';

test('a pending reservation can be confirmed, rejected or cancelled', () => {
  assert.deepEqual(allowedTransitions('pending'), ['confirmed','rejected','cancelled']);
});
test('a confirmed reservation can be completed, cancelled or marked absent', () => {
  assert.deepEqual(allowedTransitions('confirmed'), ['completed','cancelled','no_show']);
});
test('terminal and unknown statuses have no available transitions', () => {
  for (const status of ['completed','cancelled','rejected','no_show','unknown']) assert.deepEqual(allowedTransitions(status), []);
});
test('all transitions have a display label', () => {
  for (const status of ['pending','confirmed']) for (const next of allowedTransitions(status)) assert.ok(statusLabels[next]);
});
