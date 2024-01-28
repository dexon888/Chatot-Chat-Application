import {useContext, useEffect, useState, useRef} from "react"
import Avatar from "./Avatar";
import Contact from "./Contact.jsx";
import Logo from "./Logo";
import {UserContext} from "./UserContext.jsx"
import {uniqBy, throttle} from "lodash"
import axios from 'axios'
export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({})
    const [offlinePeople, setOfflinePeople] = useState({})
    const [selectedUserId, setSelectedUserId] = useState(null)
    const {username, id, setId, setUsername} = useContext(UserContext)
    const [newMessageText, setNewMessageText] = useState('')
    const [messages, setMessages] = useState([])
    const wsServerUrl = process.env.REACT_APP_WS_BASE_URL || 'wss://chirpchat-e5b3461b18c5.herokuapp.com';

    const divUnderMessages = useRef();

    useEffect(() => {
        connectToWs();
    }, [])

    function connectToWs() {
        const ws = new WebSocket(wsServerUrl);
        setWs(ws);
        ws.addEventListener('message', handleMessage)
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log("Disconnected. Trying to reconnect...")
                connectToWs();
            }, 1000)
        })
    }

    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            if (userId && username) {
                people[userId] = username;
            } else {
                console.log('Invalid entry in peopleArray:', {userId, username});
            }
        });
        setOnlinePeople(people);
    }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data)
        console.log({ev, messageData});
        if ('online' in messageData) {
            showOnlinePeople(messageData.online)
        } else if ('text' in messageData){
            setMessages(prev => ([...prev, {...messageData}]));
        }
    }

    function logout() {
        axios.post('/logout').then(() => {
            setWs(null);
            setId(null);
            setUsername(null);
        })
    }

    function sendMessage(ev, file = null) {
        if (ev) ev.preventDefault();
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }))
        setNewMessageText('');
        setMessages(prev => ([...prev, {
            text: newMessageText, 
            sender: id,
            recipient: selectedUserId,
            _id: Date.now(),
        }]))
        if (file) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            });
        } else {
            setNewMessageText('');
            setMessages(prev => ([...prev, {
                text: newMessageText,
                sender: id,
                recipient: selectedUserId, 
                _id: Date.now(),
            }]))
        }
        
    }

    function sendFile(ev) {
        const reader = new FileReader();
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload = () => {
            sendMessage(null, {
                name: ev.target.files[0].name,
                data: reader.result,
            })
        }
    }

    useEffect(() => {
            const div = divUnderMessages.current;
            if (div) {
                div.scrollIntoView({behavior:'smooth', block:'end'});
            }
           
    }, [messages]);

    const fetchPeople = throttle(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data
            .filter(p => p._id !== id)
            .filter(p => !Object.keys(onlinePeople).includes(p._id));
            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
        });
    }, 10000); // Adjust the time (in milliseconds) as needed

    useEffect(() => {
        fetchPeople();
    }, [onlinePeople]);

    useEffect(() => {   
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    }, [selectedUserId])

    const onlinePeopleExcludeUser = {...onlinePeople}
    delete onlinePeopleExcludeUser[id]

    const messagesWithoutDuplicates = uniqBy(messages, '_id')
    

    return (
        <div className="flex h-screen">
            <div className="bg-white w-1/3 flex flex-col">
                <div className="flex-grow">
                    <Logo/>
                
                    {Object.keys(onlinePeopleExcludeUser).map(userId => (
                        <Contact
                            key={userId} 
                            id={userId}
                            username={onlinePeopleExcludeUser[userId]}
                            onClick={() => setSelectedUserId(userId)}
                            selected={userId === selectedUserId}
                            online={true}/>
                    ))}
                    {Object.keys(offlinePeople).map(userId => (
                        <Contact 
                            key={userId}
                            id={userId}
                            username={offlinePeople[userId].username}
                            onClick={() => setSelectedUserId(userId)}
                            selected={userId === selectedUserId}
                            online={false}/>
                    ))}
                </div>
                <div className="p-2 text-center flex items-center justify-center">
                    <span className="mr-2 text-sm text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                        Welcome {username}
                    </span>
                    <button 
                    onClick={logout}
                    className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm">Logout</button>
                </div>
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full flex-grow items-center justify-center">
                            <div className="text-gray-300">&larr; Select a Person from the Sidebar</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                {messagesWithoutDuplicates.map(message => (
                                    <div key={message._id} className={(message.sender === id ? 'text-right' : "text-left")}>
                                        <div className={"text-left inline-block p-2 my-2 rounded-md text-sm " + (message.sender === id ? 'bg-blue-500 text-white' : 'bg-white text-gray-500')}>
                                            {message.text}
                                            {message.file && (
                                                <div className="">
                                                    <a target="_blank" className="flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                            <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
                                                        </svg>
                                                        {message.file}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                ))}
                            </div>
                            <div ref={divUnderMessages}></div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                    <input type="text"
                        value={newMessageText}
                        onChange={ev => setNewMessageText(ev.target.value)} 
                        placeholder="Type your message here" 
                        className="bg-white flex-grow border rounded-sm p-2"/>
                    <label className="bg-gray-200 p-2 text-gray-500 cursor-pointer rounded-sm border border-gray-300">
                        <input type="file" className="hidden" onChange={sendFile}/>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
                        </svg>
                        
                    </label>
                    <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                    </button>
                </form>
                )}
                
            </div>
        </div>
    )
}