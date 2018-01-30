'use strict';

angular.module('angFullstackApp')
  .factory('Customer', function ($resource, $http) {

    var factory = {};

    factory.api = (function(){
        return $resource('/api/customers/:id/:type/:controller', {
          id: '@_id'
        },
        {
          email_topup:{
            method: 'PUT',
            params: {
              type: 'email',
              controller: 'topup'
            }
          },
          email_status:{
            method: 'PUT',
            params: {
              type: 'email',
              controller: 'status'
            }
          },
          sms_topup:{
            method: 'PUT',
            params: {
              type: 'sms',
              controller: 'topup'
            }
          },
          sms_status:{
            method: 'PUT',
            params: {
              type: 'sms',
              controller: 'status'
            }
          },
          senderIdStatus:{
            method: 'PUT',
            params:{
              type: 'sms',
              controller:'senderid'
            }
          }
        });
    })();

    factory.all = function(limit,skip){
      return $http.get('/api/customers?limit='+limit+'&skip='+skip);
    };

    factory.search = function(search){
      return $http.get('/api/customers/search?query='+search);
    };

    factory.getCustomerRequests = function(){
      return $http.get('/api/customers/requests');
    };

    factory.getTransactionHistory = function(type, id){
      return $http.get('/api/customers/'+id+'/'+type+'/transactions');
    };

    return factory;

  });
