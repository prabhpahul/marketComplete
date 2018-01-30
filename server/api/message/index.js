'use strict';

var express = require('express');
var controller = require('./message.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/send', auth.isAuthenticated(), controller.sendSMS);
router.get('/', auth.isAuthenticated(), controller.get);
router.get('/scheduler', controller.scheduler);

module.exports = router;
