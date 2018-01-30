/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/messages              ->  index
 */

'use strict';


var User = require('../user/user.model');
var Campaign = require('../user/campaign.model');
var Message = require('./message.model');
var async = require('async');

var validationError = function(res, err) {
  return res.json(422, err);
};

exports.get = function(req, res){
	var next = req.query.next || 0;
	Message.find({user: req.user._id}).sort('-created').skip(next).limit(10).exec(function(err, messages){
		if(err) res.status(400).send();
		else
			res.json(messages);
	});
};

exports.sendSMS = function(req, res){
	if(req.body.to.length>req.user.sms_service.available_credits)
		res.status(400).send('You donot have enough credits. Please recharge.');
    else if(req.body.asap == true){
    	User.findById(req.user._id, function(err, user){
    		user.sms_service.available_credits = user.sms_service.available_credits-req.body.to.length;
    		user.save(function(){
    			Campaign.findOne({name: req.body.campaign.name},'name _id', function(err, campaign){
					if(campaign==null){
						var camp = new Campaign({name:req.body.campaign.name, user:req.user._id});
						camp.save(function(err, campaign){
							var message = new Message({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, sms_options: {to: req.body.to, sender_id:req.body.sender_id, body: req.body.body}, asap: req.body.asap, success_rate:-2});
							message.save(function(err, msg){
								send(req, msg._id);
    							res.send();
							});
						});
					}else{
						var message = new Message({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, sms_options: {to: req.body.to, sender_id:req.body.sender_id, body: req.body.body}, asap: req.body.asap, success_rate:-2});
						message.save(function(err, msg){
							send(req, msg._id);
    						res.send();
						});
					}
				});
    		});
    	});
	}else{
		Campaign.findOne({name: req.body.campaign.name},'name _id', function(err, campaign){
			if(campaign==null){
				var camp = new Campaign({name:req.body.campaign.name, user:req.user._id});
				camp.save(function(err, campaign){
					var schedule = new Date(req.body.schedule.date);
					schedule.setTime((new Date(req.body.schedule.time)).getTime());
					var message = new Message({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, sms_options: {to: req.body.to, sender_id:req.body.sender_id, body: req.body.body}, asap: req.body.asap, schedule: {timestamp: schedule}});
					message.save(function(err){
						if(err) res.status(400).send('Some problem occured while scheduling.');
						else{
							var user = req.user;
							user.sms_service.available_credits = user.sms_service.available_credits-req.body.to.length;
							user.save();
							res.send();
						}
					});
				});
			}else{
				var schedule = new Date(req.body.schedule.date);
				schedule.setTime((new Date(req.body.schedule.time)).getTime());
				var message = new Message({user: req.user._id, campaign:{name:campaign.name, _id:campaign._id}, template_id: req.body.template_id, sms_options: {to: req.body.to, sender_id:req.body.sender_id, body: req.body.body}, asap: req.body.asap, schedule: {timestamp: schedule}});
				message.save(function(err){
					if(err) res.status(400).send('Some problem occured while scheduling.');
					else{
						var user = req.user;
						user.sms_service.available_credits = user.sms_service.available_credits-req.body.to.length;
						user.save();
						res.send();
					}
				});
			}
		});
	}
};

var send = function(req, messageID){
	var http = require('http');
    var username = 't4posistapi';
    var password = '674453';
    var Senderid = req.body.sender_id;
	var messages = [];
	async.each(req.body.to, function(receiver, callback){
		var message = renderMessage(req.body.body, receiver);
  		var options_alert = {
	      host: 'nimbusit.net',
	      method: 'GET',
	      path: '/api.php?username='+username+'&password='+password+'&sender='+Senderid+'&sendto='+receiver.mobile+'&message='+message
	    };
		http.request(options_alert, function(response) {
			response.on('data',function(d){
				console.log(d);
			});
			if(response.statusCode==200){
				console.log('message sent');
	      		var obj = { to: receiver.mobile, message: 1};
	      	}else{
				console.log(err);
	      		var obj = { to: receiver, message: -1};
			}
			messages.push(obj);
	    	callback();
	  	}).end();
	}, function(err){
		if(err) console.log('Some problem occured while messaging.'+req.user);
		else {
			var success_rate, success=0;
			messages.forEach(function(msg){
				if(msg.message == 1)
					success++;
			});
			success_rate = (success/messages.length)*100;
      console.log(success_rate);
			Message.findByIdAndUpdate(messageID, {results: messages, success_rate: success_rate}, function(err, message){
				var user = req.user;
				user.sms_service.available_credits = user.sms_service.available_credits+(messages.length-success);
				user.save();
			});
		}
	});
};

var renderMessage = function(template, receiver){
	var match;
	var regex = new RegExp("{{(.*?)}}", "g");
	var templateCopy = template;
	while((match = regex.exec(template))!== null){
		templateCopy = templateCopy.replace(match[0], receiver[match[1]]);
	}
	templateCopy = templateCopy.replace(/\s/g,'+');
	return templateCopy;
};

exports.scheduler = function(req, res){
	res.send();
	var today = new Date();
	var http = require('http');
    var username = 't4posistapi';
    var password = '674453';
	var messages = [];
	Message.findOne({"schedule.timestamp": {$lte: today} , asap:false, success_rate:-1}).exec(function(err, sc_message){
		if(sc_message!=null){
			var Senderid = sc_message.sms_options.sender_id;
			async.each(sc_message.sms_options.to, function(receiver, callback){
				var message = renderMessage(sc_message.sms_options.body, receiver);
		  		var options_alert = {
			      host: 'nimbusit.net',
			      method: 'GET',
			      path: '/api.php?username='+username+'&password='+password+'&sender='+Senderid+'&sendto='+receiver.mobile+'&message='+message
			    };
				http.request(options_alert, function(response) {
					if(response.statusCode==200){
						console.log('message sent');
			      		var obj = { to: receiver.mobile, message: 1};
			      	}else{
						console.log(err);
			      		var obj = { to: receiver, message: -1};
					}
					messages.push(obj);
			    	callback();
			  	}).end();
			}, function(err){
				if(err) console.log('Some problem occured while messaging.');
				else {
					var success_rate, success=0, failure=0;
					messages.forEach(function(msg){
						if(msg.message == 1)
							success++;
					});
					success_rate = (success/messages.length)*100;
					sc_message.results = messages;
					sc_message.success_rate = success_rate;
					sc_message.save(function(err){
						var credits = sc_message.sms_options.to.length - success;
						if(credits!=0){
							User.findById(sc_message.user, function(err, user){
								user.sms_service.available_credits+=credits;
								user.save();
							});
						}
					});
				}
			});
		}
	});
};
