'use strict';

var app = require('../..');
import request from 'supertest';

describe('Email API:', function() {

  describe('GET /api/emails', function() {
    var emails;

    beforeEach(function(done) {
      request(app)
        .get('/api/emails')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          emails = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      emails.should.be.instanceOf(Array);
    });

  });

});
