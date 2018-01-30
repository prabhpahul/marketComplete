'use strict';

var express = require('express');
var controller = require('./email.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/send', auth.isAuthenticated(), controller.sendMail);
router.get('/', auth.isAuthenticated(), controller.get);
router.post('/send/test', auth.isAuthenticated(), controller.testEmail);
router.get('/scheduler', controller.scheduler);

module.exports = router;
