'use strict';

angular.module('angFullstackApp')
  .controller('AdminCtrl', function ($scope, $http, $uibModal, $cookieStore, $location, Auth, Customer) {
    $scope.user = Auth.getCurrentUser();
    $scope.customers = [];
    $scope.skip = 0;
    $scope.mainLoader = false;
    $scope.find = function(limit, skip){
      $scope.mainLoader = true;
      Customer.all(limit,skip).success(function(data){
        if(data==null)
          $scope.customers = [];
        else
          $scope.customers = data;
        $scope.mainLoader = false;
      }).error(function(err){
        $scope.mainLoader = false;
        $scope.error = error;
      });
    };

    $scope.search = function(input){
      input = input||'';
      if(input!=''){
        Customer.search(input).success(function(data){
          if(data==null)
            $scope.customers = [];
          else{
            $scope.customers = [];
            $scope.customers.push(data);
          }
        }).error(function(err){
          alert('Could not search. System error.');
        });
      }else
        alert('Please enter a username or email');
    };

    $scope.updateTopup = function(type, id, quantity, sign){
      $scope.loader = true;
      if(type=='email'&&/^[0-9]+$/.test(quantity)&&quantity!=0){
        Customer.api.email_topup({id: id}, {topup: quantity, sign: sign},function(data){
          $scope.loader=false;
          for (var i = $scope.customers.length - 1; i >= 0; i--) {
            if($scope.customers[i]._id==id){
              $scope.customers[i] = data;
              break;
            }
          };
        }, function(err){
          $scope.loader=false;
          alert('Try after some time.');
        });
      }else if(type=='sms'&&/^[0-9]+$/.test(quantity)&&quantity!=0){
        Customer.api.sms_topup({id: id}, {topup: quantity, sign: sign}, function(data){
          $scope.loader=false;
          for (var i = $scope.customers.length - 1; i >= 0; i--) {
            if($scope.customers[i]._id==id){
              $scope.customers[i] = data;
              break;
            }
          };
        }, function(err){
          $scope.loader=false;
          alert('Try after some time.');
        });
      }else{
        alert('Please enter a valid number');
        $scope.loader = false;
      }
    };

    $scope.updateStatus = function(type, id, status, index){
      $scope.loader = true;
      if(type=='email'){      
        Customer.api.email_status({id: id}, {status: status}, function(customer) {
          $scope.loader = false;
          $scope.customers[index].email_service.status = customer.email_service.status;
        }, function(errorResponse) {
          $scope.loader = false;
          alert('Could not change the status.');
        });
      }else if(type=='sms'){
        Customer.api.sms_status({id:id}, {status:status}, function(customer) {
          $scope.loader = false;
          $scope.customers[index].sms_service.status = customer.sms_service.status;
        }, function(errorResponse) {
          $scope.loader = false;
          alert('Could not change the status.');
        });
      }
    };

    $scope.viewHistory = function(type, customerid){
      $uibModal.open({
        animation:true,
        templateUrl: 'view-history.html',
        scope: $scope,
        controller: 'ViewHistoryCtrl',
        resolve:{
          type: function(){return type;},
          credits: ['Customer', function(Customer){
            return Customer.getTransactionHistory(type, customerid);
          }]
        }
      });
    };

    $scope.viewSenderIds = function(customer){
      $uibModal.open({
        animation:true,
        templateUrl: 'view-senderids.html',
        scope: $scope,
        controller: 'ViewSenderCtrl',
        resolve:{
          customer: function(){return customer;}
        }
      });
    };

  }).controller('ViewHistoryCtrl', function($uibModalInstance,$scope,type,credits){
    $scope.credits = credits.data;
    $scope.type=type;
    $scope.close = function(){
      $uibModalInstance.dismiss();
    }
}).controller('ViewSenderCtrl', function($uibModalInstance,$scope,customer,Customer){
  
  $scope.customer = customer;

  $scope.senderIdStatus = function(id, name, status, index){
    Customer.api.senderIdStatus({id:id}, {status:status, sender_id:name}, function(customer) {
      $scope.customer.sender_ids[index].status = customer.sender_ids[index].status;
    }, function(errorResponse) {
      alert('Could not change the status.');
    });
  };

  $scope.close = function(){
    $uibModalInstance.dismiss();
  };
}).controller('RequestCtrl', function($scope, Customer, Auth){
  $scope.user = Auth.getCurrentUser();
    
  Customer.getCustomerRequests().success(function(data){
      $scope.customers = data;
  });

  $scope.senderIdApprove = function(id, name, index){
    Customer.api.senderIdStatus({id:id}, {status:true, sender_id:name}, function(customer) {
      $scope.customers.splice(index,1);
    }, function(errorResponse) {
      alert('Could not change the status. Try again.');
    });
  };

  $scope.senderIdReject = function(id, name, index, reason){
    Customer.api.senderIdStatus({id:id}, {status:false, sender_id:name, reason:reason}, function(customer) {
      $scope.customers.splice(index,1);
    }, function(errorResponse) {
      alert('Could not change the status. Try again.');
    });
  };
});