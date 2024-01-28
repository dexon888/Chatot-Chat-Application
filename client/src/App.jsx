import axios from "axios"
import {UserContextProvider} from "./UserContext"
import Routes from "./routes"

function App() {
  const baseURL = process.env.REACT_APP_API_BASE_URL || 'https://fallback-url.com';
  axios.defaults.baseURL = baseURL;
  console.log(baseURL)
  axios.defaults.withCredentials = true
  return (
    <UserContextProvider>
      <Routes/>
    </UserContextProvider>
    
  )
}

export default App
