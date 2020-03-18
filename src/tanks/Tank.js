//@flow strict

import Vec from '../casus/blocks/Vec.js';
import TankPart from './TankPart.js'
import Gun from './Gun.js';
import ImageDrawer from '../battleground/ImageDrawer.js';
import InterpriterState from '../casus/interpreter/InterpriterState.js';
import {getInterpriterState, setInterpriterState} from '../casus/interpreter/InterpriterState.js';
import CasusBlock from '../casus/blocks/CasusBlock.js';
import {verifyDouble, verifyBoolean} from '../casus/interpreter/Value.js';
import Seg from '../geometry/Seg.js';
import Scanner from './Scanner.js';
import Jammer from './Jammer.js';
import Circle from '../geometry/Circle.js';
import BooleanValue from '../casus/interpreter/BooleanValue.js';
import IntValue from '../casus/interpreter/IntValue.js';
import DoubleValue from '../casus/interpreter/DoubleValue.js';
import DoubleListValue from '../casus/interpreter/DoubleListValue.js';
import GameObject from '../battleground/GameObject.js';
import Battleground from '../battleground/Battleground.js';
import C4 from '../battleground/gameobjects/C4.js';
import Mine from '../battleground/gameobjects/Mine.js';

import {
	RAN_INTO_WALL_VAR_NAME,
	USE_MINE_VAR_NAME,
	USE_C4_VAR_NAME,

	FORWARD_MOVEMENT_VAR_NAME,
	TARGET_DIRECTION_VAR_NAME,
	TURRET_DIRECTION_VAR_NAME,
	TANK_X_VAR_NAME,
	TANK_Y_VAR_NAME,

	ENEMY_TANK_XS_VAR_NAME,
	ENEMY_TANK_YS_VAR_NAME,
	EXPLOSIVE_XS_VAR_NAME,
	EXPLOSIVE_YS_VAR_NAME,
	WALL_XS_VAR_NAME,
	WALL_YS_VAR_NAME,
} from '../casus/userInteraction/CasusSpecialVariables.js';

class Tank extends GameObject {
	//game state
	position: Vec;
	rotation: number;
	haveC4: boolean;
	c4ToBlowUp: ?C4;
	minesLeft: number;
	usedMineLastFrame: boolean;

	// parts: 
	chassis: TankPart;
	treads: TankPart;
	mainGun: Gun;
	scanner: ?Scanner;
	jammer: ?Jammer;
	parts: Array<?TankPart>;

	// Casus:
	interpriterState: InterpriterState;
	casusCode: CasusBlock;

	constructor(
		position: Vec, 
		chassis: TankPart, 
		treads: TankPart, 
		mainGun: Gun, 
		scanner: ?Scanner, 
		jammer: ?Jammer,
		casusCode: CasusBlock
	) {
		super();
		this.position = position;

		this.chassis = chassis;
		this.treads = treads;
		this.mainGun = mainGun;
		this.scanner = scanner;
		this.jammer = jammer;
		this.parts = [chassis, treads, mainGun, scanner, jammer];

		this.interpriterState = new InterpriterState();
		this.casusCode = casusCode;
		this.rotation = Math.PI*0.8;
		this.haveC4 = true; //TODO: remove this, it is just for testing...
		this.minesLeft = 2; //TODO: remove this, for testing...
		this.usedMineLastFrame = false;
	}

	update(battleground: Battleground): void {
		this.executeCasusFrame();	
		this.executePhysics(battleground.getCollisionSegs(), battleground.getTanks(), battleground);
	}

	executeCasusFrame(): void {
		setInterpriterState(this.interpriterState);	
		this.casusCode.evaluate();
		this.interpriterState = getInterpriterState();
	}
	
