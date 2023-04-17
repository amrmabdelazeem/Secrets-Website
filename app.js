//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//facebook auth part
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",(req, res)=>{
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secerts.
    res.redirect("/secrets");
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/submit", (req, res)=>{
    if (req.isAuthenticated()) {
        res.render("submit"); 
    } else {
        res.redirect("/login"); 
    }
});

app.post("/submit",(req, res)=>{
    const submitedSecret = req.body.secret;

    User.findById(req.user.id).then((foundUser)=>{
        foundUser.secret = submitedSecret;
        foundUser.save().then(res.redirect("/secrets"))
    })
})

app.get("/login",(req, res)=>{
    res.render("login");
})
app.get("/register",(req, res)=>{
    res.render("register");
})

app.get("/secrets", (req, res) => {
    // use this method to stop the cache from being stored. Taken from another user in this thread
        res.set(
            'Cache-Control', 
            'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
        );
        User.find({"secret":{$ne:null}}).then((foundUsers)=>{
            res.render("secrets", {usersWithSecrets: foundUsers});
        })
    });


    app.get("/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) {
                return next(err); 
            } else {
                res.redirect("/");
            }
        });  
    });

app.post("/register", (req, res)=>{

    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if(err){
            console.log(err)
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            });
        };
    });

    // bcrypt.hash(req.body.password, saltRounds).then(function(hash) {
    //     // Store hash in your password DB.
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    //     try {
    //         newUser.save();
    //         console.log("Successfully saved new user!");
    //         res.render("secrets");
    //     } catch (err) {
    //         res.send(err);
    //     }
    // });
});

//updated post route for "/login" taken from the documentation on passport.js
app.post("/login", passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login"
}

//     User.findOne({email: username}).then((foundUser)=>{
//         if(foundUser){
//             bcrypt.compare(password, foundUser.password).then(function(result) {
//                 // result == true
//                 if(result === true){
//                     res.render("secrets");
//                 }else{
//                     res.send("Password inccorect");
//                 };
//             }).catch(err=>{
//                 res.send(err);
//             })  
//             }
// }).catch(err=>{
//     res.send(err);
// })
));
app.listen(3000, ()=>{
    console.log("Server started on port 3000");
})
