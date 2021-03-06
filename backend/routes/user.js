var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
var hash = require('../middleware/hash')
var bcrypt = require('bcrypt')
var authenticate = require('../middleware/authenticate')
var mailer = require('../middleware/mailer')
var crypto = require('crypto')
const updateFeed = require('../middleware/updateFeed')

mongoose.connect(process.env.MONGODB_HOST, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('debug', false);

mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

/* Objects */
var User = require('../model/user');
var Inbox = require('../model/inbox')
var Messsage = require('../model/message')

/**
 * All user related routes
 */
router.get("/", function (req, res) {
    res.send('This route is for all user related tasks');
});

/**
 * Get All Users
 */
router.get("/all-users", authenticate, (req, res) => {

    User.find({}).then((users) => {
        res.status(200).send(users);
        return
    }).catch((err) => {
        res.status(500).send(err);
        return
    })
})


router.get("/filter-user/:query", authenticate, (req, res) => {

    User.find({ "username": { "$regex": req.params.query, "$options": "i" } }).then((users) => {
            res.status(200).send(users);
            return

    }).catch((err) => {
        res.status(500).send(err);
        return
    })
})

router.get("/all-messages", authenticate, (req, res) => {

    const getDetailedMessage = id => {
        return new Promise((resolve, reject) => {
            Messsage.findOne({_id: id}).then( msg => {
                resolve(msg)
            })
        })
    }
    
    const getMessages = async (messages) => {
        let arr = []
        for (const element of messages) {
            const msg = await getDetailedMessage(element)
            arr.push(msg)
        }
        return arr
    }

    User.findOne({ username: req.user.username }).then((user) => {
        getMessages(user.messages).then((messages) => {
            res.status(200).send(messages)
            return
        })
    }).catch((err) => {
        console.log(err)
        res.status(500).send(err);
        return
    })
})

router.get('/feed', authenticate, (req, res) => {
    User.findOne({username: req.user.username}).then((usr) => {
        updateFeed.getCollectiveFeed(req.user).then(feeds => {
            res.status(200).send(feeds)
        })
        return;
    }).catch(err => {
        res.status(500).send(err)
        return;
    })
})

router.get('/personal-history', authenticate, (req, res) => {
    User.findOne({username: req.user.username}).then((usr) => {
        res.status(200).send(usr.feed)
        return;
    }).catch(err => {
        res.status(500).send(err)
        return;
    })
})

router.get("/:username/games-rated/:gameId", authenticate, (req, res) => {

    User.findOne({ username: req.params.username }, { games_rated: { $elemMatch: { game_id: req.params.gameId } } }).then(user => {
        if (!user.games_rated.length) {
            res.status(200).send({ rating: '0' });
            return
        }
        res.status(200).send({ rating: user.games_rated[0].rating });
        return
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
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

        var inbox = new Inbox()
        inbox.save();
        var verificationNum = crypto.randomBytes(2).toString('hex');

        // User Data
        var newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: password,
            birthday: req.body.birthday,
            inboxID: inbox._id,
            verificationNum: verificationNum,
        });


        const body = "Dear " + req.body.username +
            ",\n\nThank you for registering for our service. Please verify your email using the following code:\n" +
            verificationNum + "\n\Best, \nThe Shelf Team";
        const subject = "Welcome to Shelf!"

        // Add to database with auth
        newUser.save().then(() => {
            return newUser.generateAuth().then((token) => {
                mailer(req.body.email, subject, body);
                res.status(200).send(newUser);
                return
            });
        }).catch((err) => {
            if (err.code == 11000) {
                if (err.errmsg.includes("email", 0)) {
                    res.status(409).send({ message: "Conflict: Email already exists" })
                    return
                }
                res.status(409).send({ message: "Conflict: User already exists" })
                return
            }
            console.log(err)
            res.status(500).send(err)
            return;
        })
    }).catch(err => {
        console.log(err)
        res.status(500).send(err)
        return;
    })
});

/*
 * Login 
 */
