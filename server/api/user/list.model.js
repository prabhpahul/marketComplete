'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ListSchema = new Schema({
  created: {
    type: Date,
    default: Date.now()
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  name: String,
  data:[],
  medium: {
  	type: String,
  	enum: ['email','sms']
  }
});

ListSchema
  .path('name')
  .validate(function(name) {
    return name.length;
  }, 'List name cannot be blank');

ListSchema
  .path('name')
  .validate(function(value, respond) {
    var self = this;
    this.constructor.findOne({name: value, user: self.user, medium: self.medium}, function(err, list) {
      if(err) throw err;
      if(list) {
        if(self.id === list.id) return respond(true);
        return respond(false);
      }
      respond(true);
    });
}, 'The specified list name is already in use.');

module.exports = mongoose.model('List', ListSchema);