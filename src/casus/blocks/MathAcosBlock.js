//@flow strict

import UnaryOperationBlock from './UnaryOperationBlock.js';
import DoubleValue from '../interpriter/DoubleValue.js';
import {verifyDouble} from '../interpriter/Value.js';

class MathAcosBlock extends UnaryOperationBlock {

	constructor() {
		super('DOUBLE', 'DOUBLE', 'arccos');
	}

	evaluate(): DoubleValue {
		const res=verifyDouble(this.rChild.evaluate());
		return res.arccos();
	}

}

export default MathAcosBlock;
