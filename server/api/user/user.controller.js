'use strict';

var User = require('./user.model');
var Campaign = require('./campaign.model');
var List = require('./list.model');
var passport = require('passport');
var config = require('../../config/environment');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
var request = require('request');
var crypto = require('crypto');
var shortid = require('shortid');
var async = require('async');

var validationError = function(res, err) {
  return res.json(422, err);
};

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function(req, res) {
  User.find({}, '-salt -hashedPassword', function (err, users) {
    if(err) return res.send(500, err);
    res.json(200, users);
  });
};

/**
 * Creates a new user
 */
exports.create = function (req, res) {
  var newUser = new User(req.body);
  newUser.provider = 'sendgrid';
  newUser.providerData = config.USERMAILER;
  newUser.save(function(err, user) {
    if (err) return validationError(res, err);
    //var SessionToken = jwt.sign({_id: user._id }, config.secrets.session, { expiresInMinutes: 60*24 });
    //res.json({ token: SessionToken });
    var cipher = crypto.createCipher('aes192', "posist");
    var hash = cipher.update(user.email, 'binary', 'hex');
    hash += cipher.final('hex');
    var mailer = nodemailer.createTransport(sgTransport(config.APPMAILER));
    var email = {
      to: user.email,
      from: 'market@posist.com',
      subject: 'Email Verification',
      html: 'Verify Email by clicking <a href="'+config.hostname+'/api/users/activate/'+hash+'">here</a>'
    };
    mailer.sendMail(email, function(err, sent) {
      if(err)
        console.log('Verification email has failed for:'+user.email);
      else
        console.log('Verification email is sent to:'+user.email);
      res.send();
    });
  });
};

exports.activate = function(req, res){
  if(req.params.code){
    var decipher = crypto.createDecipher('aes192', "posist");
    var useremail = decipher.update(req.params.code, 'hex', 'binary');
    useremail += decipher.final('binary');
    User.findOneAndUpdate({email:useremail}, {is_activated:true}, function(err, user){
      if (err) return validationError(res, err);
      var SessionToken = jwt.sign({_id: user._id }, config.secrets.session, { expiresInMinutes: 60*24 });
      res.redirect('/callback/'+SessionToken);
    });
  }else{
    res.status(403).send("Invalid activation link");
  }
};
/**
 * Get a single user
 */
exports.show = function (req, res, next) {
  var userId = req.params.id;

  User.findById(userId, function (err, user) {
    if (err) return next(err);
    if (!user) return res.send(401);
    res.json(user.profile);
  });
};

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = function(req, res) {
  User.findByIdAndRemove(req.params.id, function(err, user) {
    if(err) return res.send(500, err);
    return res.send(204);
  });
};

