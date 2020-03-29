// @flow strict

// Flow type import
import type { Request, Response } from 'express';

const User = require('../../models/userModel');
const Tank = require('../../models/tankModel');

const { validationResult } = require('express-validator');


exports.getFavorite = async (req: Request, res: Response) => {
	try {
		// Find user using auth token and select their favorite tank field
		const myUser = await User.findById(req.user.id, 'favoriteTank');
		
		if (myUser == null) {
			console.log('User not found in DB');
			return res
				.status(404)
				.json({ msg: 'User not found in DB'});
		}

		const favoritedTank = await Tank.findById(myUser.favoriteTank);
		
		if (favoritedTank == null) {
			console.log('Tank not found in DB');
			return res
				.status(404)
				.json({ msg: 'Tank not found in DB'});
		}

		console.log('favoriteTank successfully retrieved');
		return res
			.status(200)
			.send(favoritedTank);
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ msg: 'Could not get favorite'});
	}
	
}

exports.favoriteTank = async (req: Request, res: Response) => {
	// the 'new' option means return the document after it has been updated
	await User.findOneAndUpdate( { _id: req.user.id }, {favoriteTank : req.body.favoriteTank }, {new :true}, (err: Error, foundUser: User) => {
		if (err) {
			console.error(err.message);

			return res
				.status(500)
				.json({ msg: 'Could not update user favoriteTank'});
		} 
		else {
			console.log('Tank favorited!');
			return res
				.status(200)
				.send(foundUser.favoriteTank);
		}
	});
}

exports.userTanks = async (req: Request, res: Response) => {
	await Tank.find({ userId: req.user.id }, (err: Error, tanks: Array<Tank>) => {
		if (err) {
			console.error(err.message)

			return res
				.status(404)
				.json({ msg: 'tank not found in DB'});
		} 
		else {
			console.log("Successfully found tanks for user");

			return res
				.status(200)
				.send(tanks);
		}
	});
}

exports.assignTank = async (req: Request, res: Response) => {
	// Check if all the fields are input correctly from the frontend
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		console.log('bad request');

		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	// Setup the new tank.
	const tank = new Tank();
	tank.userId = req.body.userId;
	tank.tankName = req.body.tankName;
	tank.components = req.body.components;

	// Get user to update inventory
	let user = await User.findById(tank.userId);
	if (!user) {
		console.error('Tank User not in DB');
		return res
			.status(400)
			.json({ msg: 'Tank user not found in DB' })
	}

	// Use up components
	for (const compsOut of tank.components) {
		if (compsOut === 'empty') {
			continue;
		}

		if (user.inventory.tankComponents[compsOut] === 0) {
			console.error(`Not enough ${compsOut} components to use.`);
			return res
				.status(400)
				.json({ msg: `Not enough ${compsOut} components to use.` });
		}
		user.inventory.tankComponents[compsOut] -= 1;
	}

	// Update user
	await user.save((err: Error) => {
		if (err) {
			console.error('Failed to save user inventory.');
			return res
				.status(500)
				.json({ msg: 'Failed to save user inventory.' });
		} 
		else {
			console.log('User inventory saved successfully!');
		}
	});

	// Save new tank
	await tank.save((err: Error) => {
        if (err) {
			console.error(err.message);

            return res
                .status(500)
                .json({ msg: 'Unable to save tank to DB.' });
		} 
		else {
			console.log('Tank successfully saved to DB');
			return res
				.status(200)
				.send(tank);
        }
    });
}

exports.tankUpdate = async (req: Request, res: Response) => {
	// Check if all the fields are input correctly from the frontend
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		console.log('bad request');

		return res
			.status(400)
			.json({ errors: errors.array() });
	}
	// Parse body
	const { tankName, userId, components, isBot } = req.body;

	// Get tank from DB to get past components state
	let tank = await Tank.findById(req.params.tankId, function (err: Error) {
		if (err){
			console.error(err.message);
			return res
				.status(500)
				.json({ msg: 'Failed to attempt to find a tank'})
		}
	});
	if (!tank) {
		console.error('Tank does not exist in DB');
		res.status(400).json({ msg: 'Tank does not exist in DB' });
	}

	// Get user to update inventory
	let user = await User.findById(userId);
	if (!user) {
		console.error('Tank User not in DB');
		return res
			.status(400)
			.json({ msg: 'Tank user not found in DB' })
	}

	// Replenish components
	for (const compsIn of tank.components) {
		if (compsIn === 'empty') {
			continue;
		}
		user.inventory.tankComponents[compsIn] += 1;
	}

	// Use up components
	for (const compsOut of req.body.components) {
		if (compsOut === 'empty') {
			continue;
		}

		if (user.inventory.tankComponents[compsOut] === 0) {
			console.error(`Not enough ${compsOut} components to use.`);
			return res
				.status(400)
				.json({ msg: `Not enough ${compsOut} components to use.` });
		}
		user.inventory.tankComponents[compsOut] -= 1;
	}

	// Update user
	await user.save((err: Error) => {
		if (err) {
			console.error('Failed to save user inventory.');
			return res
				.status(500)
				.json({ msg: 'Failed to save user inventory.' });
		} 
		else {
			console.log('User inventory saved successfully!');
		}
	});

	// Update all fields of the tank except casus code
	tank.tankName = tankName;
	tank.userId = userId;
	tank.components = components;
	tank.isBot = isBot;
	tank.save((err: Error) => {
		if (err) {
			console.error(err.message);
			res.send(err);
		}
	});
	res.status(200).send(tank);
	console.log('Successfully updated tank.');
}

exports.casusUpdate = async (req: Request, res: Response) => {

	//check if all the fields are input correctly from the frontend
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// 400 is a bad request
		console.log('Bad request');

		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	await Tank.findByIdAndUpdate(req.params.tankId, { casusCode: req.body.casusCode }, {new: true}, (err: Error, tank: Tank) => {
		if (err) {
			console.error(err.message);

			return res
				.status(404)
				.json({ msg: 'Could not update casusCode'})
		}
		else {
			console.log('casusCode successfully updated!');

			return res
				.status(200)
				.send(tank);
		}
	});
}

exports.deleteTank = async (req: Request, res: Response) => {
	//check if all the fields are input correctly from the frontend
	const errors = validationResult(req);

	if(!errors.isEmpty()){
		// 400 is a bad request
		return res
			.status(400)
			.json({ errors: errors.array() });
	}

	// Deconstruct request
	const { tankId } = req.params;

	const tank = await Tank.findById(tankId);
	if (!tank) {
		console.error('Tank not in DB');
		return res.status(400).json({ msg: 'Could not find tank in DB' });
	}

	// Add components back to user inventory
	let user = await User.findById({ _id: tank.userId });
	if (!user) {
		console.error('User for tank not found');
		return res.status(500).json({ msg: 'Owner of tank not found' });
	}

	for (const component of tank.components) {
		if (component === 'empty') {
			continue;
		}
		user.inventory.tankComponents[component] += 1;
	}

	// Save the user
	await user.save((err: Error) => {
		if (err) {
			console.error('Could not update user inventory.');
			return res.status(500).json('Could not update user inventory.');
		}
	});

	// Delete tank
	await Tank.deleteOne({ _id: tank._id }, (err: Error) => {
		if (err) {
			console.error(err.message);
			return res.status(500).json({ msg: 'Could not delete tank from DB' });
		}
	});
	
	return res.status(200).json({ msg: 'Successfully deleted Tank' });
}