router.post('/login', (req, res) => {

    if (!req.body.username || !req.body.password) {
        res.status(400).send({ message: "Bad request: Login user data is incomplete" })
        return;
    }

    User.findOne({ username: req.body.username }).then(user => {

        if (!user) {
            res.status(404).send({ message: "Not Found: User does not exist" })
            return;
        }

        if (!user.verified) {
            res.status(401).send({ message: "Please verify your email before logging in" })
            return;
        }

        bcrypt.compare(req.body.password, user.password, (err, comp) => {
            if (comp == false) {
                res.status(401).send({ message: "Unauthorized: Password is incorrect" })
                return
            }

            user.generateAuth().then(token => {
                res.status(200).header('token', token).send(user)
                return
            })
        })
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
})

/*
 * Logout
 */
router.post('/logout', authenticate, (req, res) => {

    if (!req.body.username) {
        res.status(400).send({ message: "Bad request: Logout user data is incomplete" })
        return;
    }

    User.findOneAndUpdate({ username: req.body.username }, {
        $set: {
            tokens: []
        }
    }, () => {
        res.status(200).send({ message: "User \'" + req.body.username + "\' successfully logged out" })
        return
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
})

router.post('/follow', authenticate, (req, res) => {
    if (!req.body || !req.body.user) {
        res.status(400).send({ message: "Bad request: Follow is incomplete" })
        return;
    }

    if (req.body.user === req.user.username) {
        res.status(400).send({ message: "Bad request: you can't follow yourself" })
        return;
    }

    User.findById(req.user._id, (err, user) => {
        if (err) {
            res.status(401).send({ message: "User does not exist" })
            return
        }

        let i = 0;
        for (i = 0; i < user.following.length; i++) {
            if (user.following[i] === req.body.user) {
                res.status(409).send({ message: "Bad request: you are already following this person" })
                return;
            }
        }

        User.findByIdAndUpdate(user._id, {
            $push: {
                following: req.body.user
            }
        }).then(usr => {
            User.findOneAndUpdate({ username: req.body.user }, {
                $push: {
                    followers: req.user.username
                }
            }).then(() => {
                updateFeed.addToFeed(req.user, updateFeed.USER_FOLLOWED_SOMEONE_ELSE_FEED(req.user.username, req.body.user), false, null)
                res.status(200).send({ message: "You are now following " + req.body.user })
                return
            })
        }).catch((err) => {
            res.status(500).send(err)
            return
        })
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
})

router.post('/unfollow', authenticate, (req, res) => {
    if (!req.body || !req.body.user) {
        res.status(400).send({ message: "Bad request: Unfollow data is incomplete" })
        return;
    }

    if (req.body.user === req.user.username) {
        res.status(400).send({ message: "Bad request: you can't unfollow yourseld" })
        return;
    }

    User.findById(req.user._id, (err, user) => {
        if (err) {
            res.status(401).send({ message: "User does not exist" })
            return
        }

        User.findByIdAndUpdate(user._id, {
            $pull: {
                following: req.body.user
            }
        }).then(usr => {
            User.findOneAndUpdate({ username: req.body.user }, {
                $pull: {
                    followers: req.user.username
                }
            }).then(() => {
                res.status(200).send({ message: "You have unfollowed " + req.body.user })
                return
            })
        }).catch((err) => {
            res.status(500).send(err)
            return
        })
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
})

/*
 * Get user data 
 */
router.post("/data", authenticate, (req, res) => {
    if (!req.body || !req.body.username) {
        res.status(400).send({ message: "Bad request: get user data data is incomplete" })
        return;
    }

    User.findOne({ username: req.body.username }).then(user => {
        if (!user) {
            res.status(401).send({ message: "User does not exist" })
            return
        }
        res.status(200).send(user)
        return
    }).catch((err) => {
        res.status(500).send(err)
        return
    })
})


router.post("/:username/games-rated", authenticate, (req, res) => {
    //no previous rating
    if (req.body.oldRating === 0 || req.body.oldRating === '0') {

        console.log(req.body.coverUrl);
        User.findOneAndUpdate({ username: req.params.username }, {
            $push: {
                games_rated: {
                    game_id: req.body.gameId,
                    rating: req.body.newRating,
                    coverUrl: req.body.coverUrl
                }
            }
        }).then(usr => {
            res.status(200).send({ message: req.body.gameId + " added to rated list for first time!" })
            return
        }).catch((err) => {
            res.status(500).send(err);
            return
        })


    }
    //user asking to delete rating
    else if (req.body.oldRating === req.body.newRating) {
        User.findOneAndUpdate({ username: req.params.username }, {
            $pull: {
                games_rated: {
                    game_id: req.body.gameId,
                    rating: req.body.newRating,
                    coverUrl: req.body.coverUrl
                }
            }
        }).then(usr => {
            res.status(200).send({ message: req.body.gameId + " removed from rated list!" })
            return
        }).catch((err) => {
            res.status(500).send(err);
            return
        })
    }
    else {
        //previous rating
        User.findOneAndUpdate({ username: req.params.username, "games_rated.game_id": req.body.gameId }, {
            $set: { "games_rated.$.rating": req.body.newRating }
        }).then(usr => {
            res.status(200).send({ message: req.body.gameId + " updated to new rating!" })
            return
        }).catch((err) => {
            res.status(500).send(err);
            return
        })
    }
});

router.post('/change-password', authenticate, (req, res) => {
    if (!req.body || !req.body.password) {
        res.status(400).send({ message: "User information incomplete" })
        return
    }

    hash(req.body.password).then(hashedPassword => {
        User.findOneAndUpdate({ username: req.user.username }, {
            $set: {
                password: hashedPassword
            }
        }).then(() => {
            res.status(200).send({ message: "Password changed!" })
            return
        }).catch(err => {
            res.status(500).send(err);
            return;
        });
    }).catch(err => {
        res.status(500).send(err);
        return;
    });
})

router.post('/change-email', authenticate, (req, res) => {
    if (!req.body || !req.body.email) {
        res.status(400).send({ message: "User information incomplete" })
        return
    }
    User.findByEmail(req.body.email).then(usr => {
        res.status(409).send({ message: "Email is already taken" })
        return
    }).catch(err => {
        var verificationNum = crypto.randomBytes(2).toString('hex');
        User.findOneAndUpdate({ username: req.user.username }, {
            $set: {
                email: req.body.email,
                verified: false,
                verificationNum: verificationNum
            }
        }).then(() => {
            const body = "Dear " + req.body.username +
                ",\n\nWe noticed you have requested an email change. Please verify your new email using the following code:\n" +
                verificationNum + "\n\Best, \nThe Shelf Team";
            const subject = "Email Change Detected"
            mailer(req.body.email, subject, body);
            res.status(200).send({ message: "Email changed!" })
            return
        }).catch(err => {
            res.status(500).send(err);
            return;
        });
    })

})

router.post('/forgot-password', (req, res) => {
    if (!req.body || !req.body.email) {
        res.status(400).send({ message: "Forgot password is incomplete" });
        return;
    }

    // Find user by email
    if (req.body.email) {
        User.findByEmail(req.body.email).then((user) => {
            const tempPassword = crypto.randomBytes(5).toString('hex');
            const email_subject = "Shelf Password Reset";
            const email_body = "Dear " + user.email + ", \n\nOur records indicate that you have requested a password " +
                "reset. Your new temporary password is:\n\n" +
                tempPassword + "\n\nSincerely, \n\nThe Shelf Team";
            hash(tempPassword).then(hashedPassword => {
                User.findOneAndUpdate({ email: user.email }, {
                    $set: {
                        password: hashedPassword
                    }
                }).then(() => {
                    // Send email to user
                    mailer(user.email, email_subject, email_body);
                    res.status(200).send({ message: 'Password has been reset.' });
                    return;
                })
            })
        }).catch((err) => {
            if (err === undefined) {
                res.status(404).send({ message: 'Email does not exist.' })
                return;
            }
            res.status(500).send(err)
            return;
        });
    }
})

router.post("/verify-email", (req, res) => {
    if (!req.body || !req.body.verificationNum || !req.body.email) {
        res.status(400).send({ message: "User data is incomplete" });
        return;
    }

    User.findVerificationNumByEmail(req.body.email).then((verificationNum) => {
        if (!verificationNum) {
            res.status(401).send({ message: "This error probably means that this email does not exist in the databse" });
            return;
        }
        if (verificationNum != req.body.verificationNum) {
            res.status(401).send({ message: "Verification code does not match" });
            return;
        }
        else {
            User.findOneAndUpdate({ email: req.body.email }, {
                $set: {
                    verified: true
                }
            }).then(() => {
                res.status(200).send({ message: "User has been succesfully verified" });
                return;
            }).catch((err) => {
                res.status(500).send(err);
                return;
            });
        }
    }).catch((err) => {
        if (err === undefined) {
            res.status(404).send({ message: 'Email does not exist.' })
            return;
        }
        console.log(err)
        res.status(500).send(err)
        return;
    });
})

router.post('/add-to-wish-list', authenticate, (req, res) => {

    if (!req.body || !req.body.gameName || !req.body.id) {
        res.status(400).send({ message: "Username or game id not provided" });
        return;
    }
    
    User.findOneAndUpdate({ username: req.user.username }, {
        $push: {
            wish_list: req.body.id
        }
    }).then(() => {
        updateFeed.addToFeed(req.user, updateFeed.WISH_LIST_FEED(req.user.username, req.body.gameName), false, null)
        res.status(200).send({ message: "Game added to wish list" })
        return;
    }).catch(err => {
        res.status(500).send(err);
        return
    });
})

router.post('/remove-from-wish-list', authenticate, (req, res) => {
    if (!req.body || !req.body.id) {
        res.status(400).send({ message: "Username or game id not provided" });
        return;
    }

    User.findOneAndUpdate({ username: req.user.username }, {
        $pull: {
            wish_list: req.body.id
        }
    }).then(() => {
        res.status(200).send({ message: "Game removed from wish list" })
    }).catch(err => {
        res.status(500).send(err);
    });
})

module.exports = router;
