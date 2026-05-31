import React, { useCallback, useEffect, useRef, useState } from "react"
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth"
import firebase from "../firebase/firebase"
import Logo from "../components/Logo/Logo"
import Particles from "react-particles-js"
import Loader from "react-loader-spinner"

const particlesOptions = {
	particles: {
		number: {
			value: 100,
			density: {
				enable: true,
				value_area: 700,
			},
		},
	},
}

const LoginScreen = ({ setIsSigned }) => {
	const [loading, setLoading] = useState(true)
	const [emailMode, setEmailMode] = useState(null)
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [authError, setAuthError] = useState("")
	const [authLoading, setAuthLoading] = useState(false)
	const creatingEmailUser = useRef(false)

	let uiConfig = {
		signInFlow: "popup",
		signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
		callbacks: {
			signInSuccessWithAuthResult: () => false,
		},
	}

	const userRecord = useCallback((user, extra = {}) => ({
		uid: user.uid,
		name: extra.name || user.displayName || "",
		email: (user.email || extra.email || "").toLowerCase(),
		photoURL: user.photoURL || "",
		provider: user.providerData[0] ? user.providerData[0].providerId : "password",
		updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
	}), [])

	const ensureGoogleUser = useCallback(async (user) => {
		const usersRef = firebase.firestore().collection("Users")
		const userDoc = usersRef.doc(user.uid)
		const snapshot = await userDoc.get()
		if (!snapshot.exists) {
			await userDoc.set({
				...userRecord(user),
				createdAt: firebase.firestore.FieldValue.serverTimestamp(),
			})
		} else {
			await userDoc.update(userRecord(user))
		}
	}, [userRecord])

	const handleEmailAuth = async (event) => {
		event.preventDefault()
		setAuthError("")
		setAuthLoading(true)

		try {
			const usersRef = firebase.firestore().collection("Users")

			if (emailMode === "signup") {
				creatingEmailUser.current = true
				const credential = await firebase
					.auth()
					.createUserWithEmailAndPassword(email.trim(), password)
				const user = credential.user

				if (name.trim()) {
					await user.updateProfile({ displayName: name.trim() })
				}

				await usersRef.doc(user.uid).set({
					...userRecord(user, { name: name.trim(), email }),
					createdAt: firebase.firestore.FieldValue.serverTimestamp(),
				})
				creatingEmailUser.current = false
				setIsSigned(true)
			} else {
				const credential = await firebase
					.auth()
					.signInWithEmailAndPassword(email.trim(), password)
				const user = credential.user
				const snapshot = await usersRef.doc(user.uid).get()
				const savedUser = snapshot.data()
				const savedEmail = savedUser && savedUser.email

				if (!snapshot.exists || savedEmail !== email.trim().toLowerCase()) {
					await firebase.auth().signOut()
					setAuthError("No matching user record found. Please sign up first.")
					return
				}

				await usersRef.doc(user.uid).update({
					lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
				})
				setIsSigned(true)
			}
		} catch (error) {
			creatingEmailUser.current = false
			setAuthError(error.message)
		} finally {
			setAuthLoading(false)
		}
	}

	useEffect(() => {
		let isMounted = true
		firebase.auth().onAuthStateChanged(async (user) => {
			if (user) {
				const providerIds = user.providerData.map((provider) => provider.providerId)
				if (providerIds.includes(firebase.auth.GoogleAuthProvider.PROVIDER_ID)) {
					await ensureGoogleUser(user)
					setIsSigned(true)
				} else if (!creatingEmailUser.current) {
					const usersRef = firebase.firestore().collection("Users")
					const snapshot = await usersRef.doc(user.uid).get()
					if (snapshot.exists) {
						setIsSigned(true)
					} else {
						await firebase.auth().signOut()
					}
				}
				console.log("User Logged In")
			} else {
				console.log("User Signed Out")
				setIsSigned(false)
			}
			if (isMounted) setLoading(false)
		})
		return () => (isMounted = false)
	}, [ensureGoogleUser, setIsSigned])
	return (
		<div>
			{loading ? (
				<div className="loading">
					<div id="logo-name">Activity Scheduler</div>
					<Loader
						color="#FFFFFF"
						width={200}
						height={130}
						type="Audio"
					/>
				</div>
			) : (
				<div>
					<Particles className="particles" params={particlesOptions} />
					<Logo></Logo>
					<div className="firebaseUI">
						<StyledFirebaseAuth
							uiConfig={uiConfig}
							firebaseAuth={firebase.auth()}
						/>
						<div className="emailAuth">
							{!emailMode ? (
								<button
									className="emailAuthButton"
									type="button"
									onClick={() => setEmailMode("signin")}
								>
									Sign in with Email
								</button>
							) : (
								<form className="emailAuthForm" onSubmit={handleEmailAuth}>
									<div className="emailAuthTabs">
										<button
											className={emailMode === "signin" ? "active" : ""}
											type="button"
											onClick={() => setEmailMode("signin")}
										>
											Sign in
										</button>
										<button
											className={emailMode === "signup" ? "active" : ""}
											type="button"
											onClick={() => setEmailMode("signup")}
										>
											Sign up
										</button>
									</div>
									{emailMode === "signup" && (
										<input
											type="text"
											placeholder="Name"
											value={name}
											onChange={(event) => setName(event.target.value)}
											required
										/>
									)}
									<input
										type="email"
										placeholder="Email"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										required
									/>
									<input
										type="password"
										placeholder="Password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										required
										minLength="6"
									/>
									{authError && <div className="emailAuthError">{authError}</div>}
									<button
										className="emailAuthSubmit"
										type="submit"
										disabled={authLoading}
									>
										{authLoading
											? "Please wait..."
											: emailMode === "signup"
											? "Create account"
											: "Sign in"}
									</button>
									<button
										className="emailAuthBack"
										type="button"
										onClick={() => {
											setEmailMode(null)
											setAuthError("")
										}}
									>
										Back
									</button>
								</form>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
export default LoginScreen
