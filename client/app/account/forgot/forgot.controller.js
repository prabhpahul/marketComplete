'use strict';

angular.module('angFullstackApp')
  .controller('ForgotCtrl', function ($scope, Auth, $location) {
    $scope.user = {};
    $scope.errors = {};

    $scope.submit = function(form) {
      $scope.submitted = true;
      $scope.error = '';
      if(form.$valid) {
        Auth.forgotPassword({
          email: $scope.user.email
        })
        .then( function(data) {
          $scope.user.email = '';
          $scope.success = data;
          $scope.submitted = false;
        })
        .catch( function(err) {
          $scope.error = err;
          $scope.submitted = false;
        });
      }
    };

  });
