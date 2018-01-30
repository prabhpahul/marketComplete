'use strict';

//Email service used for communicating with the email REST endpoints
angular.module('angFullstackApp').factory('Message', function ($http) {
	var factory = {};

	factory.saveTemplate = function(template){
		template.type = 'sms';
		return $http.post('/api/template', template);
	};

	factory.getTemplates = function(){
		return $http.get('/api/template?type=sms');
	};

	factory.removeTemplate = function(id){
		return $http.delete('/api/template/'+id);
	};

	factory.editTemplate = function(id,options){
		return $http.put('/api/template/'+id, options);
	};

	factory.send = function(options){
		return $http.post('/api/messages/send', options);
	};

	factory.getList = function(list_id){
		return $http.get('/api/users/list/'+list_id);
	};

	factory.getLists = function(){
		return $http.get('/api/users/lists/sms');
	};

	factory.saveList = function(listData){
		return $http.post('/api/users/lists', listData);
	};
	
	factory.removeList = function(id){
		return $http.delete('/api/users/list/'+id);
	};

	factory.get = function(next){
		return $http.get('/api/messages?next='+next);
	};

	return factory;
});
