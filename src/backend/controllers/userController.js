// @flow strict

// Required imports
import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
// Throws an error if this isn't here because of async functions
require("regenerator-runtime");

// Model imports
const User = require('../../models/userModel');
const Token = require('../../models/tokenModel');
const Tank = require('../../models/tankModel');
const MarketSale = require('../../models/marketSaleModel');

// JWT Secret
const jwtSecret = process.env.JWT_SECRET;
// Front-End Host Constant
const FRONTEND = (process.env.NODE_ENV === 'development') ? 'localhost:3000' : 'fortunacombat.com';
const MASTER_ID = process.env.MASTER_SELLER;

exports.register = async (req: Request, res: Response) => {
	// Creates a place where errors that fail validation can accrue.
	const errors = validationResult(req);

	if(!errors.isEmpty()) {
		// 400 is a bad request
		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	// Deconstructs request body to assign to user schema fields
	const { userName, email, password } = req.body;

	// Attempts to add User to the database
	try {
		// See if a user already exists with that username.
		let user = await User.findOne({ userName });
		if(user != null) {
			return res
				.status(400)
				.json({ msg: 'A user with that username already exists' });
		}

		// See if a user already exists with that email
		user = await User.findOne({ email });
		if(user != null) {
			return res
				.status(400)
				.json({ msg: 'A user with that email already exists' });
		}

		// Instantiate a new user
		user = new User({
			userName,
			email,
			password
		});

		// Creates salt with 10 rounds(recommended)
		const salt = await bcrypt.genSalt(10);

		// bcrypt hash passwords
		user.password = await bcrypt.hash(password, salt);

		// Save User to MongoDB
		const done = await user.save();
		if (!done) {
			console.error('Could not save user.');
			return res
				.status(500)
				.json({ msg: 'Could not save the user to the DB.' });
		}		

		// Create initial tank for user
		let tank = new Tank();
		tank.userId = user.id;
		tank.tankName = `${userName}'s Starter Tank`;
		tank.components = ['moddable', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'fastTreads', 'empty', 'empty', 'empty'];
		tank.casusCode = { 
			boundingBox: { x: 0, y: 0, w: 64, h: 23 }, 
			highlighted: false, 
			blockClass: "ContainerBlock", 
			children: [{ 
				boundingBox: { x: 0, y: 0, w: 64, h: 23 }, 
				highlighted: true, 
				blockClass: "EmptyBlock", 
				dataType: "VOID" }] 
			};

		await tank.save((err: Error) => {
			if (err) {
				console.error(err.message);
				return res
					.status(500)
					.json({ msg: 'Could not save user\'s initial tank.' });
			}
		});

		// Create a verification token for this user
		let token = new Token({
			_userId: user.id,
			token: crypto.randomBytes(16).toString('hex')
		});

		// Save verification token to MongoDB
		await token.save((err: Error) => {
			if (err) {
				console.error(err.message);
				return res
					.status(500)
					.json({ msg: 'Could not save the token to the DB' });
			}
		});

		// Create nodemailer transport
		const transporter = nodemailer.createTransport({
			host: process.env.MAIL_SERVER,
			port: 465,
			secure: true,
			auth: {
				user: process.env.MAIL_USER,
				pass: process.env.MAIL_PASS
			}
		});

		const textBody =
		'Greetings Commander '+user.userName+'!\n\n' +
		'Please verify your Fortuna account by copying and pasting the link below into your browser:\n\n' +
		'http://'+FRONTEND+'/ConfirmEmail/'+token.token+'/'+user.email;

		const htmlBody = `<h2>Greetings Commander ${user.userName}!</h2>
		<p>Please verify your Fortuna account by using the link below:</p>
		<a href="http://${FRONTEND}/ConfirmEmail/${token.token}/${user.email}">Verify your Fortuna account</a>`;

		// Set email options
		const mailOptions = {
			from: 'Fortuna Project <no-reply@fortunaproject.com>',
			to: user.email,
			subject: 'Fortuna Account Confirmation Token',
			text: textBody,
			html: htmlBody
		};

		// Send confirmation email with token
		await transporter.sendMail(mailOptions, (err: Error) => {
			if (err) {
				console.log(err.message);
				return res
					.status(500)
					.json({ msg: 'Could not send out email.' });
			}
		});
		return res.status(201).json({ msg: 'A verification email has been sent to ' + user.email + '.' });

	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ msg: 'Server Error' });
	}
}

