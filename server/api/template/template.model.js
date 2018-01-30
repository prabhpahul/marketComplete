'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TemplateSchema = new Schema({
  name: {
  	type:String,
  	trim:true
  },
  user:{
    type: Schema.ObjectId,
    ref: 'User'
  },
  created: {
    type: Date,
    default: Date.now
  },
  body: {
  	type:String,
  	trim: true
  },
  type: {
    type: String,
    enum: ['email','sms']
  },
  private: Boolean
});

TemplateSchema
  .path('body')
  .validate(function(body) {
    return body.length;
  }, 'Message body cannot be blank');

TemplateSchema
  .path('name')
  .validate(function(name) {
    return name.length;
  }, 'Template name cannot be blank');

TemplateSchema
  .path('name')
  .validate(function(value, respond) {
    var self = this;
    this.constructor.findOne({name: value, user: self.user, type:self.type}, function(err, template) {
      if(err) throw err;
      if(template) {
        if(self.id === template.id) return respond(true);
        return respond(false);
      }
      respond(true);
    });
}, 'The specified template name is already in use.');

module.exports = mongoose.model('Template', TemplateSchema);