/**
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  User.findById(userId, function (err, user) {
    if(user.authenticate(oldPass)) {
      user.password = newPass;
      user.save(function(err) {
        if (err) return validationError(res, err);
        res.send(200);
      });
    } else {
      res.status(400).send('Incorrect current password.');
    }
  });
};

exports.forgotPassword = function(req, res){
  User.findOne({email: req.body.email}, function(err, user){
    if(err)
      res.status(500).send('Server Error. Please try again later.');
    else if(!user)
      res.status(400).send('No account with that email has been found');
    else{
      var password = shortid.generate();
      user.password = password;
      user.save(function(err, user){
        if (err) res.status(500).send('Server Error. Please try again later.');
        else{
          var mailer = nodemailer.createTransport(sgTransport(config.APPMAILER));
          var email = {
            to: user.email,
            from: 'admin@posist.com',
            subject: 'New password for marketing@posist.com',
            html: '<h3>Your new password is: '+password+'</h3>'
          };
          mailer.sendMail(email, function(err, sent) {
            if(err){
              console.log('Forgot password failed for:'+user.email);
              res.status(500).send('Server Error. Please try again later.');
            }else{
              console.log('Forgot password:'+user.email);
              res.send('An email has been sent to ' + user.email + ' with further instructions.');
            }
          });
        }
      });
    }
  });
};

exports.setProvider = function(req, res, next) {
  var userId = req.user._id;
  var provider = String(req.body.provider) || '';

  User.findById(userId, function (err, user) {
    if(user) {
      user.provider = provider;
      user.providerData = req.body.providerData || {};
      user.save(function(err) {
        if (err) return validationError(res, err);
        res.send(200);
      });
    } else {
      res.send(403);
    }
  });
};

exports.setSenderId = function(req, res, next) {
  var userId = req.user._id;
  var duplicate = false;
  req.user.sender_ids.forEach(function(id){
    if(req.body.name.toUpperCase() == id.name){
      duplicate=true;
    }
  });
  if(duplicate==false){
    User.findByIdAndUpdate(userId, {$addToSet:{sender_ids: {name: req.body.name.toUpperCase(), status: false, isNew:true}}}, function (err, user) {
      if(err) {
        res.send(403);
      } else {
        res.json({sender_ids: user.sender_ids});
      }
    });
  }else
    res.status(400).send('You have already requested for this ID.');
};

exports.setDeploymentId = function(req, res) {
  User.findByIdAndUpdate(req.user._id, {deployment_id: req.body.deployments}, function (err, user) {
    if(err) {
      res.send(403);
    } else {
      res.json({deployment_id: user.deployment_id});
    }
  });
};

exports.getDeploymentIds = function(req, res){
  var postData = {username: req.body.username, password:req.body.password};
  var opts = {
    url:'http://test.posist.net/api/deployments/getAuthDeployment',
    body: postData,
    json: true,
    method: 'post'
  };
  request(opts, function(error, response, data){
    console.log(data);
    if(!error && response.statusCode == 200){
      User.findByIdAndUpdate(req.user._id, {$addToSet: {deployments: {$each: data}}}, function(err, user){
        if(err) res.status(400).send("Failed to update your deployments.");
        else
          res.json({deployments: user.deployments});
      });
    }else{
      res.status(400).send("Invalid username or password.");
    }
  });
};

exports.importPosist = function(req, res){
  if(req.user.deployment_id.length==0)
    res.status(400).send('Tenant ID does not exist.');
  else{
    var customers = [];
    async.each(req.user.deployment_id, function(deployment, callback){
      request('http://test.posist.org/api/customers/getCustomerByDeployment?deployment_id='+deployment._id+'&auth=55fd6726474dde2422e5da26', function (error, response, data) {
        if (!error && response.statusCode == 200) {
          var docs = JSON.parse(data);
          var c = docs.map(function(customer){
            return {
              name: customer.firstname||'',
              mobile: customer.mobile||'',
              email: customer.email||'',
              address: customer.address1+' '+customer.address2||'',
              dob: customer.DOB?(new Date(customer.DOB)).toLocaleDateString('hi'):'',
              ma: customer.MA?(new Date(customer.MA)).toLocaleDateString('hi'):''
            };
          });
          customers = customers.concat(c);
          callback();
        }else{
          callback('error');
        }
      });
    }, function(err){
      if(err)
        res.status(400).send();
      else
        res.json({customers:customers});
    });
  }
  /*
  http://test.posist.org/api/customers/getCustomerByDeployment?deployment_id=555baa76034de05173e9fe3b&auth=55fd6726474dde2422e5da26
  -----------Code for testing offline----------
  var fs = require('fs');
  fs.readFile('./server/api/user/sample.json','utf8', function(err, data){
    console.log(err);
    var d = JSON.parse(data);
    d = d.map(function(customer){return {name:customer.firstname, mobile:customer.mobile,email:customer.email}});
    res.json({customers:d});
  });*/
};

exports.getCoupons = function(req, res){
  var offers = [];
  async.each(req.user.deployment_id, function(deployment, callback){
    request('http://test.posist.org/api/offers/getOnlineOfferCodeByDeployment?deployment_id='+deployment._id, function(error, response, data){
      if(!error && response.statusCode == 200){
        offers = offers.concat(JSON.parse(data));
        callback();
      }else{
        callback('error');
      }
    });
  }, function(err){
    if(err)
      res.status(400).send();
    else
      res.json({offers:offers});
  });
  //var offers = [{name:"Birthday Offer", codes:["ABC123","ABC234","QWE234"]}, {name:"Diwali Offer", codes:["ASD213","ZXC23","QW2112"]}];
  //res.json({offers:offers});
};

exports.getCampaigns = function(req, res){
  Campaign.find({user:req.user._id},'name', function(err, campaigns){
    if(err) res.status(400).send();
    else if(!campaigns)
      res.status(404).send();
    else
      res.json({data:campaigns});
  });
};

exports.saveList = function(req, res){
  var list = new List(req.body);
  list.user = req.user._id;
  list.save(function(err, list){
    if(err)
       return validationError(res, err);
    else{
      User.findByIdAndUpdate(req.user._id, {$addToSet:{lists: list._id}}, function(err, lists){
        if(err)
           return validationError(res, err);
        else
          res.send();
      });
    }
  });
};

exports.getLists = function(req, res){
  List.find({_id:{$in: req.user.lists}, medium: req.params.medium}, 'name data _id', function(err, lists){
    if(err)
      res.send(404);
    else
      res.json(lists.map(function(list){return {name: list.name, count:list.data.length, _id:list._id};}));
  });
};

exports.getList = function(req, res){
  List.findById(req.params.id, function(err, list){
    if(err)
      res.send(404);
    else
      res.json(list.data);
  });
};

exports.removeList = function(req, res){
  List.findByIdAndRemove(req.params.id, function(err, data){
    if(err) return res.send(500, err);
    else{
      User.findOne({_id:req.user._id}, function(err, user){
        if(err) return res.send(500, err);
        else{
          user.lists.remove(req.params.id);
          user.save(function(err, user){
            res.json(user);
          });
        }
      });
    }
  });
};
/**
 * Get my info
 */
exports.me = function(req, res, next) {
  var userId = req.user._id;
  User.findOne({
    _id: userId
  }, '-salt -hashedPassword -providerData -is_activated', function(err, user) { // don't ever give out the password or salt
    if (err) return next(err);
    if (!user) return res.json(401);
    res.json(user);
  });
};

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
  res.redirect('/');
};

