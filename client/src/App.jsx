import axios from "axios"
import {UserContextProvider} from "./UserContext"
import Routes from "./routes"

function App() {
  const baseURL = process.env.REACT_APP_API_BASE_URL;
  axios.defaults.baseURL = baseURL;
  axios.defaults.withCredentials = true
  return (
    <UserContextProvider>
      <Routes/>
    </UserContextProvider>
    
  )
}

export default App
