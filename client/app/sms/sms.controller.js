'use strict';

angular.module('angFullstackApp')
  .controller('SMSCtrl', function ($scope, $http, $state, $uibModal, $compile, Message, Auth, User, Coupons) {
    /******Init Variables************/
    $scope.user = User.get(function(response){
      if(!$scope.user.sms_service.status)
        angular.element(document.getElementById('sms_status')).html('Your SMS account has been de-activated. Please contact support.');
      User.getCampaigns({id:$scope.user._id},
        function(data){
          $scope.myCampaigns = data.data.map(function(camp){return camp.name;});
        },function(err){

        });
    });
    $scope.campaign = {};
    $scope.rejects = [];
    $scope.customers = [];
    $scope.selectedTemplate = {};
    $scope.offers = [];
    $scope.templates = [];
    var lastSelectedTemplate=null;
    var newScope = null;

    var indexedDB = window.indexedDB;
    var open = indexedDB.open("Customer-SMS",1);
    var db_sms;

    open.onupgradeneeded = function(e) {
        var thisDB = e.target.result;
        if(!thisDB.objectStoreNames.contains("Imported_Customers_SMS")) {
            thisDB.createObjectStore("Imported_Customers_SMS", {keyPath: "mobile"});
        }
    };

    open.onsuccess = function(e) {
        db_sms = e.target.result;
        db_sms.transaction("Imported_Customers_SMS", "readwrite").objectStore("Imported_Customers_SMS").clear();
    };

    open.onerror = function(e){
      window.location.href="/";
    };

    var readCustomers = function(){
      var customers = [];
      $scope.state_loader = true;
      var Store = db_sms.transaction("Imported_Customers_SMS").objectStore("Imported_Customers_SMS");
      Store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          customers.push(cursor.value);
          cursor.continue();
        }else{
          $scope.state_loader = false;
          $scope.customers = customers;
          $scope.$apply();
        }
      };
    };
    /********Checking Validity of States***********/
    if($state.is('sms.import')&&!$scope.campaign.name)
      $state.go('sms.campaign');
    else if($state.is('sms.create')){
      if(!$scope.campaign.name)
        $state.go('sms.campaign');
      else if($scope.selectedCustomers.length==0)
        $state.go('sms.import');
    }else if($state.is('sms.schedule')){
      if(!$scope.campaign.name)
        $state.go('sms.campaign')
      else if($scope.selectedCustomers.length==0)
        $state.go('sms.import');
    }

    $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
      if(fromState.name=='sms.import'&&$scope.customers.length!=0){
          db_sms.transaction("Imported_Customers_SMS", "readwrite").objectStore("Imported_Customers_SMS").clear();
          var tx = db_sms.transaction("Imported_Customers_SMS", "readwrite");
          var store = tx.objectStore("Imported_Customers_SMS");

          for (var i = 0;i<$scope.customers.length; i++) {
            store.put($scope.customers[i]);
          };

          $scope.customers = [];
      }

      if((toState.name == 'sms.import'||toState.name=='sms.create'||toState.name=='sms.schedule')&&!$scope.campaign.name){
        event.preventDefault();
        $uibModal.open({
          animation:true,
          template:'<h4 class="text-center">Please specify the campaign name.</h4>'
        });
      }else if(toState.name=='sms.import'&&$scope.campaign.name.length!=0){
        if($scope.selectedCustomers.length!=0){
          readCustomers();
        }
        selectedCustomers = {};
        newScope = null;
        lastSelectedTemplate = null;
        $scope.selectedCustomers = [];
        $scope.selectedTemplate = {};
        $scope.sms = {};
      }else if((toState.name=='sms.schedule'||toState.name=='sms.create')&&$scope.selectedCustomers.length==0){
        if(fromState.name=='sms.import'){
          readCustomers();
        }
        event.preventDefault();
        $uibModal.open({
          animation: true,
          templateUrl: 'error-create.html',
          controller: 'ErrorCtrl'
        });
      }else if(toState.name=='sms.schedule' && !$scope.htmlContent){
        event.preventDefault();
        $uibModal.open({
          animation: true,
          templateUrl: 'error-schedule.html',
          controller: 'ErrorCtrl'
        });
      }
    });

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
      if(toState.name=='sms.create'&&fromState.name=='sms.schedule'){
        $scope.htmlContent = angular.copy($scope.sms.body);
        newScope = $scope.$new(true);
        for(var key in $scope.selectedCustomers[0])
          newScope[key] = $scope.selectedCustomers[0][key];
        $compile('<p>'+$scope.htmlContent+'</p>')(newScope, function(a){
          $scope.default_content = a['context'];
        });
      }

      if(fromState.name == 'sms.schedule' && toState.name == 'sms.create'){
        if(lastSelectedTemplate!=null){
          angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"#4393B9", "color":"white"});
        }
      }

      if(toState.name=='sms.campaign'&&(fromState.name=='sms.import'||fromState.name=='sms.create'||fromState.name=='sms.schedule'))
        $scope.emptyCustomers();
    });

    /****************STEP 2******************/
    $scope.importPosist = function(){
      var md = $uibModal.open({
        animation:true,
        templateUrl: 'save-tenantid.html',
        scope: $scope,
        controller: 'saveTenantCtrl',
        resolve: {
          medium: function(){return 'message';}
        }
      });
      md.result.then(function (customers) {
        $scope.customers = customers;
        Coupons.get($scope.user._id).then(function(data){
          $scope.offers = data.offers.map(function(offer){return offer.name});
          Coupons.allOffers = data.offers;
          if(Coupons.allOffers.length==0)
            alert('No offer codes found.');
        }).catch(function(err){
          alert('Could not import offers from POS.');
        });
      }, function () {

      });
    };

    $scope.getOfferCodes = function(index){
      if(!index)
        $scope.codes = [];
      else
        $scope.codes = Coupons.allOffers[index].codes;
    };

    $scope.setCouponForUser = function(index, value){
      if($scope.codes!=undefined){
        if($scope.codes.indexOf(value)!=-1)
          $scope.customers[index]['coupon'] = value;
        else
          alert('Choose coupon from dropdown.');
      }else{
        alert('Choose an offer first.');
      }
    };

    $scope.remCouponForUser = function(index){
      $scope.customers[index]['coupon'] = '';
    };

    $scope.remCouponForAll = function(){
      for (var i = $scope.customers.length - 1; i >= 0; i--) {
        $scope.customers[i].coupon = '';
      };
    };

    $scope.setCouponForAll = function(value){
      if($scope.codes!=undefined){
        if($scope.codes.indexOf(value)!=-1){
          for (var i = $scope.customers.length - 1; i >= 0; i--) {
            $scope.customers[i].coupon = value;
          };
        }else
          alert('Choose coupon from the dropdown only.');
      }else{
        alert('Choose an offer first.');
      }
    };

    $scope.emptyCustomers = function(){
      $scope.customers = [];
      $scope.selectedCustomers = [];
      $scope.rejects = [];
      $scope.offers = [];
      db_sms.transaction("Imported_Customers_SMS", "readwrite").objectStore("Imported_Customers_SMS").clear();
    };

    var selectedCustomers = {};
    $scope.selectAll = function(select_all){
      if(select_all){
        $scope.selectedCustomers = $scope.customers.map(function(customer){return customer;});
        for (var i=0;i<$scope.selectedCustomers.length;i++) {
          selectedCustomers[$scope.selectedCustomers[i].$$hashKey] = i;
        };
        angular.element(document.querySelectorAll("tr.customer")).toggleClass('info',true);
        angular.element(document.querySelectorAll("input[type='checkbox']")).prop("checked",true);
      }else{
        $scope.selectedCustomers = [];
        selectedCustomers = {};
        angular.element(document.querySelectorAll("tr.customer")).toggleClass('info',false);
        angular.element(document.querySelectorAll("input[type='checkbox']")).prop("checked",false);
      }
    };

    $scope.toggle = function(customer,index){
      var p = true;
      if(selectedCustomers.hasOwnProperty(customer.$$hashKey)){
        p=false;
        angular.element(document.getElementById('customer-'+index)).toggleClass('info',false);
        angular.element(document.getElementById('check-'+index)).prop("checked", false);
        $scope.selectedCustomers.splice(selectedCustomers[customer.$$hashKey],1);
        delete selectedCustomers[customer.$$hashKey];
        for(var i=0;i<$scope.selectedCustomers.length;i++)
          selectedCustomers[$scope.selectedCustomers[i].$$hashKey] = i;
      }
      if(p==true){
        $scope.selectedCustomers.push(customer);
        angular.element(document.getElementById('customer-'+index)).toggleClass('info',true);
        angular.element(document.getElementById('check-'+index)).prop("checked",true);
        selectedCustomers[customer.$$hashKey] = $scope.selectedCustomers.length-1;
      }
    };

    $scope.importCSV = function(){
      var file = document.getElementById("file-input");
      file.click();
    };

    var parseDate = function (str) {
      function pad(x){return (((''+x).length==2) ? '' : '0') + x; }
      var m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
        , d = (m) ? new Date(m[3], m[2]-1, m[1]) : null
        , matchesPadded = (d&&(str==[pad(d.getDate()),pad(d.getMonth()+1),d.getFullYear()].join('-')))
        , matchesNonPadded = (d&&(str==[d.getDate(),d.getMonth()+1,d.getFullYear()].join('-')))
        , current = new Date();
      return ((matchesPadded || matchesNonPadded)&&d<current) ? d : null;
    };

    $scope.readFile = function() {
        var file = document.getElementById('file-input').files[0];
        if(file.type === "application/vnd.ms-excel" || file.type === "text/csv"){
          db_sms.transaction("Imported_Customers_SMS", "readwrite").objectStore("Imported_Customers_SMS").clear();
          $scope.state_loader = true;
          if(typeof InstallTrigger !== 'undefined' || (!!window.chrome && !!window.chrome.webstore) || Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0)
              $scope.$apply();
          var customers = [];
          var reader = new FileReader();
          reader.readAsText(file);
          reader.onload=function(){
            var lines = reader.result.split("\r\n");
            var headers = lines[0].split(",").map(function(header){return header.toLowerCase();});
            for(var i=1;i<lines.length-1;i++){
              var line = lines[i].split(",");
              if(line.length!=headers.length)
                $scope.rejects.push({row:i+1, message: 'Invalid number of columns.'});
              else if(line[0]=='')
                $scope.rejects.push({row:i+1, message: 'Missing name of customer.'});
              else if(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(line[2])==false)
                $scope.rejects.push({row:i+1, message: 'Invalid E-mail of customer.'});
              else if(/^(7|8|9)\d{9}$/.test(line[1])==false)
                $scope.rejects.push({row:i+1, message: 'Invalid mobile no. of customer'});
              else if(parseDate(line[4])==null&&line[4]!='')
                $scope.rejects.push({row:i+1, message: 'Invalid DOB'});
              else if(parseDate(line[5])==null&&line[5]!='')
                $scope.rejects.push({row:i+1, message: 'Invalid MA'});
              else{
                var c = {};
                for(var j=0;j<line.length;j++){
                  c[headers[j]] = line[j];
                };
                var objectStore = db_sms.transaction("Imported_Customers_SMS", "readwrite").objectStore("Imported_Customers_SMS");
                objectStore.put(c);
              }
            }
            readCustomers();
          }
        }else{
          $scope.state_loader = false;
          if(typeof InstallTrigger !== 'undefined' || (!!window.chrome && !!window.chrome.webstore) || Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0)
            $scope.$apply();
          document.getElementById("file-input").value = null;
          alert('Please upload only CSV files');
        }
    };

    $scope.saveList = function(){
      $uibModal.open({
        animation:true,
        templateUrl: 'save-list.html',
        scope: $scope,
        controller: 'saveSMSListCtrl'
      });
    };

    $scope.selectList = function(list_id){
      Message.getList(list_id).success(function(data){
        $scope.customers = data;
      }).error(function(err){
        alert('There was some problem.');
      });
    };

    $scope.getLists = function(){
      $scope.lists = [];
      Message.getLists().success(function(lists){
        $scope.lists = lists;
      });
    };

    $scope.removeList = function(id, index){
      $uibModal.open({
        animation:true,
        templateUrl: 'removeSMSList.html',
        scope: $scope,
        controller: 'removeSMSListCtrl',
        resolve:{
          id: function(){return id;},
          index: function(){return index;}
        }
      });
    };

    /*****************STEP 3**********************/
    $scope.isActive = [{active:true},{active:false}];
    $scope.getTemplates = function(){
      $scope.templates = [];
      Message.getTemplates().success(function(data){
        $scope.templates = data;
        $scope.error = '';
      }).error(function(err){
        $scope.error;
      });
    };


    $scope.editTemplate = function(template, index){
      $scope.isActive = [{active:false},{active:true}];
      $scope.selectedTemplate = angular.copy(template);
      document.getElementById('smsContent').value = template.body;
      $scope.showPreview(template.body);
      $scope.htmlContent = template.body;
      if(lastSelectedTemplate!=null){
        angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"white","color":"rgba(0,0,0,0.5)"});
      }
      angular.element(document.getElementById('template-'+index)).css({"background-color":"#4393B9", "color":"white"});
      lastSelectedTemplate = index;
    };

    $scope.newTemplate = function(){
      $scope.isActive = [{active:false},{active:true}];
      document.getElementById('smsContent').value = '';
      angular.element(document.getElementById('prev')).html('');
      $scope.htmlContent = '';
      $scope.selectedTemplate = {};
      if(lastSelectedTemplate!=null){
        angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"white","color":"rgba(0,0,0,0.5)"});
      }
    };

    $scope.selectTemplate = function(template, index){
      $scope.selectedTemplate = angular.copy(template);
      $scope.htmlContent = template.body;
      if(lastSelectedTemplate!=null){
        angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"white","color":"rgba(0,0,0,0.5)"});
      }
      angular.element(document.getElementById('template-'+index)).css({"background-color":"#4393B9", "color":"white"});
      lastSelectedTemplate = index;
    };

    $scope.showPreview = function(html){
      if(!newScope){
        newScope = $scope.$new(true);
        for(var key in $scope.selectedCustomers[0])
          newScope[key] = $scope.selectedCustomers[0][key];
      }
      angular.element(document.getElementById('prev')).html($compile('<p>'+html+'</p>')(newScope));
      $scope.htmlContent = html;
    };

    $scope.insertCustomerData = function(key){
      document.getElementById('smsContent').value = angular.element(document.getElementById('smsContent')).val() + '{{'+key+'}}';
      $scope.showPreview(document.getElementById('smsContent').value);
      document.getElementById('smsContent').focus();
    };

    $scope.saveTemplate = function(html){
      var html = html||'';
      $uibModal.open({
        animation:true,
        templateUrl: 'saveSMSTemplate.html',
        scope: $scope,
        controller: 'saveSMSTemplateCtrl',
        resolve:{
          html: function(){return html;}
        }
      });
    };

    $scope.removeTemplate = function(id, index){
      $uibModal.open({
        animation:true,
        templateUrl: 'removeSMSTemplate.html',
        scope: $scope,
        controller: 'removeSMSTemplateCtrl',
        resolve:{
          id: function(){return id;},
          index: function(){return index;}
        }
      });
    };

    /*****************STEP 4*********************/
    $scope.initSMS = function(){
      $scope.sms = {};
      $scope.sms.campaign = $scope.campaign;
      $scope.sms.sender_id = (function(){
        if($scope.user.sender_ids.length!=0){
          var ID;
          for(var i=0;i<$scope.user.sender_ids.length;i++){
            if($scope.user.sender_ids[i].status==true){
              ID = $scope.user.sender_ids[i].name;
              break;
            }else
              ID = '';
          };
          return ID;
        }else
          return '';
      })();
      console.log($scope.sms.sender_id);
      $scope.sms.to = [];
      $scope.showNumbers = '';
      $scope.selectedCustomers.forEach(function(customer){
        $scope.sms.to.push(customer);
        $scope.showNumbers += customer.name+'<'+customer.mobile+'>, ';
      });
      var newScope = $scope.$new(true);
      for(var key in $scope.selectedCustomers[0])
        newScope[key] = $scope.selectedCustomers[0][key];
      angular.element(document.getElementById('content')).html($compile('<p>'+$scope.htmlContent+'</p>')(newScope));
      $scope.sms.body = angular.copy($scope.htmlContent);
      $scope.sms.template_id = $scope.selectedTemplate._id||null;
      $scope.sms.asap = 'true';
      var min = new Date();
      $scope.minDate = min;
      $scope.sms.schedule = {};
      $scope.sms.schedule.date = min;
      var max = new Date();
      max.setDate(min.getDate()+7);
      $scope.maxDate = max;
      $scope.sms.schedule.time = new Date();
    };

    $scope.$watch('sms.schedule.date', function(newVal, oldVal){
      $scope.dateErr = false;
      var newDate = new Date(newVal);
      var minDate = new Date($scope.minDate);
      if(newDate.toString()==minDate.toString()){
        var a = new Date($scope.sms.schedule.time);
        var b = new Date($scope.minDate);
        if(a<b){
          $scope.dateErr = true;
        }else{
          $scope.dateErr = false;
        }
      }else if(newDate<minDate)
        $scope.dateErr = true;
      else if(newDate>$scope.maxDate)
        $scope.dateErr = true;
      else
        $scope.dateErr = false;
    });

    $scope.$watch('sms.schedule.time', function(newVal, oldVal){
      $scope.dateErr = false;
      var newDate = new Date($scope.sms.schedule.date);
      var minDate = new Date($scope.minDate);
      var a = new Date(newVal);
      var b = new Date($scope.minDate);
      if(newDate.toString()==minDate.toString()&&a<b){
        $scope.dateErr = true;
      }else{
        $scope.dateErr = false;
      }
    });

    $scope.requestSenderID = function(){
      $uibModal.open({
        animation:true,
        templateUrl: 'saveSenderID.html',
        scope: $scope,
        controller: 'saveSenderIDCtrl'
      });
    };

    $scope.sendSMS = function(isValid){
      if(isValid){
        if($scope.sms.asap == 'true'){
          $scope.sms.asap = true;
          delete $scope.sms.schedule;
          Message.send($scope.sms).success(function(){
            window.location.href='/sms/campaigns';
          }).error(function(err){
            alert(err);
          });
        }else{
          $scope.sms.asap = false;
          var currentDate = new Date();
          currentDate.setMinutes(currentDate.getMinutes()+30);
          var setTime = new Date($scope.sms.schedule.time)
          if($scope.sms.schedule.date<currentDate&&$scope.sms.schedule.time<currentDate)
            alert('Set atleast 30 mins ahead of current time.');
          else{
            Message.send($scope.sms).success(function(){
              window.location.href='/sms/campaigns';
            }).error(function(err){
              alert(err);
            });
          }
        }
      }
    };

    $scope.findUserMessages = function(next){
      var next = next || 0;
      Message.get(next).success(function(messages){
        $scope.messages = messages;
      }).error(function(err){
        alert('Some problem occurred.');
      });
    };

    $scope.viewMessage = function(message){
      $uibModal.open({
        animation:true,
        templateUrl: 'view-message.html',
        controller: 'viewMessageCtrl',
        resolve:{
          message: function(){return message;}
        }
      });
    };
}).controller('ErrorCtrl', function($scope, $uibModalInstance){

    $scope.ok = function(){$uibModalInstance.close();}

}).controller('saveTenantCtrl', function($uibModalInstance,$scope,Auth,Coupons,medium){
    $scope.save = function(isValid){
      $scope.loader = true;
      $scope.error = '';
      if(isValid){
          Auth.getDeploymentIds({username: $scope.username, password: $scope.password}).
          then(function(data){
            $scope.user.deployments = data.deployments;
            $scope.loader = false;
          }).catch(function(err){
            $scope.error = err.data;
            $scope.loader = false;
          });
        }
    };
    $scope.deps = [];
    $scope.toggleDeployment = function(index, value){
      if(value==true)
        $scope.deps.push($scope.user.deployments[index]);
      else{
        for (var i = $scope.deps.length - 1; i >= 0; i--) {
          if($scope.deps[i]._id==$scope.user.deployments[index]._id){
            $scope.deps.splice(i,1);
            break;
          }
        };
      }
    };

    $scope.selectDeployment = function(){
      Auth.setDeploymentId({deployments:$scope.deps}).
      then(function(data){
        $scope.user.deployment_id = data.deployment_id;
        $scope.importing = true;
        Auth.importPosist().then(function(data){
          $scope.customers = data.customers.filter(function(customer){
            if(customer['name']=='')
              return false;
            else if(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(customer['email'])==false && medium=='email')
              return false;
            else if(/^(7|8|9)\d{9}$/.test(customer['mobile'])==false && medium=='message')
              return false;
            else
              return true;
          });
          if($scope.customers.length==0){
            $scope.importing = false;
            alert('No valid available data could be imported.');
            $uibModalInstance.dismiss();
          }else{
            $scope.importing = false;
            $uibModalInstance.close($scope.customers);
          }
        }).catch(function(err){
          $scope.importing = false;
          alert('Could not import data. Try again later.');
          $uibModalInstance.dismiss();
        });
      }).catch(function(err){
        $scope.error = err.data;
      });
    };

    $scope.cancel = function(){
      $uibModalInstance.dismiss();
    };
}).controller('saveSMSListCtrl', function($uibModalInstance,$scope,Message){
    $scope.save = function(isValid){
      $scope.error = '';
      if(isValid){
        Message.saveList({name: $scope.listname, data:$scope.selectedCustomers, medium:'sms'}).success(function(data){
          $scope.error = '';
          $uibModalInstance.close();
        }).error(function(err){
          if(err.errors.body)
            $scope.error = err.errors.body.message;
          if(err.errors.name)
            $scope.error = err.errors.name.message;
        });
      }else
        $scope.error = 'List name is required';
    };

    $scope.cancel = function(){
      $uibModalInstance.dismiss();
    }
}).controller('saveSMSTemplateCtrl', function($uibModalInstance,$scope,Message,html){
    $scope.save = function(){
      $scope.error = '';
      $scope.templateName = $scope.templateName||'';
      if($scope.templateName.length!=0){
        Message.saveTemplate({name:$scope.templateName, body:html}).success(function(data){
          $scope.error = '';
          $scope.selectTemplate(data);
          $scope.getTemplates();
          $uibModalInstance.close();
        }).error(function(err){
          if(err.errors.body)
            $scope.error = err.errors.body.message;
          if(err.errors.name)
            $scope.error = err.errors.name.message;
        });
      }else
        $scope.error = 'You forgot to name the template!';
    };

    $scope.replace = function(){
      $scope.error = '';
      Message.editTemplate($scope.selectedTemplate._id, {body:html}).success(function(data){
        $scope.error = '';
        $scope.selectTemplate(data);
        $scope.getTemplates();
        $uibModalInstance.close();
      }).error(function(err){
        $scope.error = err.errors||'Could not save with this name';
      });
    };

    $scope.cancel = function(){$uibModalInstance.dismiss();};
}).controller('removeSMSListCtrl', function($uibModalInstance,$scope,Message,id,index){
  $scope.remove = function(){
    Message.removeList(id).success(function(data){
      $scope.lists.splice(index,1);
      $scope.user = data;
      $uibModalInstance.close();
    }).error(function(err){
      alert('Could not delete the list.');
    });
  };

  $scope.cancel = function(){
    $uibModalInstance.dismiss();
  };
}).controller('removeSMSTemplateCtrl', function($uibModalInstance,$scope,Message,id,index){
  $scope.remove = function(){
    Message.removeTemplate(id).success(function(data){
      $scope.templates.splice(index,1);
      $scope.$parent.selectedTemplate = {};
      $uibModalInstance.close();
    }).error(function(err){
      alert('Could not delete the template.');
    });
  };

  $scope.cancel = function(){
    $uibModalInstance.dismiss();
  };
}).controller('saveSenderIDCtrl', function($uibModalInstance,$scope,Auth){
    $scope.save = function(isValid){
      $scope.error = '';
      if(isValid){
        Auth.setSenderId({name:$scope.name}).
        then(function(data){
          if(!$scope.user.sender_ids.length)
            $scope.user.sender_ids = [];
          $scope.user.sender_ids = data.sender_ids;
          $uibModalInstance.close();
        }).catch(function(err){
          $scope.error = err.data;
        });
      }
    }
}).controller('viewMessageCtrl', function($uibModalInstance,$scope,message){
    $scope.smsview = message;
    $scope.close = function(){
      $uibModalInstance.dismiss();
    }
});
