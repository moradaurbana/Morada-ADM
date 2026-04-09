import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { LogIn } from 'lucide-react';

function Login() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-[#F47B20] rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">
          M
        </div>
        <h1 className="text-2xl font-bold text-[#1E2732] mb-2">Morada Urbana</h1>
        <p className="text-gray-500 mb-8">Sistema de Administração de Locações</p>
        
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-[#1E2732] text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors font-medium"
        >
          <LogIn size={20} />
          Entrar com Google
        </button>
      </div>
    </div>
  );
}

export default Login;
