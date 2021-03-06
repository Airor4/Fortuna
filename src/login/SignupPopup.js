//@flow strict
import * as React from 'react';
import Popup from 'reactjs-popup';
import getErrorFromObject from '../globalComponents/getErrorFromObject.js';
import { ToastContainer , toast } from 'react-toastify';

type Props = {|
	onEmailRegisteredCallback: (string, string) => void
|}; 

type State = {|
	userName: string,
	email: string,
	password: string,
	confirmPassword: string,
	email: string,
	signupDialogOpen: boolean
|};


// Signup Popup component. Display Signup Form.
class SignupPopup extends React.Component<Props, State> {

	constructor() {
		super();

		this.state = {
			userName: '',
			email: '',
			password: '',
			confirmPassword: '',
			signupDialogOpen: false
		}
	}

	handleSignUpClick(): void {
		if (this.state.password !== this.state.confirmPassword) {
			toast.error('Passwords do not match!');
			return;
		}
		const responsePromise: Promise<Response> = fetch('/api/user/registerUser', {
			method: 'POST',
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
				'Access-Control-Allow-Credentials': 'true'
			},
			body: JSON.stringify({ 
				userName: this.state.userName, 
				email: this.state.email, 
				password:this.state.password }),
		});
		responsePromise.then(
			response => response.json().then(data => {
				if (response.status !== 201) {
					console.log(response.status);
					console.log(data);
					toast.error(getErrorFromObject(data));
				}
				else {
					console.log(data);
					this.props.onEmailRegisteredCallback(this.state.userName, this.state.password);
					this.setState({signupDialogOpen: false});
				}
			})
		).catch(
			(error) => {
				toast.error('Couldnt connect to server!');
				console.log(error);
			}
		);
	};

	handleCancelClick(): void {
		this.setState({signupDialogOpen: false});
	}

	render(): React.Node {
		return (
			<div>
				<button type="button" className="clearbtn" onClick={() => this.setState({signupDialogOpen: true})}>
					Signup
				</button>
				<Popup 
					open={this.state.signupDialogOpen}
					onClose={() => this.handleCancelClick()}
				>
					<div className="popup">
						<h3>Signup</h3>
						<div className="row col-md-12">
							<label>Email</label>
							<div className="input-group">
								<input 
									type="text" 
									className="inputText" 
									onChange={e => this.setState({ email: e.target.value})}
								/>
							</div>
						</div>
						<div className="row col-md-12">
							<label>Username</label>
							<div className="input-group">
								<input 
									type="text" 
									className="inputText" 
									onChange={e => this.setState({ userName: e.target.value})} 
								/>
							</div>
						</div>
						<div className="row col-md-12">
							<label>Password</label>
							<div className="input-group">
								<input 
									type="password" 
									className="inputText" 
									onChange={e => this.setState({ password: e.target.value})}
								/>
							</div>
						</div>
						<div className="row col-md-12">
							<label>Confirm Password</label>
							<div className="input-group">
								<input 
									type="password" 
									className="inputText"
									onChange={e => this.setState({confirmPassword: e.target.value})}
								/>
							</div>
						</div>
						<br/>
						<div className="row col-md-12">
							<button className="popupbtn" onClick={() => this.handleSignUpClick()}>
								Signup
							</button>
							<button className="cancelbtn" onClick={() => this.handleCancelClick()}>
								Cancel
							</button>
						</div>
					</div>
				</Popup>
				<ToastContainer />
			</div>
		);
	}
}

export default SignupPopup;