exports.login = async (req: Request, res: Response) => {

	// Creates a place where errors that fail validation can accrue.
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	// Deconstructs request body to use individual input
	const { userName, password } = req.body;

	try{
		// See if User exists - might change this to const
		const user = await User.findOne({ userName: userName });
		if(user == null){
			return res
				.status(401)
				.json({ msg: 'The user name ' + userName + 
					' is not associated with any account. Double-check your user name and try again.' });
		}

		// Checks if the plaintext password matches the hashed pass form db
		const isMatch = await bcrypt.compare(password, user.password);

		// If the credentials don't match it will return a boolean false
		if (!isMatch) {
			return res
				.status(401)
				.json({ msg: 'Invalid Password. Please try again.' });
		}

		// Checks if the user's email has been verified
		if (!user.isVerified) {
			return res
				.status(401)
				.json({ type: 'email-not-verified', msg: 'Your account has not been verified. ' + 
					'Check your email for your verification token. ' +
					'If your token has expired, request a new one.' });
		}

		// Login successful. Proceed with JWT Creation
		const payload = {
			user: {
				// Primary key id generated by MongoDB
				id: user.id
			}
		}

		// JWT expires in 4 hours
		jwt.sign(payload, jwtSecret, { expiresIn: 14400 }, (err: Error, token: jwt) => {
			if (err) {
				console.error(err.message);
				return res.status(500).json({ msg: 'Failed to create or sign JWT' })
			}
			console.log('Login Successful.');
			return res.status(200).json({ token });
		});

	} catch(err) {
		console.error(err.message);
		return res.status(500).json({ msg:'Server error' });
	}
}

exports.confirmToken = async (req: Request, res: Response) => {
	// Creates a place where errors that fail validation can accrue.
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	try {
		// Find a token if it hasn't expired
		// If it expired, it would have been removed from the DB
		const { email, token } = req.body;

		const dbToken = await Token.findOne({ token: token });
		if (!dbToken) {
			return res
				.status(400)
				.json({ type: 'not-verified',
					msg: 'The token you are using is not a valid token. ' +
					'Check your confirmation email and try again. ' + 
					'Otherwise, your token may have expired.' })
		}

		// If token was found, find the user associated with it
		let user = await User.findOne({ _id: dbToken._userId, email: email });
		if (!user) {
			return res
				.status(400)
				.json({ msg: 'We were unable to find a user for this token. ' +
					'Check your email address and try again.' })
		}

		// If user is already verified, what the heck are you doing here?
		if (user.isVerified) {
			return res
				.status(400)
				.json({ type: 'already-verified', 
					msg: 'This user has already been verified.' })
		}

		// Assuming you got past all that nonsense, the user is now made to be verified
		user.isVerified = true;
		await user.save((err: Error) => {
			if (err) {
				console.error(err.message);
				return res
					.status(500)
					.json({ msg: 'Unable to update user in DB.' })
			}
		});

		// The verification token is also deleted
		await Token.deleteOne({ token: token }, (err: Error) => {
			if (err) {
				console.error(err.message);
				return res
					.status(500)
					.json({ msg: 'Unable to delete token from DB.' });
			}
		});

		// Return success message
		return res.status(200).json({ msg: 'The account has been verified. Please log in.' });

	} catch (err) {
		console.error(err.message);
		return res.status(500).json({msg: 'Server Error'});       
	}
}

exports.resendConfirm = async (req: Request, res: Response) => {
	// Creates a place where errors that fail validation can accrue.
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	try {
		// Deconstruct body
		const { email } = req.body;

		// Find a user with this email.
		const user = await User.findOne({ email: email });
		if (!user) {
			return res
				.status(400)
				.json({ msg: 'Unable to find a user with that email.' })
		}

		// If found, check if they are already verified.
		if (user.isVerified) {
			return res
				.status(400)
				.json({ msg: 'This account has been verified. Please log in.' })
		}

		// If user isn't verified, make a new token, save it, and send email.
		let token = new Token({
			_userId: user.id,
			token: crypto.randomBytes(16).toString('hex')
		});

		// Save verification token to MongoDB
		await token.save((err: Error) => {
			if (err) {
				console.error(err.message);
				return res
					.status(500)
					.json({ msg: 'Could not save the token to DB' })
			}
		});

		// Create nodemailer transport
		const transporter = nodemailer.createTransport({
			host: process.env.MAIL_SERVER,
			port: 465,
			secure: true,
			auth: {
				user: process.env.MAIL_USER,
				pass: process.env.MAIL_PASS
			}
		});

		const textBody =
		'Greetings Commander '+user.userName+'!\n\n' +
		'We recieved word that you needed to reconfirm your email.\n' +
		'Please verify your Fortuna account by copying and pasting the link below into your browser:\n\n' +
		'http://'+FRONTEND+'/ConfirmEmail/'+token.token+'/'+user.email;

		const htmlBody = `<h2>Greetings Commander ${user.userName}!</h2>
		<p>We recieved word that you needed to reconfirm your email.<br />
		Please verify your Fortuna account by using the link below:</p>
		<a href="http://${FRONTEND}/ConfirmEmail/${token.token}/${user.email}">Verify your Fortuna account</a>`;		

		// Set email options
		const mailOptions = {
			from: 'Fortuna Project <no-reply@fortunaproject.com>',
			to: user.email,
			subject: 'Fortuna Account Reconfirmation Token',
			text: textBody,
			html: htmlBody
		};

		// Send confirmation email with token
		await transporter.sendMail(mailOptions, (err: Error) => {
			if (err) {
				console.log(err.message);
				return res
					.status(500)
					.json({ msg: 'Could not send out email.' });
			}
		});
		return res.status(200).json({ msg: 'A verification email has been sent to ' + user.email + '.' });

	} catch(err){
		return res
			.status(500)
			.json({msg: 'Server Error'});
	} 
}

