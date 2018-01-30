'use strict';

angular.module('angFullstackApp')
  .factory('Coupons',
    function ($location, $rootScope, $http, $cookieStore, $q, User) {
  		var factory = {};

  		factory.get = function(id, callback){
  			var cb = callback || angular.noop;
        return User.getCoupons({ id: id}, function(res) {
          return cb(res);
        }, function(err) {
          return cb(err);
        }).$promise;
  		};

      factory.allOffers = [];
      
  		return factory;

  });
