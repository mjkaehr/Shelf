var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
var hash = require('../middleware/hash')
var bcrypt = require('bcrypt')

mongoose.connect(process.env.MONGODB_HOST, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

/* Objects */
var User = require('../model/user');

/**
 * All user related routes
 */
router.get("/", function (req, res) {
    res.send('This route is for all user related tasks');
});

/*
 * Register new user 
 */
router.post("/register", (req, res) => {

    if (!req.body.email || !req.body.password || !req.body.username || !req.body.birthday) {
        res.status(400).send({ message: "Bad Request: Register user data is incomplete" });
        return;
    }

    hash(req.body.password).then((password) => {
        // User Data
        var newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: password,
            birthday: req.body.birthday
        });

        // Add to database with auth
        newUser.save().then(() => {
            return newUser.generateAuth().then((token) => {
                res.status(200).send(newUser);
                return
            });
        }).catch((err) => {
            if (err.code == 11000) {
                if(err.errmsg.includes("email", 0)){
                    res.status(409).send({ message: "Conflict: Email already exists" })
                    return
                }
                res.status(409).send({ message: "Conflict: User already exists" })
                return
            }
            res.status(500).send(err)
            return;
        })
    }).catch(err => {
        res.status(500).send(err)
    })
});

router.post('/login', (req,res) => {
    
    if (!req.body.username || !req.body.password) {
        res.status(400).send({ message: "Bad request: Login user data is incomplete" })
        return;
    }

    User.findOne({username: req.body.username}).then( user => {

        if(!user){
            res.status(404).send({ message: "Not Found: User does not exist" })
            return;
        }

        bcrypt.compare(req.body.password, user.password, (err, comp) => {
            if(comp == false){
                res.status(401).send({ message: "Unauthorized: Password is incorrect" })
                return
            }

            user.generateAuth().then( token => {
                res.status(200).header('token', token).send(user)
                return
            })
        })
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
})

module.exports = router;
