const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'image' | 'text';
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
    text?: string;
  }>;
}

interface ComprobanteData {
  monto: number;
  fecha: string;
  descripcion: string;
  medio_pago: 'efectivo' | 'mercadopago' | 'transferencia' | 'tarjeta' | 'otro';
}

export async function analizarComprobante(imageBase64: string, mimeType: string): Promise<ComprobanteData> {
  const prompt = `Analizá este comprobante, ticket o transferencia. Puede ser un ticket de local físico, comprobante de MercadoPago, transferencia bancaria o cualquier comprobante de pago. Extraé: monto total, fecha, descripción o concepto del gasto, y medio de pago (efectivo, mercadopago, transferencia, tarjeta). Respondé SOLO en JSON sin markdown: { "monto": numero, "fecha": "YYYY-MM-DD", "descripcion": "texto corto", "medio_pago": "efectivo|mercadopago|transferencia|tarjeta|otro" }`;

  const messages: AnthropicMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: imageBase64
          }
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    }
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error de Anthropic: ${errorData.error?.message || 'Error desconocido'}`);
  }

  const data = await response.json();
  const textContent = data.content.find((c: any) => c.type === 'text')?.text || '';

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No se pudo extraer información del comprobante');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    monto: Number(parsed.monto) || 0,
    fecha: parsed.fecha || new Date().toISOString().split('T')[0],
    descripcion: parsed.descripcion || '',
    medio_pago: parsed.medio_pago || 'otro'
  };
}

export function imageToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({
        base64,
        mimeType: file.type
      });
    };

    reader.onerror = () => reject(new Error('Error al leer la imagen'));
    reader.readAsDataURL(file);
  });
}
