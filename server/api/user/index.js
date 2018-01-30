'use strict';

var express = require('express');
var controller = require('./user.controller');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);

router.post('/lists', auth.isAuthenticated(), controller.saveList);
router.get('/lists/:medium', auth.isAuthenticated(), controller.getLists);
router.get('/list/:id', auth.isAuthenticated(), controller.getList);
router.delete('/list/:id', auth.isAuthenticated(), controller.removeList);

router.put('/:id/provider', auth.isAuthenticated(), controller.setProvider);
router.get('/:id/posist', auth.isAuthenticated(), controller.importPosist);
router.put('/:id/senderid', auth.isAuthenticated(), controller.setSenderId);
router.put('/:id/deploymentid', auth.isAuthenticated(), controller.setDeploymentId);
router.post('/:id/deploymentid', auth.isAuthenticated(), controller.getDeploymentIds);
router.get('/:id/coupons', auth.isAuthenticated(), controller.getCoupons);
router.get('/:id/campaigns', auth.isAuthenticated(), controller.getCampaigns);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.post('/password', controller.forgotPassword);
//router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', controller.create);

router.get('/activate/:code', controller.activate);

module.exports = router;
