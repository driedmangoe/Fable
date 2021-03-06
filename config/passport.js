var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
//Passport with facebook
var Strategy = require('passport-facebook').Strategy;
var User = require('../models/user');
var fs = require('fs');

// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  console.log('serializing user: ', user.local.username);
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    console.log('deserializing user: ', user.local.username);
    done(err, user);
  });
});

// =========================================================================
// LOCAL SIGNUP ============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use('local-signup', new LocalStrategy({
    passReqToCallback: true
  },
  function(req, username, password, done) {

    // asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      User.findOne({
        $or:[
            {'local.email': req.body['email']},
            {'local.username': username}
        ]
      }, function(err, user) {
        // if there are any errors, return the error
        if (err)
          return done(err);

        // check to see if theres already a user with that email
        if (user) {
          return done(null, false, req.flash('signupMessage', 'That username or email is already taken.'));
        } else {

          // if there is no user with that email
          // create the user
          var newUser = new User();

          console.log(req.body['picture']);
          // set the user's local credentials
          newUser.local.birthdate = "";
          newUser.local.gender = "";
          newUser.local.location = "";
          newUser.local.username = username;
          newUser.local.email = req.body['email'];
          newUser.local.password = newUser.generateHash(password);
          newUser.local.contributor = req.body['contributor'];
          if (req.body["picture"] == "") {
              req.body["picture"] = "http://blogdailyherald.com/wp-content/uploads/2014/10/wallpaper-for-facebook-profile-photo.jpg";
            }
          newUser.local.picture = req.body['picture'];
          newUser.local.usertype = req.body['usertype'];
          if(req.body['usertype'] == 'contributor'){
            newUser.local.contributor = req.body['usertype'];
          }

          // save the user
          newUser.save(function(err) {
            if (err)
              throw err;
            return done(null, newUser);
          });
        }

      });

    });

  }));
// =========================================================================
// FaceBook SIGNUP ============================================================
// =========================================================================
// we are using facebook Strategy when user wanto login with facebook
passport.use(new Strategy({
  clientID:952898294826486,
  clientSecret:'aeb6facaea45d91d119f46ac6c717aaa',
  callbackURL:"http://localhost:3000/auth/facebook/callback"
},function(accessToken, refreshToken, profile, done) {
  process.nextTick(function (){
    User.findOne({'facebook.id':profile.id},function(err,user){
      if(err) return done(err);
      if(user)
        return done(null,user);
      else {
        var newUser = new User();

        newUser.facebook.id = profile.id;
        newUser.facebook.token = accessToken;
        newUser.facebook.name = profile.displayName;
        //newUser.facebook.email = profile.emails[0].value;
        newUser.local.username = profile.displayName;
        newUser.local.picture = "https://graph.facebook.com/"+profile.id+"/picture"+"?width=200&height=200"+"&access_token="+accessToken;
        newUser.facebook.first = true;

        newUser.save(function(err){
          if (err) throw err;
          return done(null,newUser);
        });
      }


    });

  });

}));

// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use('local-login', new LocalStrategy({
    passReqToCallback: true // allows us to pass back the entire request to the callback
  },
  function(req, username, password, done) { // callback with email and password from our form

    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    User.findOne({
      $or:[
        {'local.email': username},
        {'local.username': username}
      ]
    }, function(err, user) {
      // if there are any errors, return the error before anything else
      if (err)
        return done(err);

      // if no user is found, return the message
      if (!user)
        return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

      // if the user is found but the password is wrong
      if (!user.validPassword(password))
        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

      // all is well, return successful user
      return done(null, user);
    });

  }));
