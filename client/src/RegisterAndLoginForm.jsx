import axios from "axios"
import {useContext,useState} from "react"
import { UserContext } from "./UserContext";

import chatotBackground from './images/chatot_background.jpg'
import dancingChatot from './images/dancing_chatot.gif';
import musicNote from './images/musicnote.png';
import './styles/ChatotAnimation.css';
import { motion } from 'framer-motion';

export default function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('register')

    const {setUsername:setLoggedInUsername, setId} = useContext(UserContext);
    
    const [error, setError] = useState(null);

    const [showAnimation, setShowAnimation] = useState(false);

    const inputVariants = {
        initial: {
            scale: 1,
            borderColor: "#ccc", // Normal border color
            boxShadow: "0px 0px 0px rgba(0, 0, 0, 0)" // No shadow initially
        },
        focus: {
            scale: 1.05, // Slightly larger when focused
            borderColor: "#4a90e2", // Highlighted border color
            boxShadow: "0px 0px 8px rgba(0, 0, 0, 0.2)" // Soft shadow for depth
        }
    };
    
    
    async function handleSubmit(ev) {
        ev.preventDefault();
        setError(null); // Reset error message at the beginning

        const url = isLoginOrRegister === 'register' ? 'register' : 'login';
        try {
            const { data } = await axios.post(url, { username, password });
            setLoggedInUsername(username);
            setId(data.id);
            // Redirect or perform additional actions on successful login/register
        } catch (err) {
            if (err.response) {
                // Handle specific error scenarios
                if (err.response.status === 409 && isLoginOrRegister === 'register') { // Example status code
                    setError("A user already exists with that username");
                } else if (err.response.status === 401 && isLoginOrRegister === 'login') { // Example status code
                    setError("Invalid credentials");
                } else {
                    // Handle other server-side errors
                    setError(err.response.data.message || "An error occurred");
                }
            } else {
                // Handle network errors or other issues
                setError("Network or server error");
            }
        }
    }


    return (

        
        <div className="main-container" style={{ 
            backgroundImage: `url(${chatotBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                <h1 className="text-4xl font-bold text-center mb-6" style={{ 
                    color: '#34568B', // Darker shade of blue
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' // Soft shadow for depth
                }}>
                    ChirpChat
                </h1>
                {
                    error && (
                        <div className="text-red-500 text-center mb-2">
                            {error}
                        </div>
                    )
                }
                <motion.input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setShowAnimation(true)}
                    onBlur={() => setShowAnimation(false)}
                    variants={inputVariants}
                    initial="initial"
                    animate="initial"
                    whileFocus="focus"
                    className="block w-full rounded-sm p-2 mb-2 border"
                />
                <motion.input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowAnimation(true)}
                    onBlur={() => setShowAnimation(false)}
                    variants={inputVariants}
                    initial="initial"
                    animate="initial"
                    whileFocus="focus"
                    className="block w-full rounded-sm p-2 mb-2 border"
                />
                <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
                    {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
                </button>
                <div className="text-center mt-2">
                    {isLoginOrRegister === 'register' && (
                        <div>
                            Already a member?
                            <button onClick={() => setIsLoginOrRegister('login')}>
                                 Login Here
                            </button>
                        </div>
                    )}
                    {isLoginOrRegister === 'login' && (
                        <div>
                            Don't have an account?
                            <button onClick={() => setIsLoginOrRegister('register')}>
                                 Register
                            </button>
                        </div>
                    )}
                </div>
                <div className="chatot-animation-container">
                    <img src={dancingChatot} alt="Dancing Chatot" className={showAnimation ? "visible" : "hidden"} />
                </div>
            </form>
            
        </div>
    )
}