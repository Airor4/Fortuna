// @flow strict


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
require('dotenv').config();

import type {
    $Request,
    $Response,
    NextFunction,
    Middleware,
  } from 'express';

const User = require('../../../models/userModel');


// req: application/json
// res: json || error code
router.get('/', auth, async (req: $Request, res: $Response) => {
    try{
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch(err) {
        console.error(err.message);
        res.status(500).json({msg: 'Server Error'});
    }
});

// @TYPE POST
// @DESC Login - Authenticate user & get token
// Public
router.post('/', [
    check('userName', 'Please enter a username with 3 or more characters')
        .isLength(3),
    check('password', 'Password is required')
        .exists()
    ], 
    // req: application/json
    // res: json || error code
    async (req: $Request, res: $Response) => {
        // Makes sure the signup is valid
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            // 400 is a bad request
            return res
                .status(400)
                .json({ errors: errors.array() });
        }

    // Assigns request body to user schema fields
    const { userName, password } = req.body;

    try{
        // See if User already exists
        let user = await User.findOne({ userName });
        if(user == null){
            return res
                .status(400)
                .json({ errors: [ {msg: 'Invalid Credentials' }] });
        }

        // Checks if the plaintext password matches the hashed pass form db
        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch) {
            return res
                .status(400)
                .json({ errors: [ { msg: 'Invalid Credentials' }] });
        }


        const payload = {
            user: {
                // Primary key id generated by Mongo
                id: user.id
            }
        }

        // expiresIn 4 hour 
        jwt.sign(payload, process.env.SECRET, 
        { expiresIn: 14400},
        (err, token) => {
            if(err) throw err;
            res.json({ token });
        });
    } catch(err) {
        console.error(err.message);
        res.status(500).json({ msg:'Server error'});
    }
    
    
    
});
module.exports = router;