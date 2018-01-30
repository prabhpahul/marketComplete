'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
  user:{
    type: Schema.ObjectId,
    ref: 'User'
  },
  created: {
    type: Date,
    default: Date.now
  },
  template_id: {
  	type: Schema.ObjectId,
    ref: 'Template'
  },
  asap: Boolean,
  sms_options:{},
  schedule:{},
  results: [],
  success_rate: {
    type: Number,
    default: -1
  },
  campaign:{}
});

module.exports = mongoose.model('Message', MessageSchema);