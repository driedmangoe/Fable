///<reference path='../types/DefinitelyTyped/node/node.d.ts'/>
///<reference path='../types/DefinitelyTyped/express/express.d.ts'/>
var User = require('../models/user');
var File = require('../models/file');
var Comic = require('../models/comic');
var Comment = require('../models/comment');
var Comicstrip = require('../models/comicstrip');
var express = require('express');
var router = express.Router();
var passport = require('passport');
var multer = require('multer');
var imageDir = __dirname + "/../public/images/";
var fs = require("fs");
var storage = multer.diskStorage({
  destination: function (request, file, callback) {
    callback(null, './public/images');
},
filename: function (request, file, callback) {
    console.log(file);
    var fileFormat = (file.originalname).split(".");
    // rename the file to be the comicname + "-" + pagenumber
    callback(null, request.body["comicName"]+"-"+request.body["stripid"]+ "." +fileFormat[fileFormat.length - 1]);
}
});
var upload = multer({storage: storage}).single('filename');
/**
 * Middleware
 */
// route middleware to make sure a user is logged in
var isLoggedIn = function (req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
    // if they aren't redirect them to the home page
    res.redirect('/');
};
/* GET main page. */
router.get('/', function (req, res, next) {
    res.render('index');
});


/* file upload  */
router.post('/fileupload2', function(request, response) {
    
  upload(request, response, function(err) {
      if(err) {
        console.log('Error Occured');
        console.log(err);
        return;
      }
    console.log(request.body);
    console.log(request.file);
    var comicName= request.body["comicName"];
    Comic.findOne({"comic.comicName" : comicName},function(err,comic){
      if(err) throw err;
      console.log("finding");
      console.log(comic);
  
      var comicstripcoop = new Comicstrip({"comicstrip.comicName" : request.body["comicName"],
                                        "comicstrip.author": request.user.local.username,
                                        "comicstrip.date": new Date(),
                                        "comicstrip.stripid": request.body["comicName"]+"-"+request.body["stripid"]});

      comicstripcoop.save(function(err) {
        if(err) throw err;
        console.log("comicstrip created");
      });

      var a = comic.comic.pages;
      a.push(request.file.filename);
      console.log(a);
      console.log(comicName);
      if(request.body["stripid"] == "cover"){
        Comic.update(
          {'comic.comicName' : comicName},
          {'comic.coverpage' : request.file.filename},
          {safe: true},
          function(err,raw){
            if(err) throw err;
            console.log(raw);
          }
        );
      } else{
        Comic.update(
          {'comic.comicName':comicName},
          {'comic.pages':a},
          {safe: true},
          function(err,raw){
            if(err) throw err;
            console.log(raw);
          }
        );
      } 
    });
    response.redirect("/comic/"+comicName);   
  //});
});
});

router.get('/comic/:name/uploadcover',function(req,res){
  var comicName = req.params.name;
  console.log(comicName);
  Comic.findOne({"comic.comicName" : comicName},function(err,comic){
    if(err) throw err;
    console.log(comic);
    if(comic){
      res.render('uploadcover',{comic,user:req.user});
    } else {
      console.log("No such comic!");
      res.redirect('/home');
    }
  });
});


router.get("/images/:id", function (request, response) {
    var path = imageDir + request.params.filename;
    console.log("fetching image: ", path);
    response.sendFile(path);
});

// /* GET comic main page. */
// router.get('/comicmainpage', isLoggedIn, function (req, res) {
// Comic.find().limit(1).sort({$natural:-1}).exec(function(err, comics) { 
//       if (err) throw err;
//       File.find().limit(1).sort({$natural:-1}).exec(function(err,files){
//         res.render('comicmainpage', {comic: comics, file: files , user: req.user});
//       });
//   });
// });

//  GET cooperative comic main page. 
// router.get('/cooperative', isLoggedIn, function (req, res) {
// Comic.find().limit(1).sort({$natural:-1}).exec(function(err, comics) { 
//       if (err) throw err;
//       File.find().limit(1).sort({$natural:-1}).exec(function(err,files){
//         res.render('cooperativecomicmain', {comic: comics, file: files , user: req.user});
//       });
//   });
// });

/* GET comic upload page*/
router.get('/comic/:name/upload',isLoggedIn,function(req,res){
  var comicName = req.params.name;
  console.log(comicName);
  Comic.findOne({"comic.comicName" : comicName},function(err,comic){
    if(err) throw err;
    console.log(comic);
    if(comic){
      res.render('uploadcomic',{comic,user:req.user});
    } else {
      console.log("No such comic");
      // still need to improve
      res.redirect('/home');
    }
  });
});

