import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import './AsesorIA.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "¿En qué categoría gastamos más este mes?",
  "¿Cuánto gastamos en total este mes?",
  "¿Qué gastos fijos tenemos pendientes?",
  "¿Cómo estamos comparado al mes pasado?"
];

export default function AsesorIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function getContextData() {
    const { familiaId } = useApp();
    if (!familiaId) {
      return {
        gastosVariables: [],
        gastosFijos: [],
        gastosFijosPlantilla: [],
        gastosVariablesMesPasado: [],
        gastosFijosMesPasado: [],
        mesActual: 0,
        anioActual: 0
      };
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    const { data: gastosVariables } = await supabase
      .from('movimientos')
      .select('*')
      .eq('tipo', 'EGRESO')
      .gte('fecha', `${anioActual}-${mesActual.toString().padStart(2, '0')}-01`)
      .lt('fecha', `${anioActual}-${(mesActual + 1).toString().padStart(2, '0')}-01`);

    const { data: gastosFijos } = await supabase
      .from('historial_pagos_gastos_fijos')
      .select('*, plantilla:gastos_fijos_plantilla(*)')
      .gte('fecha_pago', `${anioActual}-${mesActual.toString().padStart(2, '0')}-01`)
      .lt('fecha_pago', `${anioActual}-${(mesActual + 1).toString().padStart(2, '0')}-01`);

    const { data: gastosFijosPlantilla } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true)
      .eq('familia_id', familiaId);

    const mesPasado = mesActual === 1 ? 12 : mesActual - 1;
    const anioPasado = mesActual === 1 ? anioActual - 1 : anioActual;

    const { data: gastosVariablesMesPasado } = await supabase
      .from('movimientos')
      .select('*')
      .eq('tipo', 'EGRESO')
      .gte('fecha', `${anioPasado}-${mesPasado.toString().padStart(2, '0')}-01`)
      .lt('fecha', `${anioPasado}-${(mesPasado + 1).toString().padStart(2, '0')}-01`);

    const { data: gastosFijosMesPasado } = await supabase
      .from('historial_pagos_gastos_fijos')
      .select('*, plantilla:gastos_fijos_plantilla(*)')
      .gte('fecha_pago', `${anioPasado}-${mesPasado.toString().padStart(2, '0')}-01`)
      .lt('fecha_pago', `${anioPasado}-${(mesPasado + 1).toString().padStart(2, '0')}-01`);

    return {
      gastosVariables: gastosVariables || [],
      gastosFijos: gastosFijos || [],
      gastosFijosPlantilla: gastosFijosPlantilla || [],
      gastosVariablesMesPasado: gastosVariablesMesPasado || [],
      gastosFijosMesPasado: gastosFijosMesPasado || [],
      mesActual,
      anioActual
    };
  }

  async function sendMessage(messageText: string) {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const contextData = await getContextData();

      const systemPrompt = `Sos un asistente financiero para Casa Franco, una familia que gestiona sus gastos.

Datos del mes actual (${contextData.mesActual}/${contextData.anioActual}):
- Gastos variables: ${JSON.stringify(contextData.gastosVariables.map(g => ({ fecha: g.fecha, categoria: g.categoria, monto: g.monto, descripcion: g.descripcion })))}
- Gastos fijos pagados: ${JSON.stringify(contextData.gastosFijos.map(g => ({ fecha_pago: g.fecha_pago, nombre: g.plantilla?.nombre, monto: g.monto })))}
- Gastos fijos configurados: ${JSON.stringify(contextData.gastosFijosPlantilla.map(g => ({ nombre: g.nombre, monto_estimado: g.monto_estimado, dia_vencimiento: g.dia_vencimiento })))}

Datos del mes pasado:
- Gastos variables: ${JSON.stringify(contextData.gastosVariablesMesPasado.map(g => ({ fecha: g.fecha, categoria: g.categoria, monto: g.monto, descripcion: g.descripcion })))}
- Gastos fijos pagados: ${JSON.stringify(contextData.gastosFijosMesPasado.map(g => ({ fecha_pago: g.fecha_pago, nombre: g.plantilla?.nombre, monto: g.monto })))}

Respondé de forma concisa y en español argentino. Usá formato de moneda argentina (ARS $). Sé amigable y directo.`;

      const requestBody = {
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...messages.filter(m => m.role === 'user' || m.role === 'assistant'),
          { role: 'user', content: messageText }
        ]
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', response.status, errorData);
        throw new Error(`API ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content[0].text
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error completo:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputMessage);
  }

  function handleSuggestedQuestion(question: string) {
    sendMessage(question);
  }

  return (
    <div className="asesor-ia">
      <div className="asesor-header">
        <h1>Asesor IA</h1>
        <p>Preguntame sobre tus gastos y finanzas</p>
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="suggested-questions">
            {SUGGESTED_QUESTIONS.map((question, index) => (
              <button
                key={index}
                className="suggested-chip"
                onClick={() => handleSuggestedQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Escribí tu pregunta..."
          disabled={isLoading}
        />
        <button type="submit" disabled={!inputMessage.trim() || isLoading}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
