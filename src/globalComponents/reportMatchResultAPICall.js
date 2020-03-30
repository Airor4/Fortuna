//@flow strict

import getLoginToken from './getLoginToken.js';

//gets the user when passed a token stored as the login token
function reportMatchResultAPICall(winner: 0|1|2, matchId: string) {
	const token=getLoginToken();
	const responsePromise: Promise<Response> = fetch('/api/battle/reportResults', {
		method: 'PATCH',
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Type': 'application/json',
			'Access-Control-Allow-Credentials': 'true',
			'x-auth-token': token
		},
		body: JSON.stringify({
			winner: winner,
			battleId: matchId,
		})
	});
	responsePromise.then (
		response => response.json().then(data => {
			if (response.status !== 200) {
				console.log(response.status);
				console.log(data.msg);
			}
			else {
				console.log('successfully logged result of match.');
			}
		})
	);
}


export default reportMatchResultAPICall;

