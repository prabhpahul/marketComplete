'use strict';

//Email service used for communicating with the email REST endpoints
angular.module('angFullstackApp').factory('Email', function ($http, $resource) {
	var factory = {};

	factory.saveTemplate = function(template){
		template.type = 'email';
		return $http.post('/api/template', template);
	};

	factory.getTemplates = function(){
		return $http.get('/api/template?type=email');
	};

	factory.removeTemplate = function(id){
		return $http.delete('/api/template/'+id);
	};

	factory.editTemplate = function(id,options){
		return $http.put('/api/template/'+id, options);
	};

	factory.send = function(options){
		return $http.post('/api/emails/send', options);
	};

	factory.getList = function(list_id){
		return $http.get('/api/users/list/'+list_id);
	};

	factory.getLists = function(){
		return $http.get('/api/users/lists/email');
	};

	factory.saveList = function(listData){
		return $http.post('/api/users/lists', listData);
	};

	factory.removeList = function(id){
		return $http.delete('/api/users/list/'+id);
	};

	factory.get = function(next){
		return $http.get('/api/emails?next='+next);
	};

	factory.testEmail = function(options){
		var options = options || {};
		return $http.post('/api/emails/send/test',options);
	};
	
	factory.toolbar = [
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'quote'],
      ['bold', 'italics', 'underline', 'strikeThrough', 'ul', 'ol', 'redo', 'undo', 'clear'],
      ['justifyLeft', 'justifyCenter', 'justifyRight', 'indent', 'outdent'],
      ['html', 'insertImage','insertLink', 'wordcount', 'charcount']
    ];
	
	return factory;
});
