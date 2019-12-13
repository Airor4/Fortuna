//@flow strict

import BoundingBox from './BoundingBox.js';
import typeof Vec from './Vec.js';
import {HIGHLIGHT_STROKE_WIDTH} from './generateCornerPerim.js';

//Casus Block is the parent class that defines
//methods that will be called on blocks by the casus editor
//
//The following methods must be implemented:
//	precompBounds() - calls precompBounds on all child blocks of this,
//		then calculates this block's bounds
//
//	precompXY(x, y) - sets the x and y coordintates of this block now that
//		its bounds are known, and sets the absolute coordinates of all child blocks
//
//	getChildBlocks() - returns all child blocks of this block
//
//	drawSelf(CanvasRenderingContext2D) - renders this block. All children of this
//		block will then be rendered on top of this
//
class CasusBlock {
	boundingBox:BoundingBox;
	highlighted: boolean;

	constructor() {
		this.boundingBox = new BoundingBox(0, 0, 0, 0);
		this.highlighted = true;
	}

	renderDFS(ctx: CanvasRenderingContext2D): void {
		this.drawSelf(ctx);
		for (const child of this.getChildBlocks()) {
			child.renderDFS(ctx);
		}
		if (this.highlighted) {
			const perim=this.getPerim();

			ctx.beginPath();
			ctx.strokeStyle = '#eeeeee';
			ctx.lineWidth = HIGHLIGHT_STROKE_WIDTH;
			ctx.moveTo(perim[0].x, perim[0].y);
			for (const p: Vec of perim) {
				ctx.lineTo(p.x, p.y);
			}
			ctx.closePath();
			ctx.stroke();
		}
	}

	unhighlightEverything(): void {
		this.highlighted=false;
		for (const child of this.getChildBlocks()) {
			child.unhighlightEverything();
		}
	}

	// ----------------------- Methods to overload --------------------------
	precompBounds(): void {
		this.boundingBox=new BoundingBox(0, 0, 0, 0);
	}

	precompXY(x: number, y:number): void {
		this.boundingBox=new BoundingBox(x, y, this.boundingBox.w, this.boundingBox.h);
	}

	getChildBlocks(): Array<CasusBlock> {
		return [];
	}

	drawSelf(ctx: CanvasRenderingContext2D): void {
	}

	getPerim(): Array<Vec> {
		console.log("Error! A casus block did not extend getPerim()!");
		return [this.boundingBox.x, this.boundingBox.y];
	}


}

export default CasusBlock;

