'use strict';

angular.module('angFullstackApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('customers', {
        url: '/customers',
        templateUrl: 'app/admin/users.html',
        controller: 'AdminCtrl',
        resolve: {
          admin: function($cookieStore,$location,User){
            User.get(function(response){
              if(response.role !== 'admin'){
                $cookieStore.remove('token');
                $location.path('/unauthorized');
              }
            });
          }
        }
      }).state('requests', {
        url: '/requests',
        templateUrl: 'app/admin/requests.html',
        controller: 'RequestCtrl',
        resolve: {
          admin: function($cookieStore,$location,User){
            User.get(function(response){
              if(response.role !== 'admin'){
                $cookieStore.remove('token');
                $location.path('/unauthorized');
              }
            });
          }
        }
      });
  });