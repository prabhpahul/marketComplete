'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CampaignSchema = new Schema({
  created: {
    type: Date,
    default: Date.now()
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  name: String
});

module.exports = mongoose.model('Campaign', CampaignSchema);