exports.getUser = async (req: Request, res: Response) => {
	try{
		// Find the user using the id and dont return the password field
		const user = await User.findById(req.user.id).select('-password');
		if (!user) {
			console.error('Could not find user in DB');
			return res
				.status(404)
				.json({ msg: 'Cannot find user in DB.' });
		}
		return res
			.status(200)
			.json(user);
	} catch (err) {
		return res
			.status(500)
			.json({msg: 'Unable to retrieve user'});
	}
}

exports.retrieveUser  = async (req: Request, res: Response) => {
	await User.findById(req.params.userId, '-password', function(err: Error, user: User){
		if(err)
		{
			return res
				.status(404)
				.send(err);
		}
		else
			return res
				.status(200)
				.send(user);
	});
}

exports.getLeaders = async (req: Request, res: Response) => {
	// skip and limit determine how many to return
	// the -1 in the sort is for descending order based on elo
	await User.find({ _id: { $ne: MASTER_ID } }, ['userName', 'stats.elo'], { skip: 0, limit: 10, sort:{'stats.elo': -1} }, function(err: Error, leaders: Array<User>){
		if(err){
			res.send(err);
			console.error(err.message);
		}
		else
			res.send(leaders);
			console.log('Retrieved user leaders.');
	});
}

exports.allUsers = async (req: Request, res: Response) => {
	await User.find({}, '-password', function(err: Error, users: Array<User>){
		if(err){
			res.send(err);
			console.error(err.message);
		}
		else
			res.send(users);
			console.log('Retrieved all users.');
	});
}

// Still need to add daily stipend
exports.setWager = async (req: Request, res: Response) => {
	try {
		const user = await User.findById(req.user.id, 'wager money wagerDate');

		// Check if found
		if (user == null){
			console.log('Could not find user in DB');
			return res
				.status(404)
				.json({ msg: 'Could not find user in db'});
		}

		// One day's time. * 1000 because it's in milliseconds
		const aDay = 60 * 60 * 24 * 1000;

		// If a user has never made a wager or its been 24hrs since last stipend give them their stipend and update wagerDate
		if (user.wagerDate == null || (new Date() - user.wagerDate) > aDay) {
			const newBalance = user.money + 100;
			user.money = newBalance;
			user.wagerDate = new Date();
			console.log('Applied daily wager stipend');
		}
		
		// Add back the balance of the original wager
		// Theres gotta be a cleaner way to do this but idk
		const addBack = user.money + user.wager;
		user.money = addBack;

		if (user.money < req.body.wager) {
			console.log('User does not have enough money to set that wager');
			return res
				.status(400)
				.json({ msg: 'User does not have enough money'});
		}

		if (req.body.wager < 50) {
			console.error('User cannot have a wager lower than 50');
			return res
				.status(400)
				.json({ msg: 'User cannot have a wager lower than 50'});			
		}
		else {
			// change wager amount and take that money from their balance
			const take = user.money - req.body.wager;
			user.money = take;

			user.wager = req.body.wager;

			await user.save();

			console.log('Wager successfully updated');
			return res
				.status(200)
				.send(user);
		}
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ msg: 'Failed to update user wager value'});
	}
}

exports.editUser = async (req: Request, res: Response) => {
	// Creates a place where errors that fail validation can accrue.
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	// Check if user is in DB
	const user = await User.findById(req.user.id, 'password, email');
	if (!user) {
		console.error('Could not find user in DB');
		return res.status(400).json({ msg: 'Could not find user to edit' });
	}

	// Deconstruct body
	const { password, email } = req.body;

	// Creates salt with 10 rounds(recommended)
	const salt = await bcrypt.genSalt(10);
	// bcrypt hash passwords
	const newPassword = await bcrypt.hash(password, salt);
	
	// Update User
	const updatedUser = await User.findOneAndUpdate({ _id: req.user.id }, { password: newPassword, email: email }, { new: true });
	if (!updatedUser) {
		console.error('Failed to save user updates');
		return res.status(500).json({ msg: 'Failed to save user changes' });
	}

	// Return updated user
	console.log('Successfully updated user.');
	return res.status(200).send(updatedUser);
}

exports.deleteUser = async (req: Request, res: Response) => {

	// Check if user is in DB
	const user = await User.findById(req.user.id);
	if (!user) {
		console.error('Could not find user in DB');
		return res.status(400).json({ msg: 'Could not find user to delete' });
	}

	// Remove all Market sales owned by user
	await MarketSale.deleteMany({ sellerId: req.user.id });
	console.log('Deleted user market sales.');

	// Remove all Tanks owned by user
	await Tank.deleteMany({ userId: req.user.id });
	console.log('Deleted user tanks.');
	
	// Delete user itself
	await User.deleteOne({ _id: req.user.id });
	
	// Return success message
	console.log('Deleted user.');
	return res.status(200).json({ msg: 'User account has been deleted.' });
}


// FOOT NOTE: this controller uses a try-catch approach to querying as opposed to tankController.js which uses callbacks.
// They in essence serve the same purpose.