/* GET nextPage */
router.get('/comic/:name/:pages', isLoggedIn, function(req,res){
  var comicName = req.params.name;
  var pages = req.params.pages;
  console.log(comicName);
  console.log(pages);
  Comic.findOne({"comic.comicName": comicName, "comic.pages": pages}, function(err, comic){
    if(err) throw err;
    console.log(comic);
    if(comic){
      res.render('page', {comic, user:req.user});
    } else {
      console.log("No such comic");
      res.redirect('/home');
    }
  });
});

/* POST to cooperative comic */
router.post('/createcomic', function(req, res) {
  console.log(req.body);
  //console.log("here");

  var comic = new Comic({
    "comic.comicName": req.body["comicName"],
    "comic.cooperative": (req.body["comictype"]=='coop'),
    "comic.description": req.body["description"],
    "comic.favourite":[],
    "comic.author": req.user.local.username,
    "comic.date": new Date(),
    "comic.coverpage": [],
    "comic.pages": [],
    "comic.worklist":[req.user.local.username,]
    //"comic.page1": req.body["page1"],
    //"comic.page2": req.body["page2"]
  });
  console.log("there");

  comic.save(function(err) {
      if (err) throw err;
      res.redirect('/comic/'+req.body["comicName"]);
  });
});

// /* GET solo comic main page. */
// router.get('/solo', isLoggedIn, function (req, res) {
//     //var soloURL = '/solo/';
//    // var titleADDON = user.local.comictitle;
//    // var url = soloURL.concat(titleADDON);
//    res.render('solocomicmain', {

//         user: req.user // get the user out of session and pass to template
//     });
// });

// /* GET solo comic main page. */
// router.get('/solo', isLoggedIn, function (req, res) {
// Comic.find().limit(1).sort({$natural:-1}).exec(function(err, comics) { 
//       if (err) throw err;
//       File.find().limit(1).sort({$natural:-1}).exec(function(err,files){
//         res.render('solocomicmain/' + req.user.username, {comic: comics, file: files , user: req.user});
//       });
//   });
// });

// /* POST to solo comic */
// router.post('/solo', function(req, res) {

//   var comic = new Comic({
//     "comic.comicName": req.body["comicName"],
//     "comic.cooperative": false,
//     "comic.description": req.body["description"],
//     "comic.genre" : req.body["genre"],
//     "comic.favorite": false,
//     "comic.author": req.user.local.username,
//     "comic.date": new Date(),
//     "comic.img": req.body["img"],
//     "comic.page1": req.body["page1"],
//     "comic.page2": req.body["page2"]
//   });

//   comic.save(function(err) {
//       if (err) throw err;
//       res.redirect('/comicmainpage');
//   });
// });

// /* Solo File Uploading Service */
// router.post('/fileupload', function(request, response) {
    
//   upload(request, response, function(err) {
//       if(err) {
//         console.log('Error Occured');
//         console.log(err);
//         return;
//       }
//     console.log(request.file);
//   // STORE FILENAME INTO MONGODO- FILENAME FIELD IS IN request.file.filename

//   var file = new File({
//                   filename: request.file.filename
//               });
  
//   file.save(function(err) {
//       if (err) throw err;
//       console.log('File saved!');
//   });

//   File.find().limit(1).sort({$natural:-1}).exec(function(err, files) { 
//       if (err) throw err;
//   // object of all the users
//     console.log("FAF");
//     console.log(files);
//   //i'm pulling file names from the database in this for loop and sending it, 
//   //my problem is here where i should send back the whole file object
//           //send back the whole file object, look at the tutorial for user/email
//       response.redirect("/solo");   
//   })
// });
// });


/* GET login page. */
router.get('/login', function (req, res) {
    res.render('login', { message: req.flash('loginMessage') });
});
/* GET signup page. */
router.get('/signup', function (req, res) {
    res.render('signup', { message: req.flash('signupMessage')});
});
/* GET home page. */
router.get('/home', isLoggedIn, function (req, res) {
    res.render('home', {
        user: req.user // get the user out of session and pass to template
    });
});
/* GET profile page. */
router.get('/profile/:username', isLoggedIn, function (req, res) {
  var u = req.user;
  console.log(req.params);
   User.findOne({'local.username':req.params.username}, function(err, user) {
      if (err) throw err;
      u = user;
  console.log(req.params);
    res.render('profile', {
        user: req.user, otheruser: u // get the user out of session and pass to template
    });
});
});   
router.get('/profile', isLoggedIn, function (req, res) {
  var u = req.user;
  console.log(req);
    res.render('profile', {
        user: u, otheruser: u // get the user out of session and pass to template
    });
});

