'use strict';

angular.module('angFullstackApp')
  .controller('NavbarCtrl', 
    function ($scope, $location, Auth) {
    $scope.menu = [
      {
        'title': 'Email',
        'link': '/email'
      },
      {
        'title': 'SMS',
        'link': '/sms'
      }
    ];

    $scope.isCollapsed = true;
    $scope.isLoggedIn = Auth.isLoggedIn;
    $scope.isAdmin = Auth.isAdmin;
    $scope.getCurrentUser = Auth.getCurrentUser;

    $scope.logout = function() {
      Auth.logout();
      $location.path('/login');
    };

    $scope.isActive = function(route) {
      return route === $location.path();
    };
  });