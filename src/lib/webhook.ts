
/**
 * Enviar datos al webhook configurado
 * @param webhookUrl URL del webhook
 * @param data Datos a enviar
 * @returns Respuesta del webhook (puede ser null si hay error)
 */
export async function sendToWebhook(
  webhookUrl: string,
  data: any
): Promise<any> {
  try {
    if (!webhookUrl) {
      console.warn("No webhook URL provided");
      return null;
    }

    console.log(`Sending data to webhook: ${webhookUrl}`);
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook response error: ${response.status} ${response.statusText}`);
    }

    try {
      const responseData = await response.json();
      console.log("Webhook response:", responseData);
      return responseData;
    } catch (jsonError) {
      // Si no es JSON, intentar obtener texto
      const textResponse = await response.text();
      console.log("Webhook text response:", textResponse);
      return textResponse;
    }
  } catch (error) {
    console.error("Error sending data to webhook:", error);
    return null;
  }
}
