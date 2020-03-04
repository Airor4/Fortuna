//@flow strict

import TankPart from './TankPart.js';
import {getImage} from '../battleground/ImageLoader.js';
import ImageDrawer from '../battleground/ImageDrawer.js';
import Vec from '../casus/blocks/Vec.js';

class Treads extends TankPart {

	drawSelf(drawer: ImageDrawer, parentPos: Vec, parentRotation: number) {
		drawer.draw(getImage('GRAY_TREAD_1'), parentPos, 10, parentRotation);
	}

}

export default Treads;
