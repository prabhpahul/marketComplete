'use strict';

angular.module('angFullstackApp')
  .controller('SignupCtrl', function ($scope, Auth, $location) {
    $scope.user = {};
    $scope.errors = {};

    $scope.register = function(form) {
      $scope.submitted = true;

      if(form.$valid) {
        Auth.createUser({
          name: $scope.user.name,
          username: $scope.user.username,
          password: $scope.user.password,
          email: $scope.user.email
        })
        .then( function() {
          // Account created, redirect to home
          $scope.user.name = '';
          $scope.user.username = '';
          $scope.user.password = '';
          $scope.user.email = '';
          $scope.submitted = false;
          $scope.success = 'An Email has been sent for verification.';
        })
        .catch( function(err) {
          err = err.data;
          $scope.errors = {};

          // Update validity of form fields that match the mongoose errors
          angular.forEach(err.errors, function(error, field) {
            form[field].$setValidity('mongoose', false);
            $scope.errors[field] = error.message;
          });
        });
      }
    };

  });
