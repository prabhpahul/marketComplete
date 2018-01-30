'use strict';

angular.module('angFullstackApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('main', {
        url: '/',
        templateUrl: 'app/main/main.html',
        controller: 'MainCtrl'
      }).state('auth',{
        url: '/callback/:token',
        template: '',
        controller: function($state){
          $state.go('login');
        },
        resolve: {
          user: function($stateParams, $cookieStore){
            if($stateParams.token){
               $cookieStore.put('token', $stateParams.token);
            }
          } 
        }
      }).state('unauthorized', {
        url: '/unauthorized',
        template: '<h1 style="text-align:center" class="container">You are unauthorized to access this account.<br>Please login again to continue.</h1>'
      });
  });