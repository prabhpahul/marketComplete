'use strict';

angular.module('angFullstackApp')
  .controller('EmailCtrl', function ($scope, $http, $state, $stateParams, $uibModal, $compile, Email, Auth, User, Coupons) {
    /******Init Variables************/
    $scope.user = User.get(function(response){
      if(!$scope.user.email_service.status)
        angular.element(document.getElementById('email_status')).html('Your Email account has been de-activated. Please contact support.');
      User.getCampaigns({id:$scope.user._id},
        function(data){
          $scope.myCampaigns = data.data.map(function(camp){return camp.name;});
        },function(err){

        });  
    });
    $scope.campaign = {};
    $scope.rejects = [];
    $scope.customers = [];
    $scope.selectedCustomers = [];
    $scope.selectedTemplate = {};
    $scope.offers = [];
    $scope.templates = [];
    var lastSelectedTemplate = null;
    
    var indexedDB = window.indexedDB;
    var open = indexedDB.open("Customer-Email",1);
    var db_email;

    open.onupgradeneeded = function(e) {
        var thisDB = e.target.result;
        if(!thisDB.objectStoreNames.contains("Imported_Customers_EMAIL")) {
            thisDB.createObjectStore("Imported_Customers_EMAIL", {keyPath: "email"});
        }
    };

    open.onsuccess = function(e) {
        db_email = e.target.result;
        db_email.transaction("Imported_Customers_EMAIL", "readwrite").objectStore("Imported_Customers_EMAIL").clear();
    }; 

    open.onerror = function(e){
      window.location.href="/";
    };

    var readCustomers = function(){
      var customers = [];
      $scope.state_loader = true;
      var Store = db_email.transaction("Imported_Customers_EMAIL").objectStore("Imported_Customers_EMAIL");
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
    /******************Checking Validity of States****************/
    if($state.is('email.import')&&!$scope.campaign.name)
      $state.go('email.campaign');
    else if($state.is('email.create')){
      if(!$scope.campaign.name)
        $state.go('email.campaign');
      else if($scope.selectedCustomers.length==0)
        $state.go('email.import');
    }else if($state.is('email.schedule')){
      if(!$scope.campaign.name)
        $state.go('email.campaign')
      else if($scope.selectedCustomers.length==0)
        $state.go('email.import');
    }
    
    $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
      if(fromState.name=='email.import'&&$scope.customers.length!=0){
          db_email.transaction("Imported_Customers_EMAIL", "readwrite").objectStore("Imported_Customers_EMAIL").clear();
          var tx = db_email.transaction("Imported_Customers_EMAIL", "readwrite");
          var store = tx.objectStore("Imported_Customers_EMAIL");

          for (var i = 0;i<$scope.customers.length; i++) {
            store.put($scope.customers[i]);
          };

          $scope.customers = [];
      }

      if((toState.name == 'email.import'||toState.name=='email.create'||toState.name=='email.schedule')&&!$scope.campaign.name){
        event.preventDefault();
        $uibModal.open({
          animation:true,
          template:'<h4 class="text-center">Please specify the campaign name.</h4>'
        });
      }else if(toState.name=='email.import'&&$scope.campaign.name.length!=0){
        if($scope.selectedCustomers.length!=0){
          readCustomers();
        }
        $scope.selectedCustomers = [];
        selectedCustomers = {};
        lastSelectedTemplate = null;
        $scope.selectedTemplate = {};
        $scope.email = {};
      }else if((toState.name=='email.schedule'||toState.name=='email.create')&&$scope.selectedCustomers.length==0){
        if(fromState.name=='email.import'){
          readCustomers();
        }
        event.preventDefault();
        $uibModal.open({
          animation: true,
          templateUrl: 'error-create.html',
          controller: 'ErrorCtrl'
        });
      }else if(toState.name=='email.schedule' && toParams.body==null){
        event.preventDefault();
        $uibModal.open({
          animation: true,
          templateUrl: 'error-schedule.html',
          controller: 'ErrorCtrl'
        });
      }

    });

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
      if(toState.name=='email.create'&&fromState.name=='email.schedule'&&Object.keys($scope.selectedTemplate).length==0){
        $scope.htmlContent = angular.copy($scope.email.html);
      }
      if(toState.name=='email.campaign'&&(fromState.name=='email.import'||fromState.name=='email.create'||fromState.name=='email.schedule'))
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
          medium: function(){return 'email';}
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
      db_email.transaction("Imported_Customers_EMAIL", "readwrite").objectStore("Imported_Customers_EMAIL").clear();
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
        angular.element(document.getElementById('check-'+index)).removeAttr("checked",false);
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
          db_email.transaction("Imported_Customers_EMAIL", "readwrite").objectStore("Imported_Customers_EMAIL").clear();
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
                  var objectStore = db_email.transaction("Imported_Customers_EMAIL", "readwrite").objectStore("Imported_Customers_EMAIL");
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
        controller: 'saveEmailListCtrl'
      });
    };

    $scope.selectList = function(list_id){
      Email.getList(list_id).success(function(data){
        $scope.customers = data;
      }).error(function(err){
        alert('There was some problem.');
      });
    };

    $scope.getLists = function(){
      $scope.lists = [];
      Email.getLists().success(function(lists){
        $scope.lists = lists;
      });
    };

    $scope.removeList = function(id, index){
      $uibModal.open({
        animation:true,
        templateUrl: 'removeEmailList.html',
        scope: $scope,
        controller: 'removeEmailListCtrl',
        resolve:{
          id: function(){return id;},
          index: function(){return index;}
        }
      });
    };

    /*****************STEP 3**********************/
    $scope.toolbar = Email.toolbar;
    $scope.isActive = [{active:true},{active:false}];
    $scope.getTemplates = function(){
      $scope.templates = [];
      Email.getTemplates().success(function(data){
        $scope.templates = data;
        $scope.error = '';
        if(lastSelectedTemplate!=null){
          angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"#4393B9", "color":"white"});
        }
      }).error(function(err){
        $scope.error;
      });
    };

    $scope.editTemplate = function(template, index){
      $scope.isActive = [{active:false},{active:true}];
      $scope.selectedTemplate = angular.copy(template);
      var divs = (document.getElementsByClassName('ta-scroll-window')[0]).getElementsByTagName('div');
      for (var i = divs.length - 1; i >= 0; i--) {
        if(divs[i].hasAttribute('contenteditable')){
          divs[i].innerHTML = template.body;break;
        }
      };
      $scope.htmlContent = template.body;
      if(lastSelectedTemplate!=null){
        angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"white","color":"rgba(0,0,0,0.5)"});
      }  
      angular.element(document.getElementById('template-'+index)).css({"background-color":"#4393B9", "color":"white"});
      lastSelectedTemplate = index;
    };

    $scope.newTemplate = function(){
      $scope.isActive = [{active:false},{active:true}];
      var divs = (document.getElementsByClassName('ta-scroll-window')[0]).getElementsByTagName('div');
      for (var i = divs.length - 1; i >= 0; i--) {
        if(divs[i].hasAttribute('contenteditable')){
          divs[i].innerHTML = '';break;
        }
      };
      $scope.htmlContent = '';
      $scope.selectedTemplate = {};
      if(lastSelectedTemplate!=null){
        angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"white","color":"rgba(0,0,0,0.5)"});
      } 
    };
  
    $scope.selectTemplate = function(template, index){
      $scope.selectedTemplate = angular.copy(template);
      var divs = (document.getElementsByClassName('ta-scroll-window')[0]).getElementsByTagName('div');
      for (var i = divs.length - 1; i >= 0; i--) {
        if(divs[i].hasAttribute('contenteditable')){
          divs[i].innerHTML = $scope.selectedTemplate.body;break;
        }
      };
      if(lastSelectedTemplate!=null){
        angular.element(document.getElementById('template-'+lastSelectedTemplate)).css({"background-color":"white","color":"rgba(0,0,0,0.5)"});
      }  
      angular.element(document.getElementById('template-'+index)).css({"background-color":"#4393B9", "color":"white"});
      lastSelectedTemplate = index;
    };

    $scope.showPreview = function(html){
      var newScope = $scope.$new(true);
      for(var key in $scope.selectedCustomers[0])
        newScope[key] = $scope.selectedCustomers[0][key];
      angular.element(document.getElementById('prev')).html($compile(html)(newScope));
    };

    $scope.insertCustomerData = function(key){
      var divs = (document.getElementsByClassName('ta-scroll-window')[0]).getElementsByTagName('div');
      for (var i = divs.length - 1; i >= 0; i--) {
        if(divs[i].hasAttribute('contenteditable')){
          divs[i].innerHTML += '{{'+key+'}}';divs[i].focus();break;
        }
      };
    };

    $scope.sendSample = function(html){
      Email.testEmail({html:html, receiver: $scope.selectedCustomers[0]}).success(function(data){
        alert('Mail was sent successfully');
        $scope.user.email_service.available_credits-=1;
      }).error(function(err){
        alert(err);
      });
    };

    $scope.saveTemplate = function(html){
      var html = html||'';
      $uibModal.open({
        animation:true,
        templateUrl: 'saveEmailTemplate.html',
        scope: $scope,
        controller: 'saveEmailTemplateCtrl',
        resolve:{
          html: function(){return html;}
        }
      });
    };

    $scope.removeTemplate = function(id, index){
      $uibModal.open({
        animation:true,
        templateUrl: 'removeEmailTemplate.html',
        scope: $scope,
        controller: 'removeEmailTemplateCtrl',
        resolve:{
          id: function(){return id;},
          index: function(){return index;}
        }
      });
    };

    /*****************STEP 4*********************/
    $scope.setProvider = function(service){
      switch(service){
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

    $scope.initMail = function(){
      $scope.email = {};
      $scope.email.campaign = $scope.campaign;
      $scope.email.to = [];
      $scope.email.provider = $scope.user.provider;
      $scope.showEmails = '';
      $scope.selectedCustomers.forEach(function(customer){
        $scope.email.to.push(customer);
        $scope.showEmails += customer.name+'<'+customer.email+'>, '
      });
      var newScope = $scope.$new(true);
      for(var key in $scope.selectedCustomers[0])
        newScope[key] = $scope.selectedCustomers[0][key];
      angular.element(document.getElementById('content')).html($compile($state.params.body)(newScope));
      $scope.email.html = angular.copy($state.params.body);
      $scope.email.template_id = $scope.selectedTemplate._id||null;
      $scope.email.asap = 'true';
      var min = new Date();
      $scope.minDate = min;
      $scope.email.schedule = {};
      $scope.email.schedule.date = min;
      $scope.email.schedule.time = new Date();
      var max = new Date();
      max.setDate(min.getDate()+7);
      $scope.maxDate = max;
    };

    $scope.$watch('email.schedule.date', function(newVal, oldVal){
      $scope.dateErr = false;
      var newDate = new Date(newVal);
      var minDate = new Date($scope.minDate);
      if(newDate.toString()==minDate.toString()){
        var a = new Date($scope.email.schedule.time);
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

    $scope.$watch('email.schedule.time', function(newVal, oldVal){
      $scope.dateErr = false;
      var newDate = new Date($scope.email.schedule.date);
      var minDate = new Date($scope.minDate);
      var a = new Date(newVal);
      var b = new Date($scope.minDate); 
      if(newDate.toString()==minDate.toString()&&a<b){
        $scope.dateErr = true;
      }else{
        $scope.dateErr = false;
      }
    });

    
    $scope.sendMail = function(isValid){
      if(isValid){
        if($scope.email.asap == 'true'){
          $scope.email.asap = true;
          delete $scope.email.schedule;
          Email.send($scope.email).success(function(){
            window.location.href = '/email/campaigns';
          }).error(function(err){
            alert(err);
          });
        }else{
          $scope.email.asap = false;
          var currentDate = new Date();
          currentDate.setMinutes(currentDate.getMinutes()+30);
          var setTime = new Date($scope.email.schedule.time)
          if($scope.email.schedule.date<currentDate&&$scope.email.schedule.time<currentDate)
            alert('Set atleast 30 mins ahead of current time.');
          else{
            Email.send($scope.email).success(function(){
              window.location.href = '/email/campaigns';
            }).error(function(err){
              alert(err);
            });
          }
        }
      }
    };

    $scope.findUserEmails = function(next){
      var next = next||0;
      Email.get(next).success(function(emails){
        $scope.useremails = emails;
      }).error(function(err){
        alert('Some problem occurred.');
      });
    };

    $scope.viewEmail = function(email){
      $uibModal.open({
        animation:true,
        templateUrl: 'view-email.html',
        controller: 'viewEmailCtrl',
        resolve:{
          email: function(){return email;}
        }
      });
    };
}).controller('saveEmailListCtrl', function($uibModalInstance,$scope,Email){
  $scope.save = function(isValid){
    $scope.error = '';
    if(isValid){
      Email.saveList({name: $scope.listname, data:$scope.selectedCustomers, medium:'email'}).success(function(data){
        $scope.error = '';
        $uibModalInstance.close();
      }).error(function(err){
        if(err.errors.body)
          $scope.error = err.errors.body.message;
        if(err.errors.name)
          $scope.error = err.errors.name.message;
      });
    }else
      $scope.error = 'List name is required.';
  };

  $scope.cancel = function(){
    $uibModalInstance.dismiss();
  };
}).controller('saveEmailTemplateCtrl', function($uibModalInstance,$scope,Email,html){
  $scope.save = function(){
    $scope.error = '';
    $scope.templateName = $scope.templateName||'';
    if($scope.templateName.length!=0){
      Email.saveTemplate({name:$scope.templateName, body:html}).success(function(data){
        $scope.error = '';
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
    Email.editTemplate($scope.selectedTemplate._id,{body:html}).success(function(data){
      $scope.error = '';
      $scope.selectTemplate(data);
      $scope.getTemplates();
      $uibModalInstance.close();
    }).error(function(err){
      $scope.error = 'Could not save with this name';
    });
  };

  $scope.cancel = function(){$uibModalInstance.dismiss();};

}).controller('removeEmailListCtrl', function($uibModalInstance,$scope,Email,id,index){
  $scope.remove = function(){
    Email.removeList(id).success(function(data){
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
}).controller('removeEmailTemplateCtrl', function($uibModalInstance,$scope,Email,id,index){
  $scope.remove = function(){
    Email.removeTemplate(id).success(function(data){
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
}).controller('sendgridCtrl', function($uibModalInstance,$scope,Auth,service){
  $scope.save = function(isValid){
    $scope.error = '';
    if(isValid){
      Auth.setProvider({provider: service, providerData: {auth:{api_user: $scope.username, api_key: $scope.password}}}).
      then(function(data){
        $scope.user.provider = 'sendgrid';
        $uibModalInstance.close();
      }).catch(function(err){
        $scope.error = err;
      });
    }
  }
}).controller('mailchimpCtrl', function($uibModalInstance,$scope,Auth,service){
  $scope.save = function(isValid){
    $scope.error = '';
    if(isValid){
      Auth.setProvider({provider: service, providerData: {auth:{apiKey: $scope.password}}}).
      then(function(data){
        $scope.user.provider = 'mailchimp';
        $uibModalInstance.close();
      }).catch(function(err){
        $scope.error = err;
      });
    }
  }
}).controller('viewEmailCtrl', function($uibModalInstance,$scope,email){
  $scope.emailview = email;
  $scope.close = function(){
    $uibModalInstance.dismiss();
  }
});
