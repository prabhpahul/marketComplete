'use strict';

angular.module('angFullstackApp')
  .config(function ($stateProvider, $urlRouterProvider) {
  	
  	$urlRouterProvider.when("/sms", "/sms/newcampaign");

    $stateProvider
      .state('sms', {
      	abstract: true,
        url: '/sms',
        templateUrl: 'app/sms/sms.html',
        controller: 'SMSCtrl'
      })
      .state('sms.campaign', {
        url: '/newcampaign',
        templateUrl: 'app/sms/sms.campaign.html',
        authenticate: true
      })
      .state('sms.import', {
        url: '/import',
        templateUrl: 'app/sms/sms.import.html',
        authenticate: true
      })
      .state('sms.create', {
        url: '/create',
        templateUrl: 'app/sms/sms.create.html',
        authenticate: true
      })
      .state('sms.schedule', {
        url: '/schedule',
        templateUrl: 'app/sms/sms.schedule.html',
        authenticate: true
      })
      .state('sms.view', {
        url: '/campaigns',
        templateUrl: 'app/sms/sms.view.html',
        authenticate: true
      });
  });