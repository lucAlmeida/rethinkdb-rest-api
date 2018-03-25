const r = require('rethinkdb');
const config = require('../../config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.user_signup = (req, res, next) => {
    const user = req.body;
    user.email = req.body.email;
    r.connect(config.rethinkdb).then(function(conn) {
        r.table('users').filter(r.row('email').eq(user.email)).run(conn).then(function(cursor) {
            cursor.toArray().then(function(result) {
                if (result.length > 0) {
                    return res.status(409).json({
                        message: 'Mail exists'
                    });
                } else {
                    bcrypt.hash(req.body.password, 10, (err, hash) => {
                        if (err) {
                            return res.status(500).json({
                                error: err
                            });
                        } else {
                            user.password = hash;
                        }
                        r.connect(config.rethinkdb).then(function(conn) {
                            r.table('users').insert(user, {returnChanges: true}).run(conn).then(function(result) {
                              console.log(result.changes[0].new_val);
                              res.status(201).json({
                                  message: 'User created'
                              });
                            }).catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error: err
                                });
                            });
                        });
                    });
                }
            });
        });
    });
}

exports.user_login = (req, res, next) => {
    const user = req.body;
    user.email = req.body.email;
    r.connect(config.rethinkdb).then(function(conn) {
        r.table('users').filter(r.row('email').eq(user.email)).run(conn).then(function(cursor) {
            cursor.toArray().then(function(user) {
                if (user.length < 1) {
                    return res.status(401).json({
                        message: 'Auth failed'
                    });
                }
                bcrypt.compare(req.body.password, user[0].password, (err, result) => {
                    if (err) {
                        return res.status(401).json({
                            message: 'Auth failed'
                        });
                    }
                    if (result) {
                        const token = jwt.sign({
                            email: user[0].email,
                            userId: user[0].id
                        }, process.env.JWT_KEY, { expiresIn: "1h"});
                        return res.status(200).json({
                            message: 'Auth successful',
                            token: token
                        });
                    }
                    res.status(401).json({
                        message: 'Auth failed'
                    });
                })
            })
        }).catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
    });
}

exports.user_delete = (req, res, next) => {
    const id = req.params.userId;

    r.connect(config.rethinkdb).then(function(conn) {
        r.table('users').get(id).delete().run(conn).then(function(result) {
            res.status(200).json({
                message: 'User deleted'
            });
        }).catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
    });
}
