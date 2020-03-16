//@flow strict

import Vec from '../casus/blocks/Vec.js';
import ImageDrawer from './ImageDrawer.js';
import {getImage} from './ImageLoader.js';
import Seg from '../geometry/Seg.js';

const WALL_LENGTH=17;
const WALL_WIDTH=3;
class Wall {
	position: Vec;
	angle: number;


	constructor(position: Vec, angle: number) {
		this.position = position;
		this.angle = angle;
	}
	
	drawSelf(drawer: ImageDrawer): void {
		drawer.draw(getImage('WALL'), this.position, 45, this.angle-Math.PI/2);
		drawer.drawSeg(this.getCollisionWall());
	}

	getCollisionWall(): Seg {
		const delta=new Vec(WALL_LENGTH, 0).rotate(this.angle);
		return new Seg(this.position.sub(delta), this.position.add(delta), WALL_WIDTH);
	}
}

export default Wall;
