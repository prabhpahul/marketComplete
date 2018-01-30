'use strict';

var Customers = require('../user/user.model');
var Transaction = require('./transaction.model');
var Campaign = require('../user/campaign.model');
var passport = require('passport');
var config = require('../../config/environment');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');


var validationError = function(res, err) {
  return res.json(422, err);
};

exports.find = function(req, res){
	Customers.find({}, 'email username email_service.status email_service.available_credits sms_service.status sms_service.available_credits sender_ids').sort('-created').limit(req.query.limit).skip(req.query.skip).exec(function(err, customers){
		if(err) res.status(400).send();
		else
			res.json(customers);
	});
};

exports.search = function(req, res){
	Customers.findOne({$or:[{email: req.query.query}, {username: req.query.query}]},
		'email username email_service.status email_service.available_credits sms_service.status sms_service.available_credits sender_ids',
		function(err, customer){
		if(err) res.status(400).send();
		else
			res.json(customer);
	});
};

exports.updateEmailTopup = function(req, res){
	var transaction = new Transaction({credit: req.body.topup, sign: req.body.sign, customer:req.params.id, type:'email'});
	transaction.save(function(err, transaction){
		if(err) res.status(400).send();
		else{
			Customers.findById(req.params.id,function(err, customer){
				if(err) res.status(400).send();
				else{
					customer.email_service.history_credits.push(transaction._id);
					var available_credits = parseInt(customer.email_service.available_credits);
					customer.email_service.available_credits = available_credits+(parseInt(req.body.topup)*parseInt(req.body.sign));
					customer.save(function(err, customer){
						var subject = 'Email Credits Updated';
						var html = req.body.sign==1?'<h4>Your email credits have been recharged by '+req.body.topup+'. Your available credits are now '+customer.email_service.available_credits+'.':'<h4>Your email credits have been discharged by '+req.body.topup+'. Your available credits are now '+customer.email_service.available_credits+'.';
						sendMail(customer.email, subject, html, function(){
							res.json(customer);
						});
					});
				}
			});
		}
	});
};

exports.updateSMSTopup = function(req, res){
	var transaction = new Transaction({credit: req.body.topup, sign: req.body.sign, customer:req.params.id, type:'sms'});
	transaction.save(function(err, transaction){
		if(err) res.status(400).send();
		else{
			Customers.findById(req.params.id,function(err, customer){
				if(err) res.status(400).send();
				else{
					customer.sms_service.history_credits.push(transaction._id);
					var available_credits = parseInt(customer.sms_service.available_credits);
					customer.sms_service.available_credits = available_credits+(parseInt(req.body.topup)*parseInt(req.body.sign));
					customer.save(function(err, customer){
						var subject = 'SMS Credits Updated';
						var html = req.body.sign==1?'<h4>Your SMS credits have been recharged by '+req.body.topup+'. Your available credits are now '+customer.sms_service.available_credits+'.':'<h4>Your SMS credits have been discharged by '+req.body.topup+'. Your available credits are now '+customer.sms_service.available_credits+'.';
						sendMail(customer.email, subject, html, function(){
							res.json(customer);
						});
					});
				}
			});
		}
	});
};

exports.getTransactionHistory = function(req, res){
	Transaction.find({customer: req.params.id, type:req.params.type}).sort('-time').exec(function(err, transactions){
		if(err) res.status(400).send();
		else{
			res.json(transactions);
		}
	});
};

exports.updateEmailStatus = function(req, res){
	Customers.findByIdAndUpdate(req.params.id, {$set:{'email_service.status': req.body.status, isNew:false}}, function(err, customer){
		if(err) res.status(400).send();
		else
			res.json(customer);
	});
};

exports.updateSMSStatus = function(req, res){
	Customers.findByIdAndUpdate(req.params.id, {$set:{'sms_service.status': req.body.status, isNew:false}}, function(err, customer){
		if(err) res.status(400).send();
		else
			res.json(customer);
	});
};

exports.updateSMSSenderId = function(req, res){
	Customers.findOneAndUpdate({"_id":req.params.id, "sender_ids.name":req.body.sender_id}, {$set: { "sender_ids.$.status" : req.body.status, "sender_ids.$.isNew" : false } } , function(err, customer){
		if(err){
			console.log(err);
			res.status(400).send();
		}else{
			if(req.body.status==true){
				var subject = 'Sender ID Activated';
				var html = '<h5>Your Sender ID <b>'+req.body.sender_id+'</b> for POSist marketing panel has been activated. Now you can send SMS with this ID.</h5>';
				sendMail(customer.email, subject, html, function(){
					res.json(customer);
				});
			}else if(req.body.reason){
				Customers.findOneAndUpdate({"_id":req.params.id}, {$pull: {sender_ids:{name: req.body.sender_id}}}, function(err, customer){
					var subject = 'Sender ID Not Approved';
					var html = '<h5>Your Sender ID <b>'+req.body.sender_id+'</b> for POSist marketing panel has been disapproved due to the following reason - <i>'+req.body.reason+'</i></h5>';
					sendMail(customer.email, subject, html, function(){
						res.json(customer);
					});
				});
			}else{
				var subject = 'Sender ID De-Activated';
				var html = '<h5>Your Sender ID <b>'+req.body.sender_id+'</b> for POSist marketing panel has been de-activated as of '+(new Date()).toDateString()+'</h5>';
				sendMail(customer.email, subject, html, function(){
					res.json(customer);
				});
			}
		}
	});
};

var sendMail = function(to, subject, html, callback){
	var email = {
		to: to,
	    from: 'marketing@posist.com',
	    subject: subject,
	    html: html
	};
	var mailer = nodemailer.createTransport(sgTransport(config.APPMAILER));
	mailer.sendMail(email, function(err, sent) {
		console.log(err, sent);
		callback();
	});
};

exports.customerRequests = function(req, res){
	Customers.aggregate([
		{
			$unwind: '$sender_ids'
		},
		{
			$match: {'sender_ids.status':false, 'sender_ids.isNew':true}
		},
		{
			$project:{'_id':1, 'email':1, 'username':1, 'sender_ids':1}
		}
	], function(err, customers){
		if(err) res.status(400).send();
		else
			res.json(customers);
	});
};
