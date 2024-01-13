import chatotLogo from './images/chatot_logo.jpg'; // Adjust the path as per your project structure

export default function Logo() {
    return (
        <div className="flex gap-2 items-center p-4">
            <img src={chatotLogo} alt="Chatot" className="w-8 h-8" /> {/* Logo Image */}
            
            <span className="text-2xl font-semibold text-gray-700" style={{ fontFamily: 'Arial, sans-serif' }}>
                ChirpChat
            </span>
        </div>
    );
}
