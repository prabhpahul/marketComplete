'use strict';

angular.module('angFullstackApp')
  .factory('User', ['$resource', function ($resource) {
    return $resource('/api/users/:id/:controller', {
      id: '@_id'
    },
    {
      changePassword: {
        method: 'PUT',
        params: {
          controller:'password'
        }
      },
      get: {
        method: 'GET',
        params: {
          id:'me'
        }
      },
      setProvider: {
        method: 'PUT',
        params: {
          controller: 'provider'
        }
      },
      setSenderId: {
        method: 'PUT',
        params: {
          controller: 'senderid'
        }
      },
      setDeploymentId: {
        method: 'PUT',
        params: {
          controller: 'deploymentid'
        }
      },
      getDeploymentIds: {
        method: 'POST',
        params: {
          controller: 'deploymentid'
        }
      },
      importPosist: {
        method: 'GET',
        params: {
          controller: 'posist'
        }
      },
      getCoupons: {
        method: 'GET', 
        params:{
          controller: 'coupons'
        }
      },
      getCampaigns: {
        method: 'GET', 
        params:{
          controller: 'campaigns'
        }
      }
	  });
  }]);
