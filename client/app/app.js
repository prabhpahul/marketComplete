'use strict';

angular.module('angFullstackApp', [
  'ngCookies',
  'ngResource',
  'ngAnimate',
  'ui.router',
  'ui.bootstrap',
  'textAngular',
  'angular-loading-bar'
])
  .config(function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider, cfpLoadingBarProvider) {
    $urlRouterProvider
      .otherwise('/');
    cfpLoadingBarProvider.includeBar = true;
    cfpLoadingBarProvider.includeSpinner = true;
    $locationProvider.html5Mode(true);
    $httpProvider.interceptors.push('authInterceptor');
  })

  .factory('authInterceptor', function ($rootScope, $q, $cookieStore, $location) {
    return {
      // Add authorization token to headers
      request: function (config) {
        config.headers = config.headers || {};
        if ($cookieStore.get('token')){
          config.headers.Authorization = 'Bearer ' + $cookieStore.get('token');
        }
        return config;
      },

      // Intercept 401s and redirect you to login
      responseError: function(response) {
        if(response.status === 403) {
          // remove any stale tokens
          $cookieStore.remove('token');
          window.location.href='/unauthorized';
          return $q.reject(response);
        }
        else {
          return $q.reject(response);
        }
      }
    };
  })

  .run(function ($rootScope, $location, Auth) {
    // Redirect to login if route requires auth and you're not logged in
    $rootScope.$on('$stateChangeStart', function (event, next) {
      Auth.isLoggedInAsync(function(loggedIn) {
        if (next.authenticate && !loggedIn) {
          $location.path('/login');
        }
      });
    });
  }).directive('uiSrefActiveIf', ['$state', function($state) {
    return {
        restrict: "A",
        controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
            var state = $attrs.uiSrefActiveIf;

            function update() {
                if ( $state.includes(state) || $state.is(state) ) {
                    $element.addClass("active");
                } else {
                    $element.removeClass("active");
                }
            }

            $scope.$on('$stateChangeSuccess', update);
            update();
        }]
    };
}]);