import axios from "axios"
import {useContext,useState} from "react"
import { UserContext } from "./UserContext";

export default function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('register')

    const {setUsername:setLoggedInUsername, setId} = useContext(UserContext);
    
    const [error, setError] = useState(null);
    
    
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
        <div className="bg-blue-50 h-screen flex items-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                {
                    error && (
                        <div className="text-red-500 text-center mb-2">
                            {error}
                        </div>
                    )
                }
                <input value={username} 
                    onChange={ev => setUsername(ev.target.value)}
                    type="text" placeholder="username" 
                    className="block w-full rounded-sm p-2 mb-2 border "/>
                <input value={password} 
                    onChange={ev => setPassword(ev.target.value)}
                    type="password" placeholder="password" 
                    className="block w-full rounded-sm p-2 mb-2"/>
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
            </form>
        </div>
    )
}