	executePhysics(walls: Array<Seg>, tanks: Array<Tank>, battleground: Battleground): void {

		//movement stuff
		const otherTanks = tanks.filter(otherTank => otherTank !== this);
		const forwardMovementUnclamped = this._getDouble(FORWARD_MOVEMENT_VAR_NAME);
		let forwardMovement = Math.max(-1, Math.min(1, forwardMovementUnclamped));
		const targetDirection = this._getDouble(TARGET_DIRECTION_VAR_NAME);

		const unit=new Vec(1, 0);
		const targetVec=unit.rotate(targetDirection);
		const facingVec=unit.rotate(this.rotation);

		let dAngle=Math.asin(facingVec.cross(targetVec));
		if (targetVec.dot(facingVec)<0) {
			if (dAngle<0) {
				dAngle = -Math.PI - dAngle;
			}
			else {
				dAngle = Math.PI + dAngle;
			}
		}
		const totalMovement=Math.abs(forwardMovement)+2*Math.abs(dAngle);
		forwardMovement/=Math.max(1, totalMovement)*1;
		dAngle/=Math.max(1, totalMovement)*2;

		this.rotation+=dAngle;
		const oldPosition=this.position;
		this.position=this.position.add(unit.rotate(this.rotation).scale(0.7*forwardMovement));
		let ranIntoWall=false;
		if (this.intersectingTankOrWall(walls, otherTanks)) {
			this.position=oldPosition;
			ranIntoWall=true;
		}

		this._setBoolean(RAN_INTO_WALL_VAR_NAME, ranIntoWall);
		this._setDouble(TANK_X_VAR_NAME, this.position.x);
		this._setDouble(TANK_Y_VAR_NAME, this.position.y);
		//end of movement stuff
		
		//gun stuff
		const turretDirection = this._getDouble(TURRET_DIRECTION_VAR_NAME);
		this.mainGun.setTargetGunAngle(turretDirection);
		this.mainGun.onUpdate();
		//end of gun stuff
		
		//placing items stuff
		const shouldPlaceC4 = this._getBoolean(USE_C4_VAR_NAME);
		if (shouldPlaceC4) {
			if (this.haveC4) {
				this.haveC4=false;	
				this.c4ToBlowUp=new C4(this.position);
				battleground.createGameObject(this.c4ToBlowUp);
			}
		}
		else {
			if (this.c4ToBlowUp != null) {
				this.c4ToBlowUp.explode(battleground);
				this.c4ToBlowUp=null;
			}
		}

		const placeMineThisFrame = this._getBoolean(USE_MINE_VAR_NAME);
		if (placeMineThisFrame && !this.usedMineLastFrame && this.minesLeft > 0) {
			this.minesLeft--;
			battleground.createGameObject(new Mine(this.position));
		}
		this.usedMineLastFrame = placeMineThisFrame;
		//end of placing items stuff
		
		//update tank parts if I need to
		for (const part: ?TankPart of this.parts) {
			if (part != null) {
				part.update(this.interpriterState, battleground, this.position, this.rotation, this);
			}
		}
		//end of updating tank parts
		
		//set generic casus lists
		const wallXs=[];
		const wallYs=[];
		for (const wall: Seg of walls) {
			wallXs.push(wall.from.x);
			wallYs.push(wall.from.y);
			wallXs.push(wall.to.x);
			wallYs.push(wall.to.y);
		}
		this._setDoubleArray(WALL_XS_VAR_NAME, wallXs);
		this._setDoubleArray(WALL_YS_VAR_NAME, wallYs);

		const otherTankXs=battleground.getTanks().filter(tank => tank !== this).map(tank => tank.getPosition().x);
		const otherTankYs=battleground.getTanks().filter(tank => tank !== this).map(tank => tank.getPosition().y);
		this._setDoubleArray(ENEMY_TANK_XS_VAR_NAME, otherTankXs);
		this._setDoubleArray(ENEMY_TANK_YS_VAR_NAME, otherTankYs);
		//end of set generic casus lists
	}

	intersectingTankOrWall(walls: Array<Seg>, tanks: Array<Tank>): boolean {
		const me=this.getBoundingCircle();
		for (const wall: Seg of walls) {
			const myCircle=new Circle(me.c, me.r+wall.paddingWidth);
			if (myCircle.intersectsSeg(wall)) {
				return true;
			}
		}
		for (const otherTank: Tank of tanks) {
			if (me.intersectsCircle(otherTank.getBoundingCircle())) {
				return true;
			}
		}
		return false;
	}

	getBoundingCircle(): Circle {
		return new Circle(this.position, 4);
	}

	render(drawer: ImageDrawer): void {
		this.treads.drawSelf(drawer, this.position, this.rotation);
		this.chassis.drawSelf(drawer, this.position, this.rotation);
		if (this.scanner!=null) {
			this.scanner.drawSelf(drawer, this.position, this.rotation);
		}
		if (this.jammer!=null) {
			this.jammer.drawSelf(drawer, this.position, this.rotation);
		}
		this.mainGun.drawSelf(drawer, this.position, this.rotation);
	}

	_setDouble(name: string, to: number): void {
		this.interpriterState.setVariable('DOUBLE', name, new DoubleValue(to));
	}

	_setBoolean(name: string, to: boolean): void {
		this.interpriterState.setVariable('BOOLEAN', name, new BooleanValue(to));
	}

	_setDoubleArray(name: string, to: Array<number>): void {
		const list=new DoubleListValue();
		for (let i=0; i<to.length; i++) {
			list.setAt(newIntValue(i), new DoubleValue(to[i]));
		}
		this.interpriterState.setVariable('DOUBLE_LIST', name, list);
	}

	_getDouble(name: string): number {
		return verifyDouble(this.interpriterState.getVariable('DOUBLE', name)).val;
	}

	_getBoolean(name: string): boolean {
		return verifyBoolean(this.interpriterState.getVariable('BOOLEAN', name)).val;
	}

	_getEnemyTanks(battleground: Battleground): Array<Tank> {
		if (this.scanner == null) {
			return [];
		}
		else {
			return this.scanner.getEnemyTanks(this.interpriterState, battleground, this.position, this.rotation, this);
		}
	}

	getJammed(): void {
		if (this.scanner != null) {
			this.scanner.getJammed();
		}
	}

	getPosition(): Vec {
		return this.position;
	}
}

export default Tank;
