//@flow strict

type BlockClass = 
	'AndBlock' |
	'CallFunctionBlock' |
	'ClickProcessedReceipt' |
	'ContainerBlock' |
	'DoubleAbsBlock' |
	'DoubleAddBlock' |
	'DoubleDivideBlock' |
	'DoubleEqualsBlock' |
	'DoubleGreaterThanBlock' |
	'DoubleGreaterThanOrEqualBlock' |
	'DoubleLessThanBlock' |
	'DoubleLessThanOrEqualBlock' |
	'DoubleMaxBlock' |
	'DoubleMinBlock' |
	'DoubleMultiplyBlock' |
	'DoubleRoundBlock' |
	'DoubleSubtractBlock' |
	'DoubleTruncateBlock' |
	'DefineFunctionBlock' |
	'EmptyBlock' |
	'ForBlock' |
	'GetListAtBlock' |
	'GetVariableBlock' |
	'IfBlock' |
	'IfElseBlock' |
	'IntAbsBlock' |
	'IntAddBlock' |
	'IntDivideBlock' |
	'IntEqualsBlock' |
	'IntGreaterThanBlock' |
	'IntGreaterThanOrEqualBlock' |
	'IntLessThanBlock' |
	'IntLessThanOrEqualBlock' |
	'IntMaxBlock' |
	'IntMinBlock' |
	'IntModuloBlock' |
	'IntMultiplyBlock' |
	'IntSubtractBlock' |
	'IntToDoubleBlock' |
	'ListAppendBlock' |
	'ListSizeBlock' |
	'MathAcosBlock' |
	'MathAsinBlock' |
	'MathAtanBlock' |
	'MathAtan2Block' |
	'MathCosBlock' |
	'MathPowBlock' |
	'MathSinBlock' |
	'MathSqrtBlock' |
	'MathTanBlock' |
	'NotBlock' |
	'OrBlock' |
	'PrintBlock' |
	'SetListAtBlock' |
	'SetVariableBlock' |
	'WhileBlock' |
	'XorBlock';

export type {BlockClass};
