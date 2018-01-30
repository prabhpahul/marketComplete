'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TransactionSchema = new Schema({
  time: {
    type: Date,
    default: Date.now
  },
  customer: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  credit: Number,
  sign: Number,
  type: String
});

module.exports = mongoose.model('Transaction', TransactionSchema);