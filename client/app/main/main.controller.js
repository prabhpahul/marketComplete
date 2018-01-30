'use strict';

angular.module('angFullstackApp')
  .controller('MainCtrl', function ($scope, $http, Auth) {
  	$scope.authentication = Auth.getCurrentUser();
  	$scope.change = function(link){
      window.location.href=link;
    };
  });
