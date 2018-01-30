/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/messages              ->  index
 */

'use strict';


var User = require('../user/user.model');
var Template = require('./template.model');
var async = require('async');

var validationError = function(res, err) {
  return res.json(422, err);
};

// Save a Template
exports.saveTemplate = function(req, res){
	var template = new Template(req.body);
	template.type = req.body.type;
	template.user = req.user._id;
	template.private = true;
	template.save(function(err, template){
		if (err) return validationError(res, err);
		else
			res.json(template);
	});
};

exports.getTemplates = function(req, res){
	Template.find({user: req.user._id, type:req.query.type}, function(err, templates){
		if(err)
			res.status(400).send();
		else
			res.json(templates);
	});
};

exports.removeTemplate = function(req, res){
	Template.findByIdAndRemove(req.params.id, function(err, data){
		if(err) return res.send(500, err);
    	return res.send(204);
	});
};

exports.editTemplate = function(req, res){
	Template.findOneAndUpdate({_id:req.params.id}, {body: req.body.body}, function(err, template){
		if(err) return res.status(500).send();
    	return res.json(template);
	});
};



