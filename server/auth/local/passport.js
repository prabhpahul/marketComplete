var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../../api/user/user.model');

exports.setup = function (User, config) {
  passport.use(new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback : true
    },
    function(req, username, password, done) {
      User.findOne({
        username: username.toLowerCase()
      }, function(err, user) {
        if (err) return done(err);
        else if (!user) 
          return done(null, false, { message: 'This user is not registered.' });
        else if(!user.is_activated)
          return done(null, false, { message: "You haven't verified your email yet" });
        else if (!user.authenticate(password))
          return done(null, false, { message: 'This password is not correct.' });
        else
          return done(null, user);
      });
    }
  ));
};