'use strict';

angular.module('angFullstackApp')
  .controller('SettingsCtrl', function ($scope, $uibModal, User, Auth, Email) {
    $scope.errors = {};
    $scope.user = Auth.getCurrentUser();

    $scope.changePassword = function(form) {
      $scope.submitted = true;
      $scope.nomatch = false;
      if(form.$valid && $scope.user.newPassword === $scope.user.rePassword) {
        Auth.changePassword( $scope.user.oldPassword, $scope.user.newPassword )
        .then( function() {
          $scope.message = 'Password successfully changed.';
          $scope.user.oldPassword = '';
          $scope.user.newPassword = '';
          $scope.user.rePassword = '';
          $scope.submitted = false;
        })
        .catch( function() {
          form.password.$setValidity('mongoose', false);
          $scope.errors.other = 'Incorrect password';
          $scope.message = '';
        });
      }else if($scope.user.newPassword !== $scope.user.rePassword){
        $scope.nomatch = true;
      }
		};

    $scope.setProvider = function(service){
      switch(service){
        case 'none':
          Auth.setProvider({provider: ''}).
            then(function(data){
              $scope.user.provider = '';
            }).catch(function(err){
              $scope.error = err;
            });
        break;
        case 'sendgrid': 
          $uibModal.open({
            animation:true,
            templateUrl: 'saveProviderSendgrid.html',
            scope: $scope,
            controller: 'sendgridCtrl',
            resolve: {
              service: function(){return 'sendgrid';}
            }
          });
        break;
        case 'mailchimp': 
          $uibModal.open({
            animation:true,
            templateUrl: 'saveProviderMailchimp.html',
            scope: $scope,
            controller: 'mailchimpCtrl',
            resolve: {
              service: function(){return 'mailchimp';}
            }
          });
        break;
      }
    };

    $scope.testEmail = function(){
      Email.testEmail().success(function(res){
        $scope.success = 'An email has been sent.';
        $scope.error = '';
      }).error(function(err){
        $scope.error = 'There was some problem in sending the email. Please check your credentials or try after sometime.';
        $scope.success = '';
      });
    };

  });
