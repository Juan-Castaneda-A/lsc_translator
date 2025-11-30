import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, ThumbsUp, ThumbsDown, Settings, User, ArrowLeft, Send, MessageSquare, Activity } from 'lucide-react';
import Webcam from 'react-webcam';

// Componente principal
export default function App() {

  const webcamRef = useRef(null);
  const ws = useRef(null);
  const [prediction, setPrediction] = useState("Esperando...");
  // Estados de la aplicación
  const [currentScreen, setCurrentScreen] = useState('onboarding'); // onboarding, role-selection, translator
  const [userRole, setUserRole] = useState(null); // 'deaf', 'hearing'
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Conexión WebSocket al Backend
  // --- LÓGICA WEBSOCKET MEJORADA ---
  useEffect(() => {
    let interval;

    if (isListening && userRole === 'deaf') {
      // Usamos la URL de tu backend en Render
      ws.current = new WebSocket('wss://modelo-tpi.onrender.com/ws');

      ws.current.onopen = () => {
        console.log("✅ Conectado al Backend");
        setPrediction("Esperando seña...");
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        console.log("Servidor dice:", data);

        if (data.status === 'prediction') {
          // 1. Mostrar la predicción en el video siempre (feedback inmediato)
          setPrediction(`${data.label} (${data.confidence})`);

          // 2. Lógica inteligente para el CHAT
          const conf = parseFloat(data.confidence);

          // Solo agregamos al historial si:
          // - La confianza es mayor al 88% (muy seguros)
          // - Y la predicción NO es igual al último mensaje (evitar spam)
          if (conf > 88) {
            setMessages(prevMessages => {
              const lastMsg = prevMessages[prevMessages.length - 1];
              // Si el último mensaje es diferente a la nueva predicción, lo agregamos
              if (!lastMsg || lastMsg.text !== data.label) {
                return [...prevMessages, {
                  id: Date.now(),
                  text: data.label, // Aquí irá "Clase 22" o lo que diga tu backend
                  sender: 'deaf',
                  type: 'translation'
                }];
              }
              return prevMessages;
            });
          }
        }
        else if (data.status === 'buffering') {
          setPrediction(`Cargando... ${data.progress}/20 frames`);
        }
      };

      // Enviar frames
      interval = setInterval(() => {
        if (webcamRef.current && ws.current.readyState === WebSocket.OPEN) {
          // AÑADIMOS CALIDAD 0.5 PARA QUE PESE MENOS
          const imageSrc = webcamRef.current.getScreenshot({ width: 224, height: 224, quality: 0.5 });

          if (imageSrc) {
            // console.log("Enviando frame..."); // Descomenta si quieres ver lluvia de logs
            ws.current.send(imageSrc);
          }
        }
      }, 150); // 150ms es un buen balance para Render Free
    }

    return () => {
      if (interval) clearInterval(interval);
      if (ws.current) ws.current.close();
    };
  }, [isListening, userRole]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    addMessage({
      id: Date.now(),
      text: inputText,
      sender: userRole === 'deaf' ? 'deaf' : 'hearing',
      type: 'text'
    });
    setInputText('');
  };

  // --- PANTALLAS ---

  const OnboardingScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
        <Activity size={48} className="text-white" />
      </div>
      <h1 className="text-4xl font-bold mb-2">Traductor LSC</h1>
      <p className="text-lg text-indigo-100 text-center mb-8 max-w-md">
        Rompiendo barreras de comunicación entre la Lengua de Señas Colombiana y el mundo oyente.
      </p>
      <button
        onClick={() => setCurrentScreen('role-selection')}
        className="bg-white text-indigo-700 font-bold py-4 px-10 rounded-full shadow-lg hover:bg-indigo-50 transition transform hover:scale-105 active:scale-95 w-full max-w-xs"
      >
        Comenzar
      </button>
    </div>
  );

  const RoleSelectionScreen = () => (
    <div className="flex flex-col h-screen bg-gray-50 p-6">
      <button onClick={() => setCurrentScreen('onboarding')} className="text-gray-500 mb-6 w-fit">
        <ArrowLeft />
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Quién eres?</h2>
      <p className="text-gray-500 mb-8">Selecciona tu perfil para adaptar la interfaz.</p>

      <div className="flex flex-col gap-4 flex-1 justify-center max-w-md mx-auto w-full">
        <button
          onClick={() => { setUserRole('deaf'); setCurrentScreen('translator'); }}
          className="flex items-center p-6 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm hover:border-indigo-500 hover:shadow-md transition group"
        >
          <div className="bg-indigo-100 p-4 rounded-full mr-4 group-hover:bg-indigo-600 transition">
            <User className="text-indigo-600 group-hover:text-white w-8 h-8" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-gray-800">Persona Sorda</h3>
            <p className="text-sm text-gray-500">Usaré la cámara para señar.</p>
          </div>
        </button>

        <button
          onClick={() => { setUserRole('hearing'); setCurrentScreen('translator'); }}
          className="flex items-center p-6 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md transition group"
        >
          <div className="bg-emerald-100 p-4 rounded-full mr-4 group-hover:bg-emerald-600 transition">
            <Volume2 className="text-emerald-600 group-hover:text-white w-8 h-8" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-gray-800">Persona Oyente</h3>
            <p className="text-sm text-gray-500">Usaré voz o texto.</p>
          </div>
        </button>
      </div>
    </div>
  );

  const TranslatorScreen = () => (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm flex items-center justify-between z-10">
        <button onClick={() => setCurrentScreen('role-selection')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="text-gray-600" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-gray-800">Sesión Activa</span>
          <span className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> En línea
          </span>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Settings className="text-gray-600" />
        </button>
      </header>

      {/* Área Principal: Cámara o Chat Visual */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 flex flex-col gap-4">

        {/* Simulación de Cámara (Solo visible si eres sordo o si el otro está señando) */}
        <div className="w-full bg-gray-900 rounded-2xl overflow-hidden shadow-lg relative shrink-0" style={{ minHeight: '250px' }}>
          {isListening ? (
            <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.5}
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user", width: 224, height: 224 }}
              />
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full backdrop-blur-md">
                {prediction}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-gray-400">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Cámara Pausada</p>
              </div>
            </div>
          )}

          {/* Botón flotante para activar cámara */}
          <button
            onClick={() => setIsListening(!isListening)}
            className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white shadow-lg`}
          >
            {isListening ? <span className="flex items-center gap-2"><span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Detener</span> : <Camera size={24} />}
          </button>
        </div>

        {/* Historial de Conversación */}
        <div className="flex flex-col gap-3 mt-2">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              La conversación aparecerá aquí...
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-2xl max-w-[85%] animate-in slide-in-from-bottom-2 duration-300 ${msg.sender === userRole
                ? 'bg-indigo-600 text-white self-end rounded-br-none'
                : 'bg-white text-gray-800 self-start rounded-bl-none border border-gray-200'
                }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-1">{msg.type === 'translation' ? '🤟' : '💬'}</span>
                <div>
                  <p className="text-base leading-relaxed">{msg.text}</p>
                  {/* Feedback Loop (Del Blueprint) */}
                  {msg.sender !== userRole && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100/20">
                      <button className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition">
                        <Volume2 size={14} /> Escuchar
                      </button>
                      <div className="flex gap-2 ml-auto">
                        <button className="hover:text-green-300 transition"><ThumbsUp size={14} /></button>
                        <button className="hover:text-red-300 transition"><ThumbsDown size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area (Footer) */}
      <div className="bg-white p-4 border-t border-gray-200 absolute bottom-0 w-full">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <button className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition">
            <Mic size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={userRole === 'deaf' ? "Escribe si la IA falla..." : "Escribe para traducir a texto..."}
            className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSendMessage}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!inputText.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="font-sans h-screen w-full max-w-md mx-auto shadow-2xl overflow-hidden bg-white">
      {currentScreen === 'onboarding' && <OnboardingScreen />}
      {currentScreen === 'role-selection' && <RoleSelectionScreen />}
      {currentScreen === 'translator' && <TranslatorScreen />}
    </div>
  );
}