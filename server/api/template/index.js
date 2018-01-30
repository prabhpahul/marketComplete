'use strict';

var express = require('express');
var controller = require('./template.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/', auth.isAuthenticated(), controller.saveTemplate);
router.get('/', auth.isAuthenticated(), controller.getTemplates);
router.delete('/:id', auth.isAuthenticated(), controller.removeTemplate);
router.put('/:id', auth.isAuthenticated(), controller.editTemplate);

module.exports = router;
