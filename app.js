//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// const secret = process.env.SECRET;
userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]});

const User = new mongoose.model("User", userSchema);



app.get("/",(req, res)=>{
    res.render("home");
})
app.get("/login",(req, res)=>{
    res.render("login");
})
app.get("/register",(req, res)=>{
    res.render("register");
})

app.listen(3000, ()=>{
    console.log("Server started on port 3000");
})

app.post("/register", (req, res)=>{
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    try {
        newUser.save();
        console.log("Successfully saved new user!");
        res.render("secrets");
    } catch (err) {
        res.send(err);
    }

});

app.post("/login", (req, res)=>{
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}).then((foundUser)=>{
        if(foundUser){
            if(foundUser.password === password){
                res.render("secrets");
            }else{
                res.send("Password inccorect");
            }
        }
    }).catch(err=>{
        res.send(err);
    })
})