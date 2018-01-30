/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/emails              ->  index
 */

'use strict';

var User = require('../user/user.model');
var Campaign = require('../user/campaign.model');
var Email = require('./email.model');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var mandrillTransport = require('nodemailer-mandrill-transport');
var async = require('async');
var config = require('../../config/environment');

var validationError = function(res, err) {
  return res.json(422, err);
};


exports.get = function(req, res){
	var next = req.query.next || 0;
	Email.find({user: req.user._id}).sort('-created').skip(next).limit(10).exec(function(err, emails){
		if(err) res.status(400).send();
		else
			res.json(emails);
	});
};

exports.sendMail = function(req, res){
	var mailer = null;
	var options = null;
	var provider = null;
	var mails = [];
	if(req.body.to.length>req.user.email_service.available_credits)
		res.status(400).send('You donot have enough credits. Please recharge.');
	else if(req.body.asap == true){
		User.findById(req.user._id, 'provider providerData email_service', function(err, user){
			if(err) res.status(400).send('Cannot find a mail service provider.');
			else{
				provider = user.provider;
				options = user.providerData;
				switch(provider){
					case 'mailchimp':
						mailer = nodemailer.createTransport(mandrillTransport(options));
					break;
					case 'sendgrid':
						mailer = nodemailer.createTransport(sgTransport(options));
					break;
				}
				user.email_service.available_credits = user.email_service.available_credits-req.body.to.length;
				user.save(function(){
					Campaign.findOne({name: req.body.campaign.name},'name _id', function(err, campaign){
						if(campaign==null){
							var camp = new Campaign({name:req.body.campaign.name, user:req.user._id});
							camp.save(function(err, campaign){
								var email = new Email({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, provider:provider, mail_options: {to: req.body.to, from:req.body.from, subject: req.body.subject, body: req.body.html}, asap: req.body.asap, success_rate: -2});
								email.save(function(err, emailID){
									send(req, mailer, provider, emailID);
									res.send();
								});
							});
						}else{
							var email = new Email({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, provider:provider, mail_options: {to: req.body.to, from:req.body.from, subject: req.body.subject, body: req.body.html}, asap: req.body.asap, success_rate: -2});
							email.save(function(err, emailID){
								send(req, mailer, provider, emailID);
								res.send();
							});
						}
					});
				});
			}
		});
	}else{
		Campaign.findOne({name: req.body.campaign.name},'name _id', function(err, campaign){
			if(campaign==null){
				var camp = new Campaign({name:req.body.campaign.name, user:req.user._id});
				camp.save(function(err, campaign){
					var schedule = new Date(req.body.schedule.date);
					schedule.setTime((new Date(req.body.schedule.time)).getTime());
					var email = new Email({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, provider:req.body.provider, mail_options: {to: req.body.to, from:req.body.from, subject: req.body.subject, body: req.body.html}, asap: req.body.asap, schedule: {timestamp: schedule}});
					email.save(function(err){
						if(err) res.status(400).send('Some problem occured while scheduling.');
						else{
							var user = req.user;
							user.email_service.available_credits = user.email_service.available_credits-req.body.to.length;
							user.save();
							res.send();
						}
					});
				});
			}else{
				var schedule = new Date(req.body.schedule.date);
				schedule.setTime((new Date(req.body.schedule.time)).getTime());
				var email = new Email({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, provider:req.body.provider, mail_options: {to: req.body.to, from:req.body.from, subject: req.body.subject, body: req.body.html}, asap: req.body.asap, schedule: {timestamp: schedule}});
				email.save(function(err){
					if(err) res.status(400).send('Some problem occured while scheduling.');
					else{
						var user = req.user;
						user.email_service.available_credits = user.email_service.available_credits-req.body.to.length;
						user.save();
						res.send();
					}
				});
			}
		});
	}
};

var send = function(req, mailer, provider, emailID){
	var mails = [];
	async.each(req.body.to, function(receiver, callback){
		var email = {
			to: receiver.email,
		    from: req.body.from,
		    subject: req.body.subject,
		    html: renderEmail(req.body.html, receiver)
		};
		mailer.sendMail(email, function(err, sent) {
		    var obj = {};
		    if (err) { 
		        console.log(err);
		        obj = {to: receiver.email, status:-1, result: {message: 'Mailer failed.'}} 
		    }else{ 
		    	console.log(sent);
		    	switch(provider){
		    		case 'mailchimp':
		    			if(sent.accepted.length!=0)
		    				obj = {to: receiver.email, status: 1, result: sent}
		    			else
		    				obj = {to: receiver.email, status: -1, result: sent}
		    		break;
		    		case 'sendgrid':
		    			if(sent.message=='success')
		    				obj = {to: receiver.email, status: 1, result: sent}
		    			else
		    				obj = {to: receiver.email, status: -1, result: sent}
		    		break;
		    	}					    	
		    }
		    mails.push(obj);
		    callback();
		});
	}, function(err){
		if(err) console.log('Some problem occured while mailing from'+req.user);
		else {
			var success_rate, success=0, failure=0;
			mails.forEach(function(mail){
				if(mail.status == 1)
					success++;
			});
			success_rate = (success/mails.length)*100;
			Email.findByIdAndUpdate(emailID, {results: mails, success_rate: success_rate}, function(err, mail){
				var user = req.user;
				user.email_service.available_credits = user.email_service.available_credits+(mails.length-success);
				user.save();
			});
		}
	});
};

