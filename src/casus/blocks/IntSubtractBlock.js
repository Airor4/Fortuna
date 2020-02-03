//@flow strict

import BinaryOperationBlock from './BinaryOperationBlock.js';
import IntValue from '../interpriter/IntValue.js';
import {verifyInt} from '../interpriter/Value.js';

class IntSubtractBlock extends BinaryOperationBlock {

	constructor() {
		super('INT', 'INT', '-');
	}

	evaluate(): IntValue {
		const lRes=verifyInt(this.lChild.evaluate());
		const rRes=verifyInt(this.rChild.evaluate());
		return lRes.sub(rRes);
	}

}

export default IntSubtractBlock;
