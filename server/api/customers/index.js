'use strict';

var express = require('express');
var controller = require('./customer.controller');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var router = express.Router();


router.put('/:id/email/topup', auth.hasRole('admin'), controller.updateEmailTopup);
router.put('/:id/sms/topup', auth.hasRole('admin'), controller.updateSMSTopup);
router.put('/:id/email/status', auth.hasRole('admin'), controller.updateEmailStatus);
router.put('/:id/sms/status', auth.hasRole('admin'), controller.updateSMSStatus);
router.put('/:id/sms/senderid', auth.hasRole('admin'), controller.updateSMSSenderId);
router.get('/search', auth.hasRole('admin'), controller.search);
router.get('/requests', auth.hasRole('admin'), controller.customerRequests);
router.get('/:id/:type/transactions', auth.hasRole('admin'), controller.getTransactionHistory);
router.get('/', auth.hasRole('admin'), controller.find);

module.exports = router;