var renderEmail = function(template, receiver){
	var match;
	var regex = new RegExp("{{(.*?)}}", "g");
	var templateCopy = template;
	while((match = regex.exec(template))!== null){
		templateCopy = templateCopy.replace(match[0], receiver[match[1]]);
	}
	return templateCopy;
};

exports.testEmail = function(req, res){
	var mailer = null;
	var options = null;
	var provider = null;
	var mails = [];
	
	User.findById(req.user._id, 'provider providerData email email_service', function(err, user){
		if(err) res.status(400).json({to:user.email,status:-1,message:'Cannot find a mail service provider.'});
		else if(user.email_service.available_credits<=0)
			res.status(400).send('You donot have enough credits. Please recharge.');
		else{
			provider = user.provider;
			options = user.providerData;
			switch(provider){
				case 'mailchimp':
					mailer = nodemailer.createTransport(mandrillTransport(options));
				break;
				case 'sendgrid':
					mailer = nodemailer.createTransport(sgTransport(options));
				break;
			};
			if(req.body.html)
				var body = renderEmail(req.body.html, req.body.receiver);
			else
				var body = '<h4>This is a test email from marketing.posist.co through your email service provider '+user.provider+'.</h4>';
			
			var email = {
				to: user.email,
			    from: 'marketing@posist.com',
			    subject: 'Test Email from marketing.posist.co',
			    html: body
			};
			mailer.sendMail(email, function(err, sent) {
			    var obj = {};
			    if (err) { 
			        console.log(err);
			        res.status(400).json({to: user.email, status:-1, result: {message: 'Failed to send Email.'}}); 
			    }else{ 
			    	console.log(sent);
			    	switch(provider){
			    		case 'mailchimp':
			    			if(sent.accepted.length!=0)
			    				res.status(200).json({to: user.email, status: 1, result: sent});
			    			else
			    				res.status(400).json({to: user.email, status: -1, result: sent});
			    		break;
			    		case 'sendgrid':
			    			if(sent.message=='success'){
			    				var u = req.user;
			    				u.email_service.available_credits = u.email_service.available_credits - 1;
			    				u.save();
			    				res.status(200).json({to: user.email, status: 1, result: sent});
			    			}else{
			    				res.status(400).json({to: user.email, status: -1, result: sent});
			    			}
			    		break;
			    	}				    	
			    }
			});
		}
	});
};

exports.scheduler = function(req, res){
	res.send();
	var today = new Date();
	Email.findOne({"schedule.timestamp":{$lte: today}, asap:false, success_rate:-1}).exec(function(err, sc_email){
		if(sc_email!=null){
			sc_email.success_rate = 0;
			sc_email.save();
			var mails = [];
			async.each(sc_email.mail_options.to, function(receiver,callback){
				var email = {
					to: receiver.email,
				    from: sc_email.mail_options.from,
				    subject: sc_email.mail_options.subject,
				    html: renderEmail(sc_email.mail_options.body, receiver)
				};
				var mailer = nodemailer.createTransport(sgTransport(config.USERMAILER));
				mailer.sendMail(email, function(err, sent) {
				    var obj = {};
				    if (err) { 
				        console.log(err);
				        obj = {to: receiver.email, status:-1, result: {message: 'Mailer failed.'}} 
				    }else{ 
		    			if(sent.message=='success')
		    				obj = {to: receiver.email, status: 1, result: sent}
		    			else
		    				obj = {to: receiver.email, status: -1, result: sent}
			    	}					    	
				    mails.push(obj);
				    callback();
				});
			}, function(err){
				var success_rate, success=0, failure=0;
				mails.forEach(function(mail){
					if(mail.status == 1)
						success++;
				});
				success_rate = (success/mails.length)*100;
				sc_email.results = mails;
				sc_email.success_rate = success_rate;
				sc_email.save(function(err){
					var credits = sc_email.mail_options.to.length - success;
					if(credits!=0){
						User.findById(sc_email.user, function(err, user){
							user.email_service.available_credits+=credits;
							user.save();
						});
					}
				});
			});
		}
	});
};