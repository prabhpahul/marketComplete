'use strict';

angular.module('angFullstackApp')
  .config(function ($stateProvider, $urlRouterProvider) {
  	
  	$urlRouterProvider.when("/email", "/email/newcampaign");

    $stateProvider
      .state('email', {
      	abstract: true,
        url: '/email',
        templateUrl: 'app/email/email.html',
        controller: 'EmailCtrl'
      })
      .state('email.campaign', {
        url: '/newcampaign',
        templateUrl: 'app/email/email.campaign.html',
        authenticate: true
      })
      .state('email.import', {
        url: '/import',
        templateUrl: 'app/email/email.import.html',
        authenticate: true
      })
      .state('email.create', {
        url: '/create',
        templateUrl: 'app/email/email.create.html',
        authenticate: true
      })
      .state('email.schedule', {
        url: '/schedule',
        templateUrl: 'app/email/email.schedule.html',
        authenticate: true,
        params: {body:null}
      }).state('email.view', {
        url: '/campaigns',
        templateUrl: 'app/email/email.view.html',
        authenticate: true
      });
  });