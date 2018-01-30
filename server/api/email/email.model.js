'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EmailSchema = new Schema({
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
  provider: String,
  asap: Boolean,
  mail_options:{},
  schedule:{},
  results: [],
  success_rate: {
    type: Number,
    default: -1
  },
  campaign:{}
});

module.exports = mongoose.model('Email', EmailSchema);