router.post('/profile', function (req, res) {
var username = req.user.local.username;
var birthdate = req.user.local.birthdate;
var gender = req.user.local.gender;
var location = req.user.local.location;

if (req.body["birthdate"] == "") {
  req.body["birthdate"] = birthdate;
}
if (req.body["location"] == "") {
  req.body["location"] = location;
}
if (req.body["gender"] == "") {
  req.body["gender"] = gender;
}
User.update({'local.username': username},
    {'local.birthdate':req.body["birthdate"], 
    'local.gender':req.body["gender"], 
    'local.location':req.body["location"]
    }, {multi:true},function(err, raw){
      res.redirect("/profile");
});
});


// to remove everything
// Comment.remove({}, function (err) {
//  if (err) return handleError(err);
  // removed!
//});
router.get('/comment/:comic', isLoggedIn, function (req, res) {
  Comment.find({'comment.comic':req.params.comic}, function(err, comments) {
      if (err) throw err;
      {Comic.findOne({'comic.comicName':req.params.comic}, function(err, comic) {
      if (err) throw err;
    res.render('comment', {comment: comments , user: req.user, comic: comic});
  });}
 });
});
/* POST to comments */
router.post('/comment', function(req, res) {
console.log(req.body);
var comment = new Comment({
    "comment.post": req.body["comment"],
    "comment.commentor": req.user.local.username,
    "comment.picture": req.user.local.picture,
    "comment.date": new Date(),
    "comment.comic": req.body["comicName"],
});
console.log(comment);
  comment.save(function(err) {
      if (err) throw err;
      res.redirect('/comment/'+comment.comment.comic);
      console.log('comment posted!');
  });
});



/* GET myworks page. */
router.get('/myworks', isLoggedIn, function(req, res){
   Comic.find({author : req.user.local.username}, function(err, comics){
       if (err) throw err;
      res.render('myworks', {
         comic: comics,
         user: req.user // get the user out of session and pass to template
      });
    });
});
  
/* GET images */
router.get("/images/:id", function (request, response) {
    var path = imageDir + request.params.filename;
    console.log("fetching image: ", path);
    response.sendFile(path);
});

/* GET search page. */
router.get('/search', isLoggedIn, function (req, res) {
    res.render('search', {
        user: req.user // get the user out of session and pass to template
    });
});
/*search result*/
router.post('/test', function(req,res,next) {
  console.log("POST REQ");
  console.log(req.body.type);
  var a ="";
  if(req.body.type == "comic"){
    Comic.find({'comic.comicName' : req.body.data},function(err,comics){
      console.log("SEARCHING");
      console.log(comics);
      if(err) throw err;
      //console.log(req.body);
      //console.log({comic: comics});
      
      if(comics.length!=0){
        for(i=0;i<comics.length;i++){
          a += " " + comics[i]["comic"]["comicName"];
        }
        //console.log(comics[0]);
        //console.log(comics[0]["comic"]["author"]);
      } else {
        a = "Not Found!";
      }
      console.log(a);
      res.send(a);
    });
  } else {
    User.find({'local.username' : req.body.data},function(err,users){
      console.log("SEARCHING");
      console.log(users);
      if(err) throw err;
      if(users.length!=0){
        for(i=0;i<users.length;i++){
          a += " " + users[i]["local"]["username"];
        }
      } else {
        a = "Not Found!";
      }
      console.log(a);
      res.send(a);
    });
 }
 //res.send(req.body.data);
 });

// /* GET solo comic page 1. */
// router.get('/solocomic', isLoggedIn, function (req, res) {
//     res.render('solocomic', {
//         user: req.user // get the user out of session and pass to template
//     });
// });
// /* GET solo comic page 2. */
// router.get('/solocomic2', isLoggedIn, function (req, res) {
//     res.render('solocomic2', {
//         user: req.user // get the user out of session and pass to template
//     });
// });

// /* GET cooperative comic page 1. */
// router.get('/cooperativecomic', isLoggedIn, function (req, res) {
// Comic.find().limit(1).sort({$natural:-1}).exec(function(err, comics) { 
//       if (err) throw err;
//       File.find().limit(1).sort({$natural:-1}).exec(function(err,files){
//         res.render('cooperativecomic', {comic: comics, file: files , user: req.user});
//       });
//   });
// });

// /* POST to comic */
// router.post('/cooperativecomic', function(req, res) {

//   var comic = new Comic({
//     "comic.comicName": req.body["comicName"],
//     "comic.cooperative": true,
//     "comic.description": req.body["description"],
//     "comic.genre": req.body["genre"],
//     "comic.favorite": false,
//     "comic.author": req.user.local.username,
//     "comic.date": new Date(),
//     "comic.img": req.body["img"],
//     "comic.page1": req.body["page1"],
//     "comic.page2": req.body["page2"]
//   });

//   comic.save(function(err) {
//       if (err) throw err;
//       res.redirect('/cooperativecomic');
//   });
// });



// /* GET cooperative comic page 2. */
// router.get('/cooperativecomic2', isLoggedIn, function (req, res) {
//     res.render('cooperativecomic2', {
//         user: req.user // get the user out of session and pass to template
//     });
// });

/*add favourite*/

router.post('/addfavourite',function(req,res){
  console.log("here");
  console.log(req.body);
  var comicName = req.body.comic;
  var username = req.body.data;
  console.log(comicName);
  console.log(username);

  Comic.findOne({"comic.comicName" : comicName},function(err,comic){
    if(err) throw err;

    var tempcomicfavour = comic.comic.favourite;
    console.log(tempcomicfavour);
    if(tempcomicfavour.indexOf(username) == -1){
      tempcomicfavour.push(username); 
    }
    Comic.update(
          {'comic.comicName' : comicName},
          {'comic.favourite' : tempcomicfavour},
          {safe: true},
          function(err,raw){
            if(err) throw err;
            console.log(raw);
          }
        );
  });

  User.findOne({},function(err,user){
    if (err) throw err;
    var tempuserfavourite = user.local.favourite;
    if(tempuserfavourite.indexOf(comicName) == -1){
      tempuserfavourite.push(comicName);
    }
    console.log(tempuserfavourite);
    User.update(
    {'local.username': username},
    {'local.favourite':tempuserfavourite},
    {safe:true},
    function(err,raw){
            if(err) throw err;
            console.log(raw);
          }
  );
  }); 
  console.log("comicsucc");
  res.send("Success");
});
/* comic page Uploading Service */
router.post('/fileuploadpage1', function(request, response) {
    var filename_arr2 = [];
  upload(request, response, function(err) {
      if(err) {
        console.log('Error Occured');
        console.log(err);
        return;
    }
    console.log(request.file);
  // STORE FILENAME INTO MONGODO- FILENAME FIELD IS IN request.file.filename

  var file2 = new File({
    filename: request.file.filename
});
  file2.save(function(err) {
      if (err) throw err;
      console.log('File saved!');
  });
  File.find({}, function(err, files) {
      if (err) throw err;

  // object of all the users
  
  console.log("FAF");
  console.log(files);
  //i'm pulling file names from the database in this for loop and sending it, 
  //my problem is here where i should send back the whole file object
  for(i=0;i <files.length; i++){
    console.log(files[i].filename);
    filename_arr2.push(files[i].filename);
    if (i == (files.length -1)){
        //send back the whole file object, look at the tutorial for user/email
        response.render('fileuploadpage1', {filenames: filename_arr2});   
    }
};

});
  
})
});

/*Get comic mainpage with cover page and Comicname*/
router.get('/comic/:name', isLoggedIn, function(req, res){
  var comicName = req.params.name;
  console.log(comicName);
  Comic.findOne({"comic.comicName" : comicName},function(err,comic){
    if(err) throw err;
    if(comic){
      console.log(JSON.stringify(comic));
      console.log(req.user);
      res.render('test',{user: req.user, comic});
    } else {
      console.log("No such comic");
      // still need to improve
      res.redirect('/home');
    }
    
  });

});
/* GET upload page. */
router.get('/upload', isLoggedIn, function (req, res) {
    res.render('upload', {
        user: req.user // get the user out of session and pass to template
    });
});

/* Edit view. */
router.get('/editcomic', isLoggedIn, function (req, res) {
    res.render('cooperativecomicmain', {
        user: req.user // get the user out of session and pass to template
    });
});

/* GET Userlist page. */
router.get('/userlist', function (req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    collection.find({}, {}, function (e, docs) {
        res.render('userlist', {
            "userlist": docs
        });
    });
});
/**
 * Logout page
 */
 router.get('/logout', function (req, res, next) {
    req.logout();
    // req.session.destroy();
    res.redirect('/');
});
 /* POST to Authenticate Service */
 router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true // allow flash messages
}));
 /* POST to Add User Service */
 router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/signup',
    failureFlash: true // allow flash messages
}));
 module.exports